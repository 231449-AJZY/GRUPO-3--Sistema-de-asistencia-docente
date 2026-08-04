"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getNavigationByRole,
} from "@/config/navigation";

import type {
  UserRole,
} from "@/types/usuario";

interface SidebarProps {
  role: UserRole;
}

const ROLE_LABELS: Record<
  UserRole,
  string
> = {
  ADMINISTRADOR: "Administrador",
  DOCENTE: "Docente",
  SUPERVISOR: "Supervisor",
};

function isRouteActive(
  pathname: string,
  href: string
): boolean {
  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  );
}

function NavigationIconComponent({
  icon,
}: {
  icon: string;
}) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </svg>
      );

    case "docentes":
    case "perfil":
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="8"
            r="4"
          />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      );

    case "biometria":
    case "asistencia":
      return (
        <svg {...commonProps}>
          <path d="M12 3a7 7 0 0 0-7 7c0 4.5-1 7-2 9" />
          <path d="M12 6a4 4 0 0 0-4 4c0 4-1 7-2 9" />
          <path d="M12 9a1 1 0 0 0-1 1c0 4-1 7-2 9" />
          <path d="M15 10c0 4-.5 7-1.5 10" />
          <path d="M18 10c0 4-.5 7-1 9" />
        </svg>
      );

    case "usuarios":
      return (
        <svg {...commonProps}>
          <circle
            cx="9"
            cy="8"
            r="4"
          />
          <path d="M2 21v-2a7 7 0 0 1 14 0v2" />
          <path d="M16 4.5a4 4 0 0 1 0 7" />
          <path d="M19 15.5a6 6 0 0 1 3 5.5" />
        </svg>
      );

    case "roles":
      return (
        <svg {...commonProps}>
          <path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "horarios":
      return (
        <svg {...commonProps}>
          <rect
            x="3"
            y="4"
            width="18"
            height="17"
            rx="3"
          />
          <path d="M8 2v4M16 2v4M3 9h18" />
          <path d="M8 14h3M13 14h3M8 18h3" />
        </svg>
      );

    case "calendario":
      return (
        <svg {...commonProps}>
          <rect
            x="3"
            y="4"
            width="18"
            height="17"
            rx="3"
          />
          <path d="M8 2v4M16 2v4M3 9h18" />
          <path d="m9 15 2 2 4-5" />
        </svg>
      );

    case "tardanzas":
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 7v6l4 2" />
        </svg>
      );

    case "inasistencias":
      return (
        <svg {...commonProps}>
          <path d="M12 3 2.5 20h19L12 3Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );

    case "alertas":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "consultas":
      return (
        <svg {...commonProps}>
          <circle
            cx="11"
            cy="11"
            r="7"
          />
          <path d="m20 20-4-4" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      );

    case "historial":
      return (
        <svg {...commonProps}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "reportes":
      return (
        <svg {...commonProps}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );

    case "configuracion":
    default:
      return (
        <svg {...commonProps}>
          <circle
            cx="12"
            cy="12"
            r="3"
          />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.3.3.5.7.6 1.1h1v4h-1a1.7 1.7 0 0 0-.6.9z" />
        </svg>
      );
  }
}

