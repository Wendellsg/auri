"use client";

import {
  Check,
  Copy,
  KeyRound,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

const STATUS_LABELS: Record<UserRecord["status"], string> = {
  active: "Ativo",
  invited: "Convidado",
  blocked: "Bloqueado",
};

type SheetProps = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({
    name: "",
    email: "",
    role: "editor" as UserRecord["role"],
    status: "invited" as UserRecord["status"],
    permissions: [] as string[],
  });
  const [passwordResult, setPasswordResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedUserId) return;
    const exists = data.users.some((user) => user.id === selectedUserId);
    if (!exists) {
      setSelectedUserId(null);
      setEditSheetOpen(false);
    }
  }, [data.users, selectedUserId]);

  const selectedUser = useMemo(
    () =>
      selectedUserId
        ? data.users.find((user) => user.id === selectedUserId) ?? null
        : null,
    [data.users, selectedUserId],
  );

  useEffect(() => {
    if (!selectedUser) return;
    setEditUser({
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role,
      status: selectedUser.status,
      permissions: [...selectedUser.permissions],
    });
  }, [selectedUser]);

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

  const handleEditPermissionChange = (permission: string) => {
    setEditUser((state) => {
      const enabled = state.permissions.includes(permission);
      return {
        ...state,
        permissions: enabled
          ? state.permissions.filter((item) => item !== permission)
          : [...state.permissions, permission],
      };
    });
  };

  const handleCreateUser: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

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
      setCopied(false);
      setNewUser({
        name: "",
        email: "",
        role: "editor",
        permissions: [],
      });
      setCreateSheetOpen(false);

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

  const handleEditUser: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    const targetId = selectedUser?.id ?? selectedUserId ?? "";
    if (!targetId) {
      setError("Selecione um usuário válido para atualizar.");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editUser,
          id: targetId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Não foi possível atualizar o usuário. Tente novamente.",
        );
      }

      const json = await response.json();

      if (json.user) {
        setEditUser({
          name: json.user.name,
          email: json.user.email,
          role: json.user.role,
          status: json.user.status,
          permissions: json.user.permissions ?? [],
        });
      }

      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um problema ao atualizar o usuário.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleGeneratePassword = async () => {
    const targetId = selectedUser?.id ?? selectedUserId ?? "";
    if (!targetId || !selectedUser) {
      setError("Selecione um usuário válido para gerar uma nova senha.");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editUser,
          regeneratePassword: true,
          id: targetId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Não foi possível gerar uma nova senha. Tente novamente.",
        );
      }

      const json = await response.json();

      if (json.user) {
        setEditUser({
          name: json.user.name,
          email: json.user.email,
          role: json.user.role,
          status: json.user.status,
          permissions: json.user.permissions ?? [],
        });
      }

      if (json.password) {
        const targetEmail = json.user?.email ?? selectedUser.email;
        setPasswordResult({
          email: targetEmail,
          password: json.password,
        });
        setCopied(false);
      }

      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um problema ao gerar a senha.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const stats = useMemo(() => {
    const total = data.users.length;
    const admins = data.users.filter((user) => user.role === "admin").length;
    const invited = data.users.filter(
      (user) => user.status === "invited",
    ).length;
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

  const openEditSheet = (user: UserRecord) => {
    setSelectedUserId(user.id);
    setEditUser({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: [...user.permissions],
    });
    setPasswordResult(null);
    setCopied(false);
    setEditSheetOpen(true);
  };

  return (
    <>
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
              Crie contas com senha temporária, acompanhe permissões e garanta que
              o painel esteja seguro para toda a equipe.
            </p>
            <Badge variant="outline" className="w-fit">
              MongoDB + Prisma
            </Badge>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, e-mail ou perfil..."
              className="w-full sm:max-w-xs"
            />
            <Button
              className="w-full sm:w-fit"
              onClick={() => {
                setCreateSheetOpen(true);
              }}
            >
              Criar usuário
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-fit"
              onClick={fetchUsers}
              disabled={loading}
            >
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
                Contas com acesso ao painel Auri.
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
              <CardTitle>Gerenciar convites</CardTitle>
              <CardDescription>
                Gere acessos temporários ou mantenha os dados dos colaboradores
                atualizados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Utilize o botão abaixo para abrir o formulário completo sem sair da
                listagem.
              </p>
              <Button className="w-full sm:w-fit" onClick={() => setCreateSheetOpen(true)}>
                Criar novo usuário
              </Button>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                O processo cria uma senha temporária automaticamente.
              </p>
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
                    <span className="text-zinc-500 dark:text-zinc-400">Usuário</span>
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
                    A senha expira após o primeiro login. Oriente o usuário a definir
                    uma senha forte imediatamente.
                  </p>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                  Crie ou edite um usuário para visualizar a senha temporária gerada
                  pelo sistema.
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-zinc-500">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-zinc-500">
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
                          {STATUS_LABELS[user.status]}
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
                        {user.lastAccessAt ? formatDateTime(user.lastAccessAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditSheet(user)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
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

      <Sheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="Criar novo usuário"
        description="Defina perfil, permissões e gere um acesso temporário em segundos."
      >
        <form className="grid gap-4" onSubmit={handleCreateUser}>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome completo
            </label>
            <Input
              value={newUser.name}
              onChange={(event) =>
                setNewUser((state) => ({
                  ...state,
                  name: event.target.value,
                }))
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
                setNewUser((state) => ({
                  ...state,
                  email: event.target.value,
                }))
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
          <Button type="submit" className="w-full sm:w-fit" disabled={creating}>
            {creating ? "Gerando acesso..." : "Criar usuário"}
          </Button>
        </form>
      </Sheet>

      <Sheet
        open={editSheetOpen && !!selectedUser}
        onClose={() => setEditSheetOpen(false)}
        title="Editar usuário"
        description="Atualize dados cadastrais ou gere uma nova senha temporária."
      >
        {selectedUser ? (
          <form className="grid gap-4" onSubmit={handleEditUser}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome completo
              </label>
              <Input
                value={editUser.name}
                onChange={(event) =>
                  setEditUser((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
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
                value={editUser.email}
                onChange={(event) =>
                  setEditUser((state) => ({
                    ...state,
                    email: event.target.value,
                  }))
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
                value={editUser.role}
                onChange={(event) =>
                  setEditUser((state) => ({
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
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                value={editUser.status}
                onChange={(event) =>
                  setEditUser((state) => ({
                    ...state,
                    status: event.target.value as UserRecord["status"],
                  }))
                }
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Permissões adicionais
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.availablePermissions.map((permission) => {
                  const checked = editUser.permissions.includes(permission);
                  return (
                    <label
                      key={permission}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleEditPermissionChange(permission)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200 dark:border-zinc-600 dark:text-zinc-100"
                      />
                      {permission}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" className="w-full sm:w-fit" disabled={updating}>
                {updating ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-fit"
                onClick={handleGeneratePassword}
                disabled={updating}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Gerar nova senha
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Selecione um usuário para editar os dados de acesso.
          </p>
        )}
      </Sheet>
    </>
  );
}

function Sheet({ title, description, open, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-xl transition dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
