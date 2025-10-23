"use client";

import {
  AlertCircle,
  AudioLines,
  ChevronRight,
  Download,
  FileQuestion,
  FileText,
  Folder,
  FolderOpen,
  Home,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
  UploadProgressList,
  type UploadItem,
} from "@/components/dashboard/upload-progress";
import { type FileRecord, type FilesResponse } from "@/lib/types";
import { cn, formatBytes, formatDateTime, getFilePreviewType } from "@/lib/utils";

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

const normalizePrefix = (prefix: string) =>
  prefix.replace(/^\/+|\/+$/g, "");

export function FilesDashboard() {
  const [data, setData] = useState<FilesResponse>(INITIAL_STATE);
  const [query, setQuery] = useState("");
  const [activePrefix, setActivePrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prefixInput, setPrefixInput] = useState("");
  const [permissionsInput, setPermissionsInput] = useState("");
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createUploadId = useCallback(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const updateQueue = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
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
          : "Ocorreu um erro inesperado ao carregar os arquivos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const normalizedActivePrefix = useMemo(
    () => normalizePrefix(activePrefix),
    [activePrefix],
  );

  useEffect(() => {
    if (!normalizedActivePrefix) return;
    const exists = data.files.some(
      (file) =>
        file.key === normalizedActivePrefix ||
        file.key.startsWith(`${normalizedActivePrefix}/`),
    );
    if (!exists) {
      setActivePrefix("");
    }
  }, [data.files, normalizedActivePrefix]);

  useEffect(() => {
    setPrefixInput(normalizedActivePrefix);
  }, [normalizedActivePrefix]);

  const matchesPrefix = useCallback(
    (file: FileRecord) => {
      if (!normalizedActivePrefix) return true;
      return (
        file.key === normalizedActivePrefix ||
        file.key.startsWith(`${normalizedActivePrefix}/`)
      );
    },
    [normalizedActivePrefix],
  );

  const filteredFiles = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.files.filter((file) => {
      if (!matchesPrefix(file)) return false;
      if (!search) return true;
      const haystack = [
        file.fileName,
        file.key,
        file.uploadedBy,
        file.permissions?.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [data.files, matchesPrefix, query]);

  const handleFilesUpload = useCallback(
    async (incoming: File[]) => {
      if (!incoming.length) return;
      setUploading(true);
      setError(null);

      const prefixValue = normalizePrefix(prefixInput);
      const permissionsValue = permissionsInput.trim();

      const queueItems = incoming.map<UploadItem>((file) => ({
        id: createUploadId(),
        fileName: file.name,
        progress: 0,
        status: "pending",
      }));

      setUploadQueue((prev) => [
        ...queueItems,
        ...prev.filter((item) => item.status !== "success"),
      ]);

      const uploadSingleFile = (file: File, itemId: string) =>
        new Promise<void>((resolve, reject) => {
          const formData = new FormData();
          formData.append("file", file);
          if (prefixValue) formData.append("prefix", prefixValue);
          if (permissionsValue) formData.append("permissions", permissionsValue);

          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/files");

          updateQueue(itemId, { status: "uploading", progress: 0 });

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = (event.loaded / event.total) * 100;
            updateQueue(itemId, { progress: percent });
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateQueue(itemId, { status: "success", progress: 100 });
              resolve();
            } else {
              const message =
                xhr.responseText || "Falha no upload. Verifique as configurações.";
              updateQueue(itemId, { status: "error", error: message });
              reject(new Error(message));
            }
          };

          xhr.onerror = () => {
            const message = "Erro de conexão durante o upload.";
            updateQueue(itemId, { status: "error", error: message });
            reject(new Error(message));
          };

          xhr.send(formData);
        });

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
              : "Ocorreu um erro inesperado ao enviar o arquivo.",
          );
        }
      }

      await fetchData();
      setUploading(false);
    },
    [createUploadId, fetchData, permissionsInput, prefixInput, updateQueue],
  );

  const handleDelete = async (key: string) => {
    const confirmation = window.confirm(
      "Tem certeza que deseja remover este arquivo do bucket?",
    );
    if (!confirmation) return;

    setDeletingKey(key);
    setError(null);

    try {
      const response = await fetch(`/api/files?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

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
          : "Ocorreu um erro inesperado ao remover o arquivo.",
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (requiresSetup) return;
    setIsDragging(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (requiresSetup) return;
    setIsDragging(false);
    const incoming = Array.from(event.dataTransfer?.files ?? []);
    if (incoming.length) {
      void handleFilesUpload(incoming);
    }
  };

  const handleBrowseClick = () => {
    if (requiresSetup) return;
    fileInputRef.current?.click();
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) {
      void handleFilesUpload(files);
    }
  };

  const breadcrumbs = useMemo(
    () => (normalizedActivePrefix ? normalizedActivePrefix.split("/") : []),
    [normalizedActivePrefix],
  );

  const prefixFiles = useMemo(() => {
    if (!normalizedActivePrefix) return data.files;
    return data.files.filter((file) =>
      matchesPrefix(file),
    );
  }, [data.files, matchesPrefix, normalizedActivePrefix]);

  const directoryListing = useMemo(() => {
    if (!prefixFiles.length) return [];

    const map = new Map<string, number>();
    const normalized =
      normalizedActivePrefix !== "" ? `${normalizedActivePrefix}/` : "";

    prefixFiles.forEach((file) => {
      const key = file.key;
      if (normalizedActivePrefix) {
        if (!key.startsWith(normalized)) return;
        const remainder = key.slice(normalized.length);
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
  }, [prefixFiles, normalizedActivePrefix]);

  const rootFileCount = useMemo(() => {
    if (!prefixFiles.length) return 0;
    if (!normalizedActivePrefix) {
      return prefixFiles.filter((file) => !file.key.includes("/")).length;
    }

    return prefixFiles.filter((file) => {
      if (!file.key.startsWith(`${normalizedActivePrefix}/`)) return false;
      const remainder = file.key.slice(normalizedActivePrefix.length + 1);
      return remainder.length > 0 && !remainder.includes("/");
    }).length;
  }, [normalizedActivePrefix, prefixFiles]);

  const handleDirectoryClick = (segment: string) => {
    setActivePrefix((current) => {
      const base = normalizePrefix(current);
      return base ? `${base}/${segment}` : segment;
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      setActivePrefix("");
      return;
    }
    const target = breadcrumbs.slice(0, index + 1).join("/");
    setActivePrefix(target);
  };

  const requiresSetup = useMemo(
    () => data.stats.bucket.toLowerCase().includes("configure"),
    [data.stats.bucket],
  );

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <UploadCloud className="h-4 w-4" />
            Storage S3
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Biblioteca de arquivos
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Arraste arquivos ou navegue entre pastas para gerenciar seu conteúdo no
            bucket configurado.
          </p>
          {requiresSetup ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>
                Configure bucket, região e credenciais em <strong>/settings</strong> para
                habilitar uploads reais ao S3.
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, usuário ou permissão..."
              className="pl-9"
            />
          </div>
          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload rápido</CardTitle>
            <CardDescription>
              Solte múltiplos arquivos ou escolha manualmente. Prefixo e permissões são
              opcionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 p-10 text-center transition-all dark:border-zinc-700 dark:bg-zinc-900/40",
                requiresSetup
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-zinc-400 hover:bg-zinc-100/70 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/70",
                isDragging && "border-zinc-900 bg-zinc-100/80 dark:border-zinc-200",
              )}
              role="button"
              tabIndex={0}
              aria-disabled={requiresSetup}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <UploadCloud className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {requiresSetup
                  ? "Finalize a configuração em /settings"
                  : isDragging
                    ? "Solte os arquivos para enviar"
                    : "Arraste e solte arquivos aqui"}
              </h3>
              <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                {requiresSetup
                  ? "Bucket e credenciais ainda não foram informados."
                  : "Limite recomendado de 2 GB por arquivo. Utilize a CDN para compartilhar rapidamente."}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                disabled={requiresSetup || uploading}
              >
                {uploading ? "Enviando..." : "Selecionar arquivos"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleInputChange}
                disabled={requiresSetup}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Prefixo (opcional)
                </label>
                <Input
                  value={prefixInput}
                  onChange={(event) => setPrefixInput(event.target.value)}
                  placeholder="ex: marketing/campanhas"
                  disabled={uploading}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permissões (separadas por vírgula)
                </label>
                <Input
                  value={permissionsInput}
                  onChange={(event) => setPermissionsInput(event.target.value)}
                  placeholder="ex: publico, marketing"
                  disabled={uploading}
                />
              </div>
            </div>

            <UploadProgressList items={uploadQueue.slice(0, 5)} />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Explorar pastas</CardTitle>
            <CardDescription>
              Navegue pelos níveis do bucket para filtrar rapidamente os arquivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(-1)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-transparent px-3 py-1.5 transition",
                  normalizedActivePrefix === ""
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900",
                )}
              >
                <Home className="h-3.5 w-3.5" />
                Raiz
              </button>
              {breadcrumbs.map((segment, index) => (
                <div
                  key={`${segment}-${index}`}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-3 w-3 text-zinc-400" />
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {segment}
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  Pastas neste nível
                </span>
                <Badge variant="outline" className="font-normal">
                  {directoryListing.length} pasta(s)
                </Badge>
              </div>
              {directoryListing.length ? (
                <div className="grid gap-2">
                  {directoryListing.map((dir) => (
                    <button
                      key={dir.name}
                      type="button"
                      onClick={() => handleDirectoryClick(dir.name)}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    >
                      <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                        <Folder className="h-4 w-4" />
                        {dir.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {dir.count} item(s)
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
                  Nenhuma subpasta encontrada neste nível.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <FolderOpen className="h-4 w-4" />
                <span>
                  {rootFileCount} arquivo(s) diretamente em{" "}
                  <strong>
                    {normalizedActivePrefix ? normalizedActivePrefix : "Raiz"}
                  </strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Arquivos no bucket
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredFiles.length} resultado(s) encontrados
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80 uppercase text-xs font-semibold tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                <TableHead className="min-w-[260px]">Arquivo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
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
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-zinc-500"
                  >
                    Nenhum arquivo encontrado. Ajuste os filtros ou faça upload do
                    primeiro documento.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => {
                  const filePreviewType = getFilePreviewType(file.fileName);
                  const previewUrl = file.cdnUrl || file.url;
                  return (
                    <TableRow
                      key={file.key}
                      className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            {filePreviewType === "image" ? (
                              <img
                                src={previewUrl}
                                alt={file.fileName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : filePreviewType === "video" ? (
                              <Video className="h-5 w-5 text-zinc-500" />
                            ) : filePreviewType === "audio" ? (
                              <AudioLines className="h-5 w-5 text-zinc-500" />
                            ) : filePreviewType === "pdf" || filePreviewType === "text" ? (
                              <FileText className="h-5 w-5 text-zinc-500" />
                            ) : (
                              <FileQuestion className="h-5 w-5 text-zinc-500" />
                            )}
                          </div>
                          <div className="max-w-[260px] truncate">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {file.fileName}
                            </p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {file.key}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>{formatDateTime(file.lastModified)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {(file.permissions ?? ["padrão"]).map((permission) => (
                            <Badge key={permission} variant="outline">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="icon">
                            <a href={file.url} target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-500"
                            onClick={() => handleDelete(file.key)}
                            disabled={deletingKey === file.key}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a href={file.cdnUrl} target="_blank" rel="noreferrer">
                              Abrir CDN
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      ) : null}
    </div>
  );
}
