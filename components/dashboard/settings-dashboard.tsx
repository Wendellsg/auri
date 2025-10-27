"use client";

import { CheckCircle2, Loader2, Save, ServerCog, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsResponse = {
  settings: {
    bucketName: string;
    region: string;
    cdnHost: string;
    accessKey: string;
    hasSecretKey: boolean;
  };
};

export function SettingsDashboard() {
  const [initialData, setInitialData] = useState<SettingsResponse["settings"] | null>(null);
  const [formState, setFormState] = useState({
    bucketName: "",
    region: "",
    cdnHost: "",
    accessKey: "",
    secretKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/settings", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar as configurações.");
        }
        return response.json() as Promise<SettingsResponse>;
      })
      .then((data) => {
        setInitialData(data.settings);
        setFormState((current) => ({
          ...current,
          bucketName: data.settings.bucketName,
          region: data.settings.region,
          cdnHost: data.settings.cdnHost,
          accessKey: data.settings.accessKey,
        }));
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Ocorreu um erro ao carregar as configurações.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const hasChanges = useMemo(() => {
    if (!initialData) return true;
    return (
      formState.bucketName !== initialData.bucketName ||
      formState.region !== initialData.region ||
      formState.cdnHost !== initialData.cdnHost ||
      formState.accessKey !== initialData.accessKey ||
      Boolean(formState.secretKey)
    );
  }, [formState, initialData]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketName: formState.bucketName,
          region: formState.region,
          cdnHost: formState.cdnHost,
          accessKey: formState.accessKey,
          secretKey: formState.secretKey || undefined,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível salvar as configurações.");
      }

      const data = (await response.json()) as SettingsResponse & {
        message?: string;
      };

      setInitialData(data.settings);
      setFormState((current) => ({
        ...current,
        secretKey: "",
      }));
      setSuccess(data.message ?? "Configurações salvas com sucesso.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao salvar as configurações.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4" />
            Controle central
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Configurações de storage
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Defina o bucket padrão, região da AWS e o domínio CDN que será utilizado na
            reescrita das URLs públicas.
          </p>
        </div>
        <Badge variant="outline" className="self-start">
          Credenciais armazenadas no MongoDB
        </Badge>
      </header>

  <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bucket & CDN</CardTitle>
            <CardDescription>
              Essas informações serão utilizadas por toda a aplicação para enviar,
              listar e distribuir os arquivos carregados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="bucketName">Bucket S3</Label>
                  <Input
                    id="bucketName"
                    value={formState.bucketName}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        bucketName: event.target.value,
                      }))
                    }
                    required
                    placeholder="ex: empresa-upload-prd"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Região AWS</Label>
                  <Input
                    id="region"
                    value={formState.region}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        region: event.target.value,
                      }))
                    }
                    required
                    placeholder="ex: sa-east-1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cdnHost">Host CDN</Label>
                  <Input
                    id="cdnHost"
                    value={formState.cdnHost}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        cdnHost: event.target.value,
                      }))
                    }
                    placeholder="ex: cdn.empresa.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessKey">Access key</Label>
                  <Input
                    id="accessKey"
                    value={formState.accessKey}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        accessKey: event.target.value,
                      }))
                    }
                    required
                    placeholder="AKIA..."
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="secretKey">Secret key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={formState.secretKey}
                    onChange={(event) =>
                      setFormState((state) => ({
                        ...state,
                        secretKey: event.target.value,
                      }))
                    }
                    placeholder={
                      initialData?.hasSecretKey
                        ? "Informe para substituir a chave atual"
                        : "Sua secret key"
                    }
                  />
                  {initialData?.hasSecretKey ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Deixe em branco para manter a secret key já cadastrada.
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  As credenciais permanecem armazenadas no backend e não são expostas ao
                  navegador.
                </p>
                <Button
                  type="submit"
                  disabled={saving || loading || !hasChanges}
                  className="sm:w-48"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar configurações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle,_rgba(24,24,27,0.08),_transparent_65%)]" />
          <CardHeader>
            <CardTitle>Estado da integração</CardTitle>
            <CardDescription>
              Consulte rapidamente se o painel está pronto para enviar arquivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/80 p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <ServerCog className="h-5 w-5 text-zinc-500" />
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Status da conexão
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {loading
                    ? "Validando dados..."
                    : initialData?.bucketName
                      ? "Credenciais carregadas."
                      : "Configure bucket, região e credenciais para habilitar uploads."}
                </p>
              </div>
              {initialData?.bucketName ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : null}
            </div>
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
