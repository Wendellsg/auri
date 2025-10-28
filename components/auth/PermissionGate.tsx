"use client";

import { type ComponentType, type ReactNode } from "react";

import { useSession, type SessionUser } from "@/hooks/use-session";

type PermissionList = string | string[];

export type PermissionContext = {
  session: SessionUser | null;
  permissions: string[];
  required: string[];
  missing: string[];
  allowed: boolean;
};

type PermissionGateChildren =
  | ReactNode
  | ((context: PermissionContext & { allowed: true }) => ReactNode);

type SharedGateProps = {
  permissions?: PermissionList;
  mode?: "all" | "any";
  fallback?: ReactNode | ((context: PermissionContext) => ReactNode);
  children: PermissionGateChildren;
};

export type PermissionGateProps = SharedGateProps & {
  session?: SessionUser | null;
};

type WithPermissionsOptions = {
  permissions?: PermissionList;
  mode?: "all" | "any";
  fallback?: ReactNode | ((context: PermissionContext) => ReactNode);
};

function normalizePermissionsInput(input?: PermissionList) {
  if (!input) return [];
  const values = Array.isArray(input) ? input : [input];
  return values
    .map((item) => item.trim())
    .filter((item, index, array) => item && array.indexOf(item) === index);
}

export function hasRequiredPermissions(
  userPermissions: string[],
  required: string[],
  mode: "all" | "any" = "all"
) {
  if (!required.length) {
    return {
      allowed: true,
      missing: [],
    };
  }

  const normalizedUserPermissions = Array.from(
    new Set(userPermissions.filter(Boolean))
  );

  if (!normalizedUserPermissions.length) {
    return {
      allowed: false,
      missing: required,
    };
  }

  if (mode === "any") {
    const allowed = required.some((permission) =>
      normalizedUserPermissions.includes(permission)
    );
    const missing = allowed
      ? []
      : required.filter(
          (permission) => !normalizedUserPermissions.includes(permission)
        );

    return { allowed, missing };
  }

  const missing = required.filter(
    (permission) => !normalizedUserPermissions.includes(permission)
  );

  return {
    allowed: missing.length === 0,
    missing,
  };
}

type PermissionGateBaseProps = SharedGateProps & {
  session: SessionUser | null;
};

function PermissionGateBase({
  session,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: PermissionGateBaseProps) {
  const userPermissions = session?.permissions ?? [];
  const required = normalizePermissionsInput(permissions);

  const { allowed, missing } = hasRequiredPermissions(
    userPermissions,
    required,
    mode
  );

  const context: PermissionContext = {
    session,
    permissions: userPermissions,
    required,
    missing,
    allowed,
  };

  if (!allowed) {
    if (typeof fallback === "function") {
      return <>{fallback(context)}</>;
    }
    return <>{fallback}</>;
  }

  if (typeof children === "function") {
    return <>{children({ ...context, allowed: true })}</>;
  }

  return <>{children}</>;
}

function PermissionGateWithHook(props: SharedGateProps) {
  const session = useSession();
  return <PermissionGateBase {...props} session={session} />;
}

export function PermissionGate({ session, ...rest }: PermissionGateProps) {
  if (typeof session !== "undefined") {
    return <PermissionGateBase {...rest} session={session} />;
  }
  return <PermissionGateWithHook {...rest} />;
}

export function withPermissions<P extends Record<string, any>>(
  Component: ComponentType<P>,
  options: WithPermissionsOptions
) {
  type WithPermissionsProps = P & {
    session?: SessionUser | null;
  };

  function WithPermissionsComponent(props: WithPermissionsProps) {
    const { session: providedSession, ...restProps } = props;

    return (
      <PermissionGate
        session={providedSession}
        permissions={options.permissions}
        mode={options.mode}
        fallback={options.fallback}
      >
        <Component {...(restProps as P)} />
      </PermissionGate>
    );
  }

  const componentName = Component.displayName || Component.name || "Component";
  WithPermissionsComponent.displayName = `withPermissions(${componentName})`;

  return WithPermissionsComponent;
}
