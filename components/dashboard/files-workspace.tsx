"use client";

import {
  AlertCircle,
  AudioLines,
  ChevronRight,
  Copy,
  Download,
  FileQuestion,
  FileText,
  Folder,
  HardDrive,
  LayoutGrid,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  UploadProgressList,
  type UploadItem,
} from "@/components/dashboard/upload-progress";
import { useSession, type SessionUser } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type FileRecord,
  type FilesResponse,
  type PresignedUploadResponse,
} from "@/lib/types";
import {
  cn,
  formatBytes,
  formatDateTime,
  getFilePreviewType,
} from "@/lib/utils";

const INITIAL_STATE: FilesResponse = {
  files: [],
  stats: {
    totalFiles: 0,
    totalSize: 0,
    lastUpdated: new Date().toISOString(),
    bucket: "-",
    cdnHost: "-",
  },
  recentUploads: [],
};

const normalizePrefix = (prefix: string) => prefix.replace(/^\/+|\/+$/g, "");

type ExplorerEntry =
  | {
      type: "folder";
      name: string;
      itemCount: number;
    }
  | {
      type: "file";
      file: FileRecord;
    };

type FilesWorkspaceContentProps = {
  session: SessionUser | null;
};

function FilesWorkspaceContent({ session }: FilesWorkspaceContentProps) {
  const [data, setData] = useState<FilesResponse>(INITIAL_STATE);
  const [query, setQuery] = useState("");
  const [activePrefix, setActivePrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [transfersOpen, setTransfersOpen] = useState(false);

  const userPermissions = session?.permissions ?? [];
  const canUpload = userPermissions.includes("upload");
  const canDelete = userPermissions.includes("delete");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<UploadItem[]>([]);

  const normalizedActivePrefix = useMemo(
    () => normalizePrefix(activePrefix),
    [activePrefix]
  );

  const createUploadId = useCallback(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const updateQueue = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/files", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Não foi possível recuperar os arquivos.");
      }
      const json = (await response.json()) as FilesResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao carregar os arquivos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    queueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!normalizedActivePrefix) return;
    const exists = data.files.some(
      (file) =>
        file.key === normalizedActivePrefix ||
        file.key.startsWith(`${normalizedActivePrefix}/`)
    );
    if (!exists) {
      setActivePrefix("");
    }
  }, [data.files, normalizedActivePrefix]);

  const currentFolders = useMemo(() => {
    const map = new Map<string, number>();
    const prefix = normalizedActivePrefix ? `${normalizedActivePrefix}/` : "";

    data.files.forEach((file) => {
      const key = file.key;
      if (normalizedActivePrefix) {
        if (!key.startsWith(prefix)) return;
        const remainder = key.slice(prefix.length);
        const parts = remainder.split("/").filter(Boolean);
        if (parts.length > 1) {
          map.set(parts[0], (map.get(parts[0]) ?? 0) + 1);
        }
      } else {
        const parts = key.split("/").filter(Boolean);
        if (parts.length > 1) {
          map.set(parts[0], (map.get(parts[0]) ?? 0) + 1);
        }
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.files, normalizedActivePrefix]);

  const currentFiles = useMemo(() => {
    const prefix = normalizedActivePrefix ? `${normalizedActivePrefix}/` : "";
    return data.files.filter((file) => {
      if (normalizedActivePrefix) {
        if (!file.key.startsWith(prefix)) return false;
        const remainder = file.key.slice(prefix.length);
        return remainder.length > 0 && !remainder.includes("/");
      }

      return !file.key.includes("/");
    });
  }, [data.files, normalizedActivePrefix]);

  const explorerEntries = useMemo<ExplorerEntry[]>(() => {
    const search = query.trim().toLowerCase();

    const folders = currentFolders
      .filter((folder) =>
        search ? folder.name.toLowerCase().includes(search) : true
      )
      .map<ExplorerEntry>((folder) => ({
        type: "folder",
        name: folder.name,
        itemCount: folder.count,
      }));

    const files = currentFiles
      .filter((file) => {
        if (!search) return true;
        const haystack = [file.fileName, file.key, file.uploadedBy]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .map<ExplorerEntry>((file) => ({ type: "file", file }));

    return [...folders, ...files];
  }, [currentFiles, currentFolders, query]);

  const breadcrumbs = useMemo(
    () => (normalizedActivePrefix ? normalizedActivePrefix.split("/") : []),
    [normalizedActivePrefix]
  );

  const requiresSetup = useMemo(
    () => data.stats.bucket.toLowerCase().includes("configure"),
    [data.stats.bucket]
  );

  const handleFilesUpload = useCallback(
    async (incoming: File[]) => {
      if (!incoming.length) return;
      if (!canUpload) {
        setError("Você não possui permissão para enviar arquivos.");
        return;
      }
      setUploading(true);
      setError(null);

      const prefixValue = normalizedActivePrefix;

      const queueItems = incoming.map<UploadItem>((file) => {
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;
        return {
          id: createUploadId(),
          fileName: file.name,
          progress: 0,
          status: "pending",
          previewUrl,
          mimeType: file.type || undefined,
        };
      });

      setUploadQueue((prev) => {
        const next = [
          ...queueItems,
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

        return next;
      });
      setTransfersOpen(true);

      const uploadSingleFile = async (file: File, itemId: string) => {
        let presignData: PresignedUploadResponse | null = null;

        try {
          const response = await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              prefix: prefixValue || undefined,
              size: file.size,
            }),
          });

          if (!response.ok) {
            const message = await response.text();
            throw new Error(
              message || "Falha ao preparar upload. Verifique as configurações."
            );
          }

          presignData = (await response.json()) as PresignedUploadResponse;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Não foi possível gerar a URL de upload.";
          updateQueue(itemId, { status: "error", error: message });
          throw err instanceof Error ? err : new Error(message);
        }

        if (!presignData) {
          const message =
            "Não foi possível preparar os dados de upload. Tente novamente.";
          updateQueue(itemId, { status: "error", error: message });
          throw new Error(message);
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

          updateQueue(itemId, { status: "uploading", progress: 0 });

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = (event.loaded / event.total) * 100;
            updateQueue(itemId, { progress: percent });
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 400) {
              updateQueue(itemId, { status: "success", progress: 100 });
              resolve();
            } else {
              const message =
                xhr.responseText ||
                "Falha no upload para o bucket. Verifique as permissões de CORS.";
              updateQueue(itemId, { status: "error", error: message });
              reject(new Error(message));
            }
          };

          xhr.onerror = () => {
            const message = "Erro de conexão durante o upload para o bucket.";
            updateQueue(itemId, { status: "error", error: message });
            reject(new Error(message));
          };

          xhr.send(file);
        });
      };

      for (let index = 0; index < incoming.length; index += 1) {
        const file = incoming[index];
        const queueItem = queueItems[index];
        try {
          await uploadSingleFile(file, queueItem.id);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "Ocorreu um erro inesperado ao enviar o arquivo."
          );
        }
      }

      await fetchData();
      setUploading(false);
    },
    [canUpload, createUploadId, fetchData, normalizedActivePrefix, updateQueue]
  );

  const handleDelete = async (key: string) => {
    if (!canDelete) {
      setError("Você não possui permissão para remover arquivos.");
      return;
    }
    const confirmation = window.confirm(
      "Tem certeza que deseja remover este arquivo do bucket?"
    );
    if (!confirmation) return;

    setDeletingKey(key);
    setError(null);

    try {
      const response = await fetch(
        `/api/files?key=${encodeURIComponent(key)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível remover o arquivo.");
      }

      await fetchData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao remover o arquivo."
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (requiresSetup || !canUpload) return;
    setIsDragging(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (!canUpload) return;
    setIsDragging(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (requiresSetup || !canUpload) return;
    setIsDragging(false);
    const incoming = Array.from(event.dataTransfer?.files ?? []);
    if (incoming.length) {
      void handleFilesUpload(incoming);
    }
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (!canUpload) {
      setError("Você não possui permissão para enviar arquivos.");
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) {
      void handleFilesUpload(files);
    }
  };

  const openTransfers = () => setTransfersOpen(true);
  const closeTransfers = () => setTransfersOpen(false);

  return (
    <div className="relative space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={requiresSetup}
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-zinc-200/80 bg-zinc-50/60 dark:border-zinc-800/60 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => setActivePrefix("")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 transition",
                normalizedActivePrefix === ""
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
              )}
            >
              <HardDrive className="h-4 w-4" />
            </button>
            {breadcrumbs.map((segment, index) => (
              <div
                key={`${segment}-${index}`}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-3 w-3 text-zinc-400" />
                <button
                  type="button"
                  onClick={() =>
                    setActivePrefix(breadcrumbs.slice(0, index + 1).join("/"))
                  }
                  className="rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Biblioteca de arquivos
              </CardTitle>
              <CardDescription>
                {normalizedActivePrefix
                  ? `Navegando em /${normalizedActivePrefix}`
                  : "Navegando na raiz do bucket"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[220px] max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar arquivos..."
                  className="rounded-full border-zinc-300 pl-9 text-sm dark:border-zinc-700"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={openTransfers}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Transferências
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <PermissionGate
                session={session}
                permissions="upload"
                fallback={
                  <Button
                    type="button"
                    className="rounded-full"
                    disabled
                    title="Você não possui permissão para enviar arquivos."
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Novo upload
                  </Button>
                }
              >
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => {
                    if (requiresSetup) return;
                    fileInputRef.current?.click();
                  }}
                  disabled={requiresSetup || uploading}
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Novo upload
                </Button>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>

        <CardContent
          className={cn(
            "relative min-h-[480px] rounded-b-2xl border-2 border-dashed border-transparent bg-gradient-to-br from-white to-zinc-50 p-0 transition dark:from-zinc-950 dark:to-zinc-900",
            requiresSetup
              ? "opacity-60"
              : isDragging
              ? "border-zinc-500 bg-zinc-50/60 dark:border-zinc-600 dark:from-zinc-900 dark:to-zinc-950"
              : "border-zinc-200 dark:border-zinc-800"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {requiresSetup ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-50/90 p-6 text-center text-sm text-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-300">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <p>
                Configure bucket, região e credenciais em{" "}
                <strong className="font-semibold">/settings</strong> para
                habilitar uploads reais ao S3.
              </p>
            </div>
          ) : isDragging ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 border border-dashed border-zinc-500 bg-zinc-50/80 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-200">
              <UploadCloud className="h-10 w-10 text-zinc-600 dark:text-zinc-200" />
              Solte os arquivos aqui para enviar
            </div>
          ) : null}

          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <span>
                Bucket:{" "}
                <strong className="text-zinc-700 dark:text-zinc-100">
                  {data.stats.bucket}
                </strong>
              </span>
              <span>
                CDN:{" "}
                <strong className="text-zinc-700 dark:text-zinc-100">
                  {data.stats.cdnHost}
                </strong>
              </span>
              <span>
                Arquivos:{" "}
                <strong className="text-zinc-700 dark:text-zinc-100">
                  {data.stats.totalFiles}
                </strong>
              </span>
              <span>
                Última atualização:{" "}
                <strong className="text-zinc-700 dark:text-zinc-100">
                  {formatDateTime(data.stats.lastUpdated)}
                </strong>
              </span>
            </div>
            {!canUpload ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Seu usuário possui acesso somente de leitura. Solicite a
                permissão <strong>upload</strong> para enviar arquivos.
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80 uppercase text-xs font-semibold tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <TableHead className="min-w-[240px]">Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Modificado em</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-sm text-zinc-500"
                      >
                        Carregando arquivos...
                      </TableCell>
                    </TableRow>
                  ) : explorerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhum item encontrado neste diretório.
                      </TableCell>
                    </TableRow>
                  ) : (
                    explorerEntries.map((entry) => {
                      if (entry.type === "folder") {
                        return (
                          <TableRow
                            key={`folder-${entry.name}`}
                            className="cursor-pointer transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                            onClick={() =>
                              setActivePrefix(
                                normalizePrefix(
                                  normalizedActivePrefix
                                    ? `${normalizedActivePrefix}/${entry.name}`
                                    : entry.name
                                )
                              )
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                                  <Folder className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                    {entry.name}
                                  </p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {entry.itemCount} item(s)
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>Pasta</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell className="text-right text-xs text-zinc-400">
                              Abrir
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const { file } = entry;
                      const previewType = getFilePreviewType(file.fileName);
                      const previewUrl = file.cdnUrl || file.url;
                      const deleting = deletingKey === file.key;

                      return (
                        <TableRow
                          key={file.key}
                          className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                {previewType === "image" ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={previewUrl}
                                    alt={file.fileName}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : previewType === "video" ? (
                                  <Video className="h-5 w-5 text-zinc-500" />
                                ) : previewType === "audio" ? (
                                  <AudioLines className="h-5 w-5 text-zinc-500" />
                                ) : previewType === "pdf" ||
                                  previewType === "text" ? (
                                  <FileText className="h-5 w-5 text-zinc-500" />
                                ) : (
                                  <FileQuestion className="h-5 w-5 text-zinc-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {file.fileName}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {file.key}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>Arquivo</TableCell>
                          <TableCell>{formatBytes(file.size)}</TableCell>
                          <TableCell>
                            {formatDateTime(file.lastModified)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <PermissionGate
                                session={session}
                                permissions="compartilhar"
                              >
                                <Button
                                  onClick={() =>
                                    navigator.clipboard.writeText(previewUrl)
                                  }
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </PermissionGate>
                              <Button asChild size="icon" variant="ghost">
                                <a
                                  href={previewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              <PermissionGate session={session} permissions="delete">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-500"
                                  onClick={() => handleDelete(file.key)}
                                  disabled={deleting}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGate>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {transfersOpen ? (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Transferências em andamento
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Acompanhe os últimos uploads enviados pelo painel.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeTransfers}
                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto pr-1">
              <UploadProgressList items={uploadQueue} />
              {uploadQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  Nenhum upload em andamento no momento.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FilesWorkspace() {
  const session = useSession();

  const noVisualPermissionFallback = (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      Você não possui permissão para visualizar os arquivos deste workspace.
      Solicite ao administrador o acesso <strong>visualizar</strong>.
    </div>
  );

  return (
    <PermissionGate
      session={session}
      permissions="visualizar"
      fallback={noVisualPermissionFallback}
    >
      <FilesWorkspaceContent session={session} />
    </PermissionGate>
  );
}
