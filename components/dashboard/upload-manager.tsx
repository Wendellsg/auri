"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  UploadProgressList,
  type UploadItem,
} from "@/components/dashboard/upload-progress";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

import type { PresignedUploadResponse } from "@/lib/types";
import {
  formatBytes,
  getFilePreviewType,
  type FilePreviewType,
} from "@/lib/utils";

const ONE_MB = 1024 * 1024;
const LARGE_UPLOAD_THRESHOLDS: Record<FilePreviewType | "default", number> = {
  image: 3 * ONE_MB,
  video: 200 * ONE_MB,
  audio: 120 * ONE_MB,
  pdf: 60 * ONE_MB,
  text: 30 * ONE_MB,
  other: 80 * ONE_MB,
  default: 80 * ONE_MB,
};

const typeLabelMap: Record<FilePreviewType, string> = {
  image: "imagem",
  video: "vídeo",
  audio: "áudio",
  pdf: "documento",
  text: "arquivo de texto",
  other: "arquivo",
};

export const shouldRequestUploadConfirmation = (file: File) => {
  const previewType = getFilePreviewType(file.name);
  const threshold =
    LARGE_UPLOAD_THRESHOLDS[previewType] ?? LARGE_UPLOAD_THRESHOLDS.default;
  if (file.size < threshold) {
    return { required: false, previewType };
  }

  const sizeLabel = formatBytes(file.size);
  const thresholdLabel = formatBytes(threshold);
  const typeLabel = typeLabelMap[previewType] ?? "arquivo";

  return {
    required: true,
    previewType,
    message: `Este ${typeLabel} possui ${sizeLabel} e ultrapassa o limite de upload automático (${thresholdLabel}). Confirme para iniciar o envio.`,
  };
};

type PendingUploadMeta = {
  file: File;
  prefix?: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

type EnqueueOptions = {
  prefix?: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

type UploadContextValue = {
  queue: UploadItem[];
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  enqueueUploads: (files: File[], options?: EnqueueOptions) => void;
  confirmUpload: (itemId: string) => void;
  isUploading: boolean;
};

const UploadContext = createContext<UploadContextValue | null>(null);

const createUploadId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queueRef = useRef<UploadItem[]>([]);
  const pendingUploadsRef = useRef<Map<string, PendingUploadMeta>>(new Map());
  const activeUploadsRef = useRef(0);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const updateQueue = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
      queueRef.current = next;
      return next;
    });
  }, []);

  const startUploadForItem = useCallback(
    async (itemId: string) => {
      const pendingMeta = pendingUploadsRef.current.get(itemId);

      if (!pendingMeta) {
        return;
      }

      const queueItem = queueRef.current.find((item) => item.id === itemId);

      if (!queueItem) {
        setTimeout(() => {
          void startUploadForItem(itemId);
        }, 0);
        return;
      }

      if (queueItem.status === "uploading" || queueItem.status === "success") {
        return;
      }

      const resolvedPrefix = queueItem.targetPrefix ?? pendingMeta.prefix;
      const file = pendingMeta.file;

      updateQueue(itemId, {
        status: "uploading",
        progress: 0,
        error: undefined,
      });

      activeUploadsRef.current += 1;
      setIsUploading(true);

      try {
        const response = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            prefix: resolvedPrefix || undefined,
            size: file.size,
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            message || "Falha ao preparar upload. Verifique as configurações."
          );
        }

        const presignData =
          (await response.json()) as PresignedUploadResponse | null;

        if (!presignData) {
          throw new Error(
            "Não foi possível preparar os dados de upload. Tente novamente."
          );
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignData.uploadUrl);
          xhr.withCredentials = false;

          Object.entries(presignData.headers ?? {}).forEach(
            ([header, value]) => {
              if (value) {
                xhr.setRequestHeader(header, value);
              }
            }
          );

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = (event.loaded / event.total) * 100;
            updateQueue(itemId, { progress: percent });
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 400) {
              resolve();
            } else {
              const message =
                xhr.responseText ||
                "Falha no upload para o bucket. Verifique as permissões de CORS.";
              reject(new Error(message));
            }
          };

          xhr.onerror = () => {
            reject(
              new Error("Erro de conexão durante o upload para o bucket.")
            );
          };

          xhr.send(file);
        });

        updateQueue(itemId, { status: "success", progress: 100 });

        if (pendingMeta.onSuccess) {
          await pendingMeta.onSuccess();
        }
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado ao enviar o arquivo.";
        updateQueue(itemId, { status: "error", error: message });
        pendingMeta.onError?.(message);
      } finally {
        pendingUploadsRef.current.delete(itemId);
        activeUploadsRef.current = Math.max(activeUploadsRef.current - 1, 0);
        if (activeUploadsRef.current === 0) {
          setIsUploading(false);
        }
      }
    },
    [updateQueue]
  );

  const enqueueUploads = useCallback(
    (files: File[], options?: EnqueueOptions) => {
      if (!files.length) return;

      const items: UploadItem[] = files.map((file) => {
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        const confirmation = shouldRequestUploadConfirmation(file);

        return {
          id: createUploadId(),
          fileName: file.name,
          progress: 0,
          status: confirmation.required ? "awaiting_confirmation" : "pending",
          previewUrl,
          mimeType: file.type || undefined,
          size: file.size,
          requiresConfirmation: confirmation.required,
          confirmationMessage: confirmation.message,
          targetPrefix: options?.prefix,
        };
      });

      setQueue((prev) => {
        const next = [
          ...items,
          ...prev.filter((item) => item.status !== "success"),
        ];

        prev.forEach((item) => {
          if (
            item.previewUrl &&
            !next.some((nextItem) => nextItem.id === item.id)
          ) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });

        queueRef.current = next;
        return next;
      });

      items.forEach((item, index) => {
        pendingUploadsRef.current.set(item.id, {
          file: files[index],
          prefix: options?.prefix,
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        });
      });

      setPanelOpen(true);

      items
        .filter((item) => !item.requiresConfirmation)
        .forEach((item) => {
          void startUploadForItem(item.id);
        });
    },
    [startUploadForItem]
  );

  const confirmUpload = useCallback(
    (itemId: string) => {
      void startUploadForItem(itemId);
    },
    [startUploadForItem]
  );

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({
      queue,
      panelOpen,
      openPanel,
      closePanel,
      enqueueUploads,
      confirmUpload,
      isUploading,
    }),
    [
      queue,
      panelOpen,
      openPanel,
      closePanel,
      enqueueUploads,
      confirmUpload,
      isUploading,
    ]
  );

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
}

export function useUploadManager() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error(
      "useUploadManager deve ser utilizado dentro de UploadProvider"
    );
  }
  return context;
}

export function UploadTransfersPanel() {
  const { queue, panelOpen, closePanel, confirmUpload } = useUploadManager();

  if (!panelOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Transferências em andamento
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Acompanhe os uploads enviados pelo painel.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto pr-1">
          <UploadProgressList items={queue} onConfirmUpload={confirmUpload} />
          {queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Nenhum upload em andamento no momento.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
