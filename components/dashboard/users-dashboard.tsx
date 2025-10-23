"use client";

import { Check, Copy, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "invited" | "blocked";
  createdAt: string;
  lastAccessAt?: string;
  permissions: string[];
};

type UsersResponse = {
  users: UserRecord[];
  availablePermissions: string[];
};

const DEFAULT_USERS: UsersResponse = {
  users: [],
  availablePermissions: ["upload", "delete", "visualizar", "compartilhar"],
};

export function UsersDashboard() {
  const [data, setData] = useState<UsersResponse>(DEFAULT_USERS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "editor",
    permissions: [] as string[],
  });
  const [passwordResult, setPasswordResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Não foi possível carregar os usuários.");
      }
      const json = (await response.json()) as UsersResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um problema ao buscar os usuários.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return data.users;
    }
    return data.users.filter((user) =>
      [user.name, user.email, user.role, ...user.permissions]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [data.users, query]);

  const handlePermissionChange = (permission: string) => {
    setNewUser((state) => {
      const enabled = state.permissions.includes(permission);
      return {
        ...state,
        permissions: enabled
          ? state.permissions.filter((item) => item !== permission)
          : [...state.permissions, permission],
      };
    });
  };

  const handleCreateUser: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setPasswordResult(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Não foi possível criar o usuário. Tente novamente.",
        );
      }

      const json = await response.json();

      setPasswordResult({
        email: json.user.email,
        password: json.password,
      });
      setNewUser({
        name: "",
        email: "",
        role: "editor",
        permissions: [],
      });

      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um problema ao criar o usuário.",
      );
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo(() => {
    const total = data.users.length;
    const admins = data.users.filter((user) => user.role === "admin").length;
    const invited = data.users.filter((user) => user.status === "invited").length;
    return { total, admins, invited };
  }, [data.users]);

  const handleCopyPassword = async () => {
    if (!passwordResult) return;
    try {
      await navigator.clipboard.writeText(
        `${passwordResult.email}\nSenha temporária: ${passwordResult.password}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setError("Não foi possível copiar a senha gerada.");
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4" />
            Controle de acesso
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Gestão de usuários
          </h1>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Crie contas com senha temporária, acompanhe permissões e garanta que o painel
            esteja seguro para toda a equipe.
          </p>
          <Badge variant="outline" className="w-fit">
            Postgres + Prisma
          </Badge>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil..."
            className="w-full sm:max-w-xs"
          />
          <Button variant="secondary" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar lista
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Usuários ativos</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </div>
            <UsersRound className="h-6 w-6 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Contas com acesso ao painel AUVP Uploader.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Perfis administradores</CardDescription>
              <CardTitle className="text-3xl">{stats.admins}</CardTitle>
            </div>
            <ShieldCheck className="h-6 w-6 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Administradores podem gerenciar permissões e uploads sensíveis.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardDescription>Convites pendentes</CardDescription>
              <CardTitle className="text-3xl">{stats.invited}</CardTitle>
            </div>
            <Badge variant="outline">Aguardando acesso</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Reenvie convites caso um usuário ainda não tenha realizado login.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar novo usuário</CardTitle>
            <CardDescription>
              Defina o perfil de acesso e selecione as permissões personalizadas. A senha
              será gerada automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleCreateUser}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome completo
                </label>
                <Input
                  value={newUser.name}
                  onChange={(event) =>
                    setNewUser((state) => ({ ...state, name: event.target.value }))
                  }
                  required
                  placeholder="Maria Silva"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  E-mail corporativo
                </label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((state) => ({ ...state, email: event.target.value }))
                  }
                  required
                  placeholder="maria.silva@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Perfil
                </label>
                <select
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((state) => ({
                      ...state,
                      role: event.target.value as UserRecord["role"],
                    }))
                  }
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="admin">Administrador</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div className="grid gap-3">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Permissões adicionais
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.availablePermissions.map((permission) => {
                    const checked = newUser.permissions.includes(permission);
                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handlePermissionChange(permission)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200 dark:border-zinc-600 dark:text-zinc-100"
                        />
                        {permission}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full sm:w-fit"
                disabled={creating}
              >
                {creating ? "Gerando acesso..." : "Criar usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle,_rgba(24,24,27,0.08),_transparent_65%)]" />
          <CardHeader>
            <CardTitle>Senha temporária</CardTitle>
            <CardDescription>
              Compartilhe com o colaborador e solicite a troca no primeiro acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordResult ? (
              <>
                <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Usuário
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {passwordResult.email}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Senha temporária
                  </span>
                  <span className="font-semibold tracking-wider text-zinc-900 dark:text-zinc-50">
                    {passwordResult.password}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleCopyPassword}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar dados de acesso
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  A senha expira após o primeiro login. Oriente o usuário a definir uma
                  senha forte imediatamente.
                </p>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                Crie um usuário para visualizar a senha temporária gerada pelo sistema.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Usuários cadastrados
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Acompanhe status, permissões e último acesso de cada colaborador.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80 uppercase text-xs font-semibold tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-500">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {user.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active"
                            ? "success"
                            : user.status === "invited"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.permissions.map((permission) => (
                          <Badge key={permission} variant="outline">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.lastAccessAt
                        ? formatDateTime(user.lastAccessAt)
                        : "—"}
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
