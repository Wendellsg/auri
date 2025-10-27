"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = ["ambiente", "admin", "aws"] as const;
type Step = (typeof STEPS)[number];

type FormState = {
  appHost: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  bucketName: string;
  region: string;
  accessKey: string;
  secretKey: string;
  cdnHost: string;
};

const INITIAL_STATE: FormState = {
  appHost: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  bucketName: "",
  region: "us-east-1",
  accessKey: "",
  secretKey: "",
  cdnHost: "",
};

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("ambiente");
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToNext = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => null);
        throw new Error(
          message?.message ?? "Não foi possível finalizar o setup."
        );
      }

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro inesperado no onboarding."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-3xl border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        <CardHeader className="space-y-4 text-center flex flex-col items-center justify-center">
          <CardTitle className="text-2xl flex items-center justify-center">
            <img
              src="/assets/auri.png"
              alt="auri"
              width={48}
              height={48}
              className="h-12 w-12 min-w-12 min-h-12 rounded-full mr-2"
            />
            Entrar no painel
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Informe os dados essenciais para iniciar o uso do AUVP Uploader.
            Você pode alterar essas informações depois em /settings ou via banco
            de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 pb-6 text-xs text-zinc-400">
            {STEPS.map((step, index) => {
              const active = step === currentStep;
              const completed = STEPS.indexOf(currentStep) > index;
              return (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={
                      active
                        ? "rounded-full bg-zinc-100 px-3 py-1 text-zinc-900"
                        : completed
                        ? "rounded-full bg-emerald-600 px-3 py-1 text-white"
                        : "rounded-full bg-zinc-800 px-3 py-1"
                    }
                  >
                    {step === "ambiente"
                      ? "Ambiente"
                      : step === "admin"
                      ? "Usuário admin"
                      : "Credenciais AWS"}
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className="h-px w-8 bg-zinc-800" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {currentStep === "ambiente" ? (
              <div className="grid gap-4">
                <div className="grid gap-2 text-left">
                  <Label htmlFor="appHost">Host do aplicativo</Label>
                  <Input
                    id="appHost"
                    placeholder="https://painel.empresa.com"
                    value={formState.appHost}
                    onChange={(event) =>
                      updateField("appHost", event.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Utilizado em notificações e callbacks para construir URLs
                    absolutas do painel (ex: https://painel.empresa.com).
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={goToNext}
                    disabled={!formState.appHost}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            ) : null}

            {currentStep === "admin" ? (
              <div className="grid gap-4">
                <div className="grid gap-2 text-left">
                  <Label htmlFor="adminName">Nome do administrador</Label>
                  <Input
                    id="adminName"
                    placeholder="Maria Silva"
                    value={formState.adminName}
                    onChange={(event) =>
                      updateField("adminName", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="adminEmail">E-mail corporativo</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="maria@empresa.com"
                    value={formState.adminEmail}
                    onChange={(event) =>
                      updateField("adminEmail", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="adminPassword">Senha temporária</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Senha forte"
                    value={formState.adminPassword}
                    onChange={(event) =>
                      updateField("adminPassword", event.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Essa senha vai ser cadastrada como padrão para o
                    administrador. Recomende a troca no primeiro acesso.
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={goToNext}
                    disabled={
                      !formState.adminName ||
                      !formState.adminEmail ||
                      !formState.adminPassword
                    }
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            ) : null}

            {currentStep === "aws" ? (
              <div className="grid gap-4">
                <div className="grid gap-2 text-left">
                  <Label htmlFor="bucketName">Bucket S3</Label>
                  <Input
                    id="bucketName"
                    placeholder="empresa-upload-prd"
                    value={formState.bucketName}
                    onChange={(event) =>
                      updateField("bucketName", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="region">Região AWS</Label>
                  <Input
                    id="region"
                    placeholder="sa-east-1"
                    value={formState.region}
                    onChange={(event) =>
                      updateField("region", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="accessKey">Access key</Label>
                  <Input
                    id="accessKey"
                    value={formState.accessKey}
                    onChange={(event) =>
                      updateField("accessKey", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="secretKey">Secret key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={formState.secretKey}
                    onChange={(event) =>
                      updateField("secretKey", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 text-left">
                  <Label htmlFor="cdnHost">Host da CDN (opcional)</Label>
                  <Input
                    id="cdnHost"
                    placeholder="cdn.empresa.com"
                    value={formState.cdnHost}
                    onChange={(event) =>
                      updateField("cdnHost", event.target.value)
                    }
                  />
                </div>
                {error ? (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={goBack}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Finalizando..." : "Concluir onboarding"}
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
