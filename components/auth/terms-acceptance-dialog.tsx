"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";

export function TermsAcceptanceDialog() {
  const session = useSession();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const shouldShow = useMemo(() => {
    if (!session) return false;
    if (session.termsAcceptedAt) return false;
    if (acknowledged) return false;
    return true;
  }, [acknowledged, session]);

  useEffect(() => {
    if (session?.termsAcceptedAt) {
      setAcknowledged(true);
    }
  }, [session?.termsAcceptedAt]);

  if (!shouldShow) {
    return null;
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    const normalized = confirmation.trim().toLowerCase();
    if (normalized !== "entendido") {
      setError('Digite exatamente "entendido" para confirmar o aceite.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/users/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        let message = "Não foi possível registrar o aceite.";
        try {
          const data = (await response.json()) as { message?: string };
          if (data?.message) {
            message = data.message;
          }
        } catch {
          // ignore parse errors
        }
        setError(message);
        return;
      }

      setAcknowledged(true);
      setConfirmation("");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado ao registrar o aceite.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-md [&_[data-radix-dialog-close]]:hidden">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Atenção</DialogTitle>
            <DialogDescription>
              Todos os arquivos enviados por este painel ficam acessíveis
              publicamente através da CDN configurada. Confirme abaixo que você
              está ciente desta política.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Ao confirmar, você entende que qualquer pessoa com o link do
              arquivo poderá acessá-lo. Evite enviar dados sensíveis ou
              confidenciais.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="terms-confirmation"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Digite <span className="font-semibold">entendido</span> para
              continuar
            </label>
            <Input
              id="terms-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="entendido"
              autoFocus
              disabled={submitting}
              className="rounded-full border-zinc-300 text-sm uppercase tracking-wide dark:border-zinc-700"
            />
            {error ? (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="submit"
              className="rounded-full"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