export default function Sidebar({
  role,
}: SidebarProps) {
  const pathname =
    usePathname() ?? "";
  const navigation =
    getNavigationByRole(role);
  const isTeacher =
    role === "DOCENTE";

  const desktopSidebarClass =
    isTeacher
      ? "fixed bottom-0 left-0 top-[96px] z-30 hidden w-[92px] flex-col border-r border-white/10 bg-unsaac-sidebar text-white shadow-[8px_0_30px_rgba(15,23,42,0.08)] md:flex xl:top-[108px] xl:w-[300px]"
      : "fixed bottom-0 left-0 top-[108px] z-30 flex w-[300px] flex-col border-r border-white/10 bg-unsaac-sidebar text-white shadow-[8px_0_30px_rgba(15,23,42,0.08)]";

  return (
    <>
      <aside
        className={
          desktopSidebarClass
        }
      >
        <div
          className={
            isTeacher
              ? "hidden px-6 pb-4 pt-7 xl:block"
              : "px-6 pb-4 pt-7"
          }
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-200/70">
            Menu principal
          </p>

          <p className="mt-1 text-sm font-bold text-white">
            {ROLE_LABELS[role]}
          </p>
        </div>

        <nav
          aria-label={`Navegacion de ${ROLE_LABELS[role]}`}
          className={
            isTeacher
              ? "flex-1 space-y-2 overflow-y-auto px-3 pb-6 pt-4 xl:px-4 xl:pt-0"
              : "flex-1 space-y-2 overflow-y-auto px-4 pb-6"
          }
        >
          {navigation.map(
            (item) => {
              const current =
                isRouteActive(
                  pathname,
                  item.href
                );
              const available =
                (
                  item as {
                    available?: boolean;
                  }
                ).available !==
                false;

              const content = (
                <>
                  {current && (
                    <span
                      className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-unsaac-orange"
                      aria-hidden="true"
                    />
                  )}

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition duration-200 ${
                      current
                        ? "bg-blue-50 text-unsaac-blue"
                        : "bg-white/10 text-blue-100 group-hover:bg-white/15 group-hover:text-white"
                    }`}
                  >
                    <NavigationIconComponent
                      icon={String(
                        item.icon
                      )}
                    />
                  </span>

                  <span
                    className={
                      isTeacher
                        ? "hidden min-w-0 xl:block"
                        : "min-w-0"
                    }
                  >
                    <span className="block truncate text-sm font-extrabold">
                      {item.label}
                    </span>

                    <span
                      className={`mt-0.5 block truncate text-[11px] font-semibold ${
                        current
                          ? "text-slate-500"
                          : "text-blue-200/70 group-hover:text-blue-100"
                      }`}
                    >
                      {
                        item.description
                      }
                    </span>
                  </span>
                </>
              );

              const className = `group relative flex min-h-[58px] items-center overflow-hidden rounded-2xl py-3 transition duration-200 ${
                isTeacher
                  ? "justify-center px-2 xl:justify-start xl:gap-4 xl:px-4"
                  : "gap-4 px-4"
              } ${
                current
                  ? "bg-white text-unsaac-primary shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                  : available
                    ? "text-blue-100 hover:bg-white/10 hover:text-white"
                    : "cursor-not-allowed text-blue-200/35"
              }`;

              if (!available) {
                return (
                  <span
                    key={item.key}
                    title={`${item.label}: proximo modulo`}
                    aria-disabled="true"
                    className={
                      className
                    }
                  >
                    {content}
                  </span>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={
                    item.description
                  }
                  aria-current={
                    current
                      ? "page"
                      : undefined
                  }
                  className={
                    className
                  }
                >
                  {content}
                </Link>
              );
            }
          )}
        </nav>

        <div
          className={
            isTeacher
              ? "border-t border-white/10 p-3 xl:p-5"
              : "border-t border-white/10 p-5"
          }
        >
          <div
            className={
              isTeacher
                ? "rounded-2xl border border-white/10 bg-white/5 px-3 py-4 xl:px-4"
                : "rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
            }
          >
            <div
              className={
                isTeacher
                  ? "flex items-center justify-center gap-3 xl:justify-start"
                  : "flex items-center gap-3"
              }
            >
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300" />
              </span>

              <div
                className={
                  isTeacher
                    ? "hidden xl:block"
                    : ""
                }
              >
                <p className="text-xs font-extrabold text-white">
                  Sesion activa
                </p>

                <p className="mt-1 text-[11px] font-semibold text-blue-200/70">
                  Acceso como{" "}
                  {
                    ROLE_LABELS[
                      role
                    ]
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isTeacher && (
        <nav
          aria-label="Navegacion movil del Docente"
          className="fixed inset-x-0 bottom-0 z-50 flex min-h-[76px] items-stretch gap-1 overflow-x-auto border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
          style={{
            paddingBottom:
              "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          {navigation.map(
            (item) => {
              const current =
                isRouteActive(
                  pathname,
                  item.href
                );
              const available =
                (
                  item as {
                    available?: boolean;
                  }
                ).available !==
                false;

              const content = (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      current
                        ? "bg-blue-100 text-unsaac-blue"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <NavigationIconComponent
                      icon={String(
                        item.icon
                      )}
                    />
                  </span>

                  <span className="max-w-[72px] truncate text-[10px] font-extrabold leading-tight">
                    {item.label}
                  </span>
                </>
              );

              const className = `relative flex min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 ${
                current
                  ? "bg-blue-50 text-unsaac-primary"
                  : available
                    ? "text-slate-600"
                    : "cursor-not-allowed opacity-40"
              }`;

              if (!available) {
                return (
                  <span
                    key={item.key}
                    aria-disabled="true"
                    className={
                      className
                    }
                  >
                    {content}
                  </span>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={
                    current
                      ? "page"
                      : undefined
                  }
                  className={
                    className
                  }
                >
                  {content}
                </Link>
              );
            }
          )}
        </nav>
      )}
    </>
  );
}
