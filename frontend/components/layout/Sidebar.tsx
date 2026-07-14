"use client";

import Link from "next/link";
import type { UserRole } from "@/types/usuario";

interface SidebarProps {
  role: UserRole;
  active?: string;
}

interface MenuItem {
  label: string;
  key: string;
  href: string;
}

const menuByRole: Record<UserRole, MenuItem[]> = {
  ADMINISTRADOR: [
    { label: "Dashboard", key: "dashboard", href: "/Admin/dashboard" },
    { label: "Docentes", key: "docentes", href: "/Admin/docentes" },
    { label: "Biometría", key: "biometria", href: "/Admin/biometria" },
    { label: "Usuarios", key: "usuarios", href: "/Admin/usuarios" },
    { label: "Roles", key: "roles", href: "/Admin/roles" },
    {
      label: "Configuración",
      key: "configuracion",
      href: "/Admin/configuracion",
    },
  ],

  DOCENTE: [
    { label: "Dashboard", key: "dashboard", href: "/login/PanelDocente" },
    { label: "Ingreso institucional", key: "ingreso", href: "/login/PanelDocente/asistencia/ingreso" },
    { label: "Asistencia a cursos", key: "asistencia", href: "/login/PanelDocente/asistencia" },
    { label: "Historial", key: "historial", href: "/login/PanelDocente/asistencia/historial" },
    { label: "Tardanzas", key: "tardanzas", href: "/docente/tardanzas" },
    { label: "Inasistencias", key: "inasistencias", href: "/docente/inasistencias" },
    { label: "Calendario", key: "calendario", href: "/docente/calendario" },
    { label: "Horarios", key: "horarios", href: "/docente/horarios" },
  ],

  SUPERVISOR: [
    { label: "Dashboard", key: "dashboard", href: "/login/PanelSupervisor" },
    { label: "Tiempo real", key: "monitoreo", href: "/supervisor/monitoreo" },
    {
      label: "Inconsistencias",
      key: "inconsistencias",
      href: "/supervisor/inconsistencias",
    },
    { label: "Alertas", key: "alertas", href: "/supervisor/alertas" },
    { label: "Consultas", key: "consultas", href: "/supervisor/consultas" },
    { label: "Historial", key: "historial", href: "/supervisor/historial" },
    { label: "Reportes", key: "reportes", href: "/supervisor/reportes" },
  ],
};

export default function Sidebar({ role, active = "dashboard" }: SidebarProps) {
  const items = menuByRole[role];

  return (
    <aside className="fixed left-0 top-[108px] z-30 h-[calc(100vh-108px)] w-[300px] bg-gradient-to-b from-unsaac-sidebar to-unsaac-primary px-3 py-8 text-white">
      <p className="mb-6 px-7 text-xs font-extrabold tracking-[0.18em] text-blue-100">
        MÓDULO {role}
      </p>

      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex h-[52px] w-full items-center gap-4 rounded-xl px-5 text-left text-[15px] font-bold transition ${
                isActive
                  ? "bg-unsaac-orange text-white shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-white" : "bg-white/50"
                }`}
              />

              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-extrabold">UNSAAC</p>
        <p className="mt-1 text-xs font-semibold text-blue-100">
          Sistema de Control de Asistencia Biométrica
        </p>
      </div>
    </aside>
  );
}