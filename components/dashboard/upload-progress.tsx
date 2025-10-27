"use client";

import Image from "next/image";
import { Check, Loader2, XCircle, File as FileIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type UploadItem = {
  id: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  previewUrl?: string;
  mimeType?: string;
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
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50">
                {item.previewUrl ? (
                  <Image
                    src={item.previewUrl}
                    alt={item.fileName}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <FileIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-700 dark:text-zinc-200">
                    {item.fileName}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {item.status === "success"
                      ? "Upload concluído"
                      : item.status === "error"
                        ? "Erro ao enviar"
                        : "Enviando..."}
                  </span>
                </div>
                <div className="mt-1">
                  {item.status === "success" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : item.status === "error" ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  )}
                </div>
              </div>
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
