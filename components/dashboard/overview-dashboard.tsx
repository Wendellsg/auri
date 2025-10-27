"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Cloud,
  Database,
  HardDrive,
  RefreshCw,
  Shield,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type FilesResponse } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";

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

export function OverviewDashboard() {
  const [data, setData] = useState<FilesResponse>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/files", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Não foi possível carregar as estatísticas.");
      }
      const json = (await response.json()) as FilesResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um problema ao consultar os dados."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const requiresSetup = useMemo(
    () => data.stats.bucket.toLowerCase().includes("configure"),
    [data.stats.bucket]
  );

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <UploadCloud className="h-4 w-4" />
            Painel geral
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Visão executiva do storage
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Acompanhe uso de armazenamento, buckets configurados e últimos
            envios para garantir governança sobre o conteúdo distribuído pela
            CDN.
          </p>
          {requiresSetup ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>
                Configure bucket, região e credenciais em{" "}
                <strong>/settings</strong> para habilitar uploads reais ao S3.
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? "Atualizando..." : "Atualizar dados"}
          </Button>
          <Button asChild>
            <Link href="/">Abrir arquivos</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Arquivos ativos</CardDescription>
              <CardTitle className="text-3xl">
                {data.stats.totalFiles}
              </CardTitle>
            </div>
            <Database className="h-6 w-6 text-zinc-400" />
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 dark:text-zinc-400">
            Última atualização em {formatDateTime(data.stats.lastUpdated)}.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Uso de armazenamento</CardDescription>
              <CardTitle className="text-3xl">
                {formatBytes(data.stats.totalSize)}
              </CardTitle>
            </div>
            <HardDrive className="h-6 w-6 text-zinc-400" />
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 dark:text-zinc-400">
            CDN: <span className="font-medium">{data.stats.cdnHost}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Bucket configurado</CardDescription>
              <CardTitle className="text-2xl truncate">
                {data.stats.bucket}
              </CardTitle>
            </div>
            <Cloud className="h-6 w-6 text-zinc-400" />
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            Status:{" "}
            <Badge variant={requiresSetup ? "warning" : "success"}>
              {requiresSetup ? "pendente" : "ativo"}
            </Badge>
            <p>
              Origem CDN:{" "}
              <span className="font-medium">{data.stats.cdnHost}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle>Últimos envios</CardTitle>
              <CardDescription>
                Monitoramento das últimas atualizações de conteúdo.
              </CardDescription>
            </div>
            <Badge variant="outline">
              {data.recentUploads.length} nas últimas 24h
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.recentUploads.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum upload recente até o momento. Os envios realizados na
                página de arquivos aparecerão aqui automaticamente.
              </p>
            ) : (
              data.recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {upload.fileName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {upload.uploadedBy ?? "Sistema"} —{" "}
                      {formatDateTime(upload.uploadedAt)}
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

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle,_rgba(24,24,27,0.08),_transparent_65%)]" />
          <CardHeader>
            <CardTitle>Checklist de segurança</CardTitle>
            <CardDescription>
              Boas práticas para manter o bucket protegido e auditável.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <Shield className="mt-0.5 h-4 w-4 text-emerald-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Permissões validadas
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Utilize grupos dedicados por equipe ou projeto para evitar
                  acessos desnecessários.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <ArrowUpRight className="mt-0.5 h-4 w-4 text-sky-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  CDN pronta para entrega
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Garanta que o domínio CDN esteja com SSL válido e cabeçalhos
                  de cache configurados.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Observabilidade ativa
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Configure alerts (CloudWatch / Grafana) para acompanhar picos
                  de uso ou alterações inesperadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      ) : null}
    </div>
  );
}
