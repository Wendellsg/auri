"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBytes, formatDateTime } from "@/lib/utils";

type FileRecord = {
  key: string;
  fileName: string;
  size: number;
  lastModified: string;
  uploadedBy?: string;
  permissions?: string[];
  cdnUrl: string;
  url: string;
  status?: "ativo" | "arquivado";
  contentType?: string;
};

type FilesResponse = {
  files: FileRecord[];
  stats: {
    totalFiles: number;
    totalSize: number;
    lastUpdated: string;
    bucket: string;
    cdnHost: string;
  };
  recentUploads: Array<{
    id: string;
    fileName: string;
    uploadedAt: string;
    uploadedBy?: string;
    size: number;
  }>;
};

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

export function FilesDashboard() {
  const [data, setData] = useState<FilesResponse>(INITIAL_STATE);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const filteredFiles = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return data.files;
    }
    return data.files.filter((file) =>
      [file.fileName, file.uploadedBy, file.permissions?.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [data.files, query]);

  const handleUpload: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setUploading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Não foi possível concluir o upload. Tente novamente.",
        );
      }

      event.currentTarget.reset();
      await fetchData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao enviar o arquivo.",
      );
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <UploadCloud className="h-4 w-4" />
            Storage S3
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Central de Arquivos
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Faça upload rápido, acompanhe permissões e distribua via CDN com total
            visibilidade dos arquivos corporativos.
          </p>
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

      <section className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Arquivos ativos
              </p>
              <CardTitle className="text-2xl">{data.stats.totalFiles}</CardTitle>
            </div>
            <Badge variant="success">+100% monitorado</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bucket: <span className="font-medium">{data.stats.bucket}</span>
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              CDN: <span className="font-medium">{data.stats.cdnHost}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Armazenamento em uso
              </p>
              <CardTitle className="text-2xl">
                {formatBytes(data.stats.totalSize)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Atualizado em {formatDateTime(data.stats.lastUpdated)}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Últimos envios
              </p>
              <CardTitle className="text-2xl">
                {data.recentUploads.length > 0
                  ? data.recentUploads[0]?.fileName
                  : "Nenhum envio recente"}
              </CardTitle>
            </div>
            <Badge variant="outline">
              {data.recentUploads.length} arquivos nas últimas 24h
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.recentUploads.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Faça um upload para começar a monitorar os arquivos carregados.
              </p>
            ) : (
              data.recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 px-4 py-3 text-sm transition hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {upload.uploadedBy ?? "Sistema"} — {formatDateTime(upload.uploadedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatBytes(upload.size)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Enviar novo arquivo</CardTitle>
              <CardDescription>
                Faça upload direto para o bucket configurado. O link retornado já virá
                com o host da CDN.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[2fr,1fr] md:items-end"
              onSubmit={handleUpload}
            >
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Escolha o arquivo
                </label>
                <Input
                  name="file"
                  type="file"
                  required
                  className="cursor-pointer"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Pasta (opcional)
                </label>
                <Input
                  name="prefix"
                  placeholder="ex: marketing/landing-page"
                />
              </div>
              <div className="grid gap-2 md:col-span-2 lg:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permissões (separadas por vírgula)
                </label>
                <Input
                  name="permissions"
                  placeholder="ex: publico, marketing, interno"
                />
              </div>
              <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  O arquivo será enviado com versionamento habilitado e terá o host
                  substituído automaticamente pelo domínio CDN.
                </p>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="md:w-48"
                >
                  {uploading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Enviar arquivo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de segurança</CardTitle>
            <CardDescription>
              Garanta que as permissões sigam as regras estratégicas da companhia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <Shield className="mt-0.5 h-4 w-4 text-emerald-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Permissões validadas
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Use perfis com base nas equipes ou projetos para evitar vazamento.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-sky-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  URL CDN pronta
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Copie e compartilhe o link otimizado para distribuição global.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Monitoramento ativo
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Analise o histórico de atualizações para identificar alterações
                  inesperadas.
                </p>
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
                <TableHead className="min-w-[240px]">Arquivo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                    Carregando arquivos...
                  </TableCell>
                </TableRow>
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-500">
                    Nenhum arquivo encontrado. Faça upload do primeiro documento.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => (
                  <TableRow key={file.key}>
                    <TableCell className="max-w-[300px] truncate">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {file.key}
                      </p>
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
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                        >
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
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <a
                            href={file.cdnUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir CDN
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
