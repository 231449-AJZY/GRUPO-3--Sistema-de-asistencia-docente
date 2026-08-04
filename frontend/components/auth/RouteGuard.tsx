"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  clearSession,
  getDashboardPathByRole,
  getSession,
  hasValidSession,
  normalizeUserRole,
  saveSession,
  type BackendLoginUser,
} from "@/lib/auth";
import type { UserRole } from "@/types/usuario";

type GuardStatus = "checking" | "authorized" | "validation-error";

interface RouteRule {
  prefix: string;
  allowedRoles: readonly UserRole[];
}

interface AuthMeResponse {
  user?: BackendLoginUser & {
    activo?: boolean;
  };
  error?: string;
}

const PROTECTED_ROUTES: readonly RouteRule[] = [
  {
    prefix: "/admin",
    allowedRoles: ["ADMINISTRADOR"],
  },
  {
    prefix: "/login/PanelAdmin",
    allowedRoles: ["ADMINISTRADOR"],
  },
  {
    prefix: "/login/PanelDocente",
    allowedRoles: ["DOCENTE"],
  },
  {
    prefix: "/login/PanelSupervisor",
    allowedRoles: ["SUPERVISOR"],
  },
  {
    prefix: "/docente",
    allowedRoles: ["DOCENTE"],
  },
  {
    prefix: "/supervisor",
    allowedRoles: ["SUPERVISOR"],
  },
];

function isRouteInside(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getRouteRule(pathname: string): RouteRule | null {
  return (
    PROTECTED_ROUTES.find((rule) =>
      isRouteInside(pathname, rule.prefix)
    ) ?? null
  );
}

function isPositiveInteger(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

export default function RouteGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const routeRule = useMemo(
    () => getRouteRule(pathname),
    [pathname]
  );

  const [status, setStatus] =
    useState<GuardStatus>(routeRule ? "checking" : "authorized");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationAttempt, setValidationAttempt] = useState(0);

  const goToLogin = useCallback(() => {
    clearSession();
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function validateProtectedRoute() {
      if (!routeRule) {
        setErrorMessage("");
        setStatus("authorized");
        return;
      }

      setErrorMessage("");
      setStatus("checking");

      const session = getSession();

      if (!session || !hasValidSession()) {
        goToLogin();
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          cache: "no-store",
          signal: controller.signal,
        });

        let data: AuthMeResponse = {};

        try {
          data = (await response.json()) as AuthMeResponse;
        } catch {
          data = {};
        }

        if (cancelled) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          goToLogin();
          return;
        }

        if (!response.ok || !data.user) {
          setErrorMessage(
            data.error ||
              "No se pudo validar la sesión con el servidor."
          );
          setStatus("validation-error");
          return;
        }

        if (data.user.activo === false) {
          goToLogin();
          return;
        }

        let actualRole: UserRole;

        try {
          actualRole = normalizeUserRole(data.user.rol);
        } catch {
          goToLogin();
          return;
        }

        if (
          actualRole === "DOCENTE" &&
          !isPositiveInteger(data.user.docente_id)
        ) {
          clearSession();
          setErrorMessage(
            "La cuenta docente no tiene un perfil docente asociado. Contacte al administrador."
          );
          setStatus("validation-error");
          return;
        }

        const sessionNeedsRefresh =
          session.user.rol !== actualRole ||
          session.userId !== Number(data.user.usuario_id ?? data.user.id) ||
          session.teacherId !==
            (isPositiveInteger(data.user.docente_id)
              ? Number(data.user.docente_id)
              : null);

        if (sessionNeedsRefresh) {
          saveSession(
            data.user,
            session.token,
            session.persistence === "local",
            data.user
          );
        }

        if (!routeRule.allowedRoles.includes(actualRole)) {
          router.replace(getDashboardPathByRole(actualRole));
          router.refresh();
          return;
        }

        if (isRouteInside(pathname, "/login/PanelAdmin")) {
          router.replace("/admin/dashboard");
          router.refresh();
          return;
        }

        if (isRouteInside(pathname, "/login/PanelDocente")) {
          router.replace("/docente/dashboard");
          router.refresh();
          return;
        }

        if (isRouteInside(pathname, "/login/PanelSupervisor")) {
          router.replace("/supervisor/dashboard");
          router.refresh();
          return;
        }

        setStatus("authorized");
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setErrorMessage(
          "No se pudo comprobar la sesión porque el servidor no está disponible."
        );
        setStatus("validation-error");
      }
    }

    void validateProtectedRoute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    goToLogin,
    pathname,
    routeRule,
    router,
    validationAttempt,
  ]);

  if (!routeRule || status === "authorized") {
    return <>{children}</>;
  }

  if (status === "validation-error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071d35] px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20 text-3xl">
            !
          </div>

          <h1 className="mt-5 text-2xl font-extrabold">
            No fue posible validar el acceso
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-blue-100">
            {errorMessage}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() =>
                setValidationAttempt((current) => current + 1)
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#0a2e52] transition hover:bg-blue-50"
            >
              Reintentar validación
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl border border-white/25 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071d35] px-6 text-white">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="mt-5 text-sm font-extrabold tracking-wide text-blue-100">
          Validando sesión y permisos...
        </p>
      </div>
    </main>
  );
}
