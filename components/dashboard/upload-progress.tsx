"use client";

import { Check, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type UploadItem = {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

type UploadProgressListProps = {
  items: UploadItem[];
};

export function UploadProgressList({ items }: UploadProgressListProps) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const progressValue =
          item.status === "success" ? 100 : Math.min(100, Math.round(item.progress));

        return (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                  {item.fileName}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {item.status === "success"
                    ? "Upload concluído"
                    : item.status === "error"
                      ? "Erro ao enviar"
                      : "Enviando..."}
                </span>
              </div>
              {item.status === "success" ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : item.status === "error" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  item.status === "error"
                    ? "bg-red-500"
                    : item.status === "success"
                      ? "bg-emerald-500"
                      : "bg-zinc-900",
                )}
                style={{ width: `${progressValue}%` }}
              />
            </div>
            {item.error ? (
              <p className="mt-2 text-[11px] text-red-500">{item.error}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
