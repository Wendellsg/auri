"use client";

import { History, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { formatDateTime } from "@/lib/utils";

type ActivityLogRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  targetKey: string | null;
  details: string | null;
  createdAt: string;
};

type ActivityResponse = {
  logs: ActivityLogRecord[];
};

const DEFAULT_RESPONSE: ActivityResponse = {
  logs: [],
};

const ACTION_LABELS: Record<string, string> = {
  file_upload_prepared: "Upload preparado",
  file_deleted: "Arquivo removido",
  folder_created: "Pasta criada",
};

const ACTION_BADGE_CLASSES: Record<string, string> = {
  file_upload_prepared:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  file_deleted:
    "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-200",
  folder_created:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
};

export function ActivityDashboard() {
  const [data, setData] = useState<ActivityResponse>(DEFAULT_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const hasFilters = useMemo(() => activeSearch.trim().length > 0, [activeSearch]);

  const fetchActivity = useCallback(
    async (params?: { search?: string }) => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (params?.search?.trim()) {
          query.set("search", params.search.trim());
        }

        const response = await fetch(
          `/api/activity${query.size ? `?${query.toString()}` : ""}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Falha ao carregar as atividades.");
        }

        const json = (await response.json()) as ActivityResponse;
        setData(json);
        setActiveSearch(params?.search?.trim() ?? "");
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Ocorreu um problema ao listar as atividades.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchActivity().catch(() => {
      // handled above
    });
  }, [fetchActivity]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    void fetchActivity({ search });
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveSearch("");
    void fetchActivity({ search: "" });
  };

  const rows = data.logs;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                <History className="h-6 w-6 text-zinc-500 dark:text-zinc-300" />
                Registro de atividades
              </CardTitle>
              <CardDescription>
                Monitoramento das ações realizadas pelos usuários no bucket.
              </CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <form
                onSubmit={handleSubmit}
                className="flex w-full min-w-[240px] items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por usuário, ação ou arquivo..."
                    className="pl-9 text-sm"
                  />
                </div>
                <Button type="submit" className="rounded-full" disabled={loading}>
                  Filtrar
                </Button>
              </form>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => fetchActivity({ search: activeSearch })}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
              {hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="rounded-b-3xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-b-3xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Arquivo/Pasta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Carregando atividades...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <p>Nenhuma atividade registrada no período.</p>
                          <p>
                            Novas ações de upload, criação de pastas e exclusão
                            aparecerão aqui automaticamente.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((log) => {
                      const label =
                        ACTION_LABELS[log.action] ?? log.action ?? "Ação";
                      const badgeClass =
                        ACTION_BADGE_CLASSES[log.action] ??
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

                      return (
                        <TableRow key={log.id} className="align-top">
                          <TableCell className="whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                            >
                              {label}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-y-1 text-sm">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {log.userName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {log.userEmail}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-xs text-sm text-zinc-600 dark:text-zinc-300">
                            {log.details ?? "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            {log.targetKey ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {hasFilters ? (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Filtro aplicado para:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {activeSearch}
          </span>
        </div>
      ) : null}
    </div>
  );
}
