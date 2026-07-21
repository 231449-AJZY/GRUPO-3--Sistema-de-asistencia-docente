"use client";

import Link from "next/link";
import type { UserRole } from "@/types/usuario";

interface SidebarProps {
  role: UserRole;
  active?: string;
}

interface MenuItem {
  label: string;
  description: string;
  key: string;
  href: string;
  iconName: string;
}

const menuByRole: Record<UserRole, MenuItem[]> = {
  ADMINISTRADOR: [
    {
      label: "Dashboard",
      description: "Resumen general del sistema",
      key: "dashboard",
      href: "/Admin/dashboard",
      iconName: "dashboard",
    },
    {
      label: "Docentes",
      description: "Administración de docentes",
      key: "docentes",
      href: "/Admin/docentes",
      iconName: "user",
    },
    {
      label: "Biometría",
      description: "Registro y control biométrico",
      key: "biometria",
      href: "/Admin/biometria",
      iconName: "fingerprint",
    },
    {
      label: "Usuarios",
      description: "Administración de usuarios",
      key: "usuarios",
      href: "/Admin/usuarios",
      iconName: "users",
    },
    {
      label: "Roles",
      description: "Roles y permisos del sistema",
      key: "roles",
      href: "/Admin/roles",
      iconName: "shield-check",
    },
    {
      label: "Horarios",
      description: "Gestión académica y horarios",
      key: "horarios",
      href: "/Admin/configuracion", // or horarios route
      iconName: "calendar",
    },
    {
      label: "Configuración",
      description: "Configuración general",
      key: "configuracion",
      href: "/Admin/configuracion",
      iconName: "settings",
    },
  ],

  DOCENTE: [
    {
      label: "Dashboard",
      description: "Resumen general de asistencia",
      key: "dashboard",
      href: "/login/PanelDocente",
      iconName: "dashboard",
    },
    {
      label: "Ingreso institucional",
      description: "Marcación biométrica de entrada",
      key: "ingreso",
      href: "/login/PanelDocente/asistencia/ingreso",
      iconName: "fingerprint",
    },
    {
      label: "Asistencia a cursos",
      description: "Marcación por sesión académica",
      key: "asistencia",
      href: "/login/PanelDocente/asistencia",
      iconName: "calendar",
    },
    {
      label: "Historial",
      description: "Historial de asistencias",
      key: "historial",
      href: "/login/PanelDocente/asistencia/historial",
      iconName: "clock",
    },
    {
      label: "Tardanzas",
      description: "Registro de tardanzas",
      key: "tardanzas",
      href: "/docente/tardanzas",
      iconName: "warning",
    },
    {
      label: "Inasistencias",
      description: "Inasistencias registradas",
      key: "inasistencias",
      href: "/docente/inasistencias",
      iconName: "warning",
    },
    {
      label: "Calendario",
      description: "Calendario académico",
      key: "calendario",
      href: "/docente/calendario",
      iconName: "calendar",
    },
    {
      label: "Horarios",
      description: "Horarios asignados",
      key: "horarios",
      href: "/docente/horarios",
      iconName: "clock",
    },
  ],

  SUPERVISOR: [
    {
      label: "Dashboard",
      description: "Panel de supervisión en tiempo real",
      key: "dashboard",
      href: "/login/PanelSupervisor",
      iconName: "dashboard",
    },
    {
      label: "Tiempo real",
      description: "Monitoreo en tiempo real",
      key: "monitoreo",
      href: "/supervisor/monitoreo",
      iconName: "eye",
    },
    {
      label: "Inconsistencias",
      description: "Registro de inconsistencias",
      key: "inconsistencias",
      href: "/supervisor/inconsistencias",
      iconName: "warning",
    },
    {
      label: "Alertas",
      description: "Gestión de alertas",
      key: "alertas",
      href: "/supervisor/alertas",
      iconName: "bell",
    },
    {
      label: "Consultas",
      description: "Búsqueda y filtros",
      key: "consultas",
      href: "/supervisor/consultas",
      iconName: "search",
    },
    {
      label: "Historial",
      description: "Historial completo",
      key: "historial",
      href: "/supervisor/historial",
      iconName: "clock",
    },
    {
      label: "Reportes",
      description: "Reportes institucionales",
      key: "reportes",
      href: "/supervisor/reportes",
      iconName: "file-text",
    },
  ],
};

export default function Sidebar({ role, active = "dashboard" }: SidebarProps) {
  const normalizedRole = (role || "").toUpperCase() as UserRole;
  const items = menuByRole[normalizedRole] || menuByRole.ADMINISTRADOR;

  const formattedRole =
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  return (
    <aside className="fixed left-0 top-[108px] z-30 flex h-[calc(100vh-108px)] w-[300px] flex-col justify-between bg-gradient-to-b from-unsaac-sidebar to-unsaac-primary px-4 py-6 text-white overflow-y-auto scrollbar-none">
      <div>
        {/* Header section */}
        <div className="mb-6 px-3">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300/80">
            Menú principal
          </p>
          <h2 className="mt-0.5 text-lg font-black text-white">
            {formattedRole}
          </h2>
        </div>

        {/* Navigation list */}
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = item.key === active;

            if (isActive) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group relative flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-lg transition-all duration-200"
                >
                  {/* Left Orange Accent Indicator */}
                  <div className="absolute left-1.5 h-8 w-1.5 rounded-full bg-unsaac-orange" />

                  {/* Icon Container */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ml-2 border border-blue-100/50">
                    <SidebarIcon name={item.iconName} />
                  </div>

                  {/* Text content */}
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-sm font-extrabold leading-snug text-unsaac-text truncate">
                      {item.label}
                    </p>
                    <p className="text-[11px] font-bold leading-tight text-unsaac-muted truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center gap-3.5 rounded-2xl p-3 text-white/90 transition-all duration-200 hover:bg-white/10"
              >
                {/* Icon Container */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/5 transition-colors group-hover:bg-white/15">
                  <SidebarIcon name={item.iconName} />
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-sm font-extrabold leading-snug text-white truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] font-semibold leading-tight text-blue-100/70 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Active Session Footer Card */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-snug text-white">
              Sesión activa
            </p>
            <p className="text-[11px] font-semibold text-blue-100/80 truncate mt-0.5">
              Acceso como {formattedRole}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarIcon({ name }: { name: string }) {
  if (name === "dashboard") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "fingerprint") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a5 5 0 00-10 0c0 1.2.16 2.365.458 3.477m0 0a3 3 0 004.108 4.108m3.44-2.04a5 5 0 0110 0c0 1.2-.16 2.365-.458 3.477m0 0a3 3 0 00-4.1 4.1" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6" />
      </svg>
    );
  }

  if (name === "shield-check") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 11 2 2 4-4" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.3 4 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 4a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}