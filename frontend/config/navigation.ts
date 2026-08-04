import type { UserRole } from "@/types/usuario";

export type NavigationIcon =
  | "dashboard"
  | "docentes"
  | "biometria"
  | "usuarios"
  | "roles"
  | "horarios"
  | "configuracion"
  | "alertas"
  | "inicio"
  | "asistencia"
  | "calendario"
  | "tardanzas"
  | "inasistencias"
  | "perfil"
  | "consultas"
  | "historial"
  | "reportes";

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  description: string;
  available?: boolean;
}

export const navigationByRole: Record<
  UserRole,
  readonly NavigationItem[]
> = {
  ADMINISTRADOR: [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: "dashboard",
      description: "Resumen general del sistema",
    },
    {
      key: "docentes",
      label: "Docentes",
      href: "/admin/docentes",
      icon: "docentes",
      description: "Administracion de docentes",
    },
    {
      key: "biometria",
      label: "Biometria",
      href: "/admin/biometria",
      icon: "biometria",
      description: "Registro y control biometrico",
    },
    {
      key: "usuarios",
      label: "Usuarios",
      href: "/admin/usuarios",
      icon: "usuarios",
      description: "Administracion de usuarios",
    },
    {
      key: "roles",
      label: "Roles",
      href: "/admin/roles",
      icon: "roles",
      description: "Roles y permisos del sistema",
    },
    {
      key: "horarios",
      label: "Horarios",
      href: "/admin/horarios",
      icon: "horarios",
      description: "Gestion academica y horarios",
    },
    {
      key: "alertas",
      label: "Alertas",
      href: "/admin/alertas",
      icon: "alertas",
      description: "Incidencias y atencion operativa",
    },
    {
      key: "configuracion",
      label: "Configuracion",
      href: "/admin/configuracion",
      icon: "configuracion",
      description: "Configuracion general",
    },
  ],

  DOCENTE: [
    {
      key: "docente-inicio",
      label: "Inicio",
      href: "/docente/dashboard",
      icon: "inicio",
      description: "Dashboard del docente",
      available: true,
    },
    {
      key: "docente-asistencia",
      label: "Mi asistencia",
      href: "/docente/asistencia",
      icon: "asistencia",
      description: "Ingreso, cursos e historial",
      available: true,
    },
        {
      key: "docente-horarios",
      label: "Mis horarios",
      href: "/docente/horarios",
      icon: "horarios",
      description: "Programacion academica personal",
      available: true,
    },
        {
      key: "docente-calendario",
      label: "Calendario",
      href: "/docente/calendario",
      icon: "calendario",
      description: "Agenda mensual por semestre",
      available: true,
    },
        {
      key: "docente-tardanzas",
      label: "Tardanzas",
      href: "/docente/tardanzas",
      icon: "tardanzas",
      description: "Consulta personal de retrasos",
      available: true,
    },
        {
      key: "docente-inasistencias",
      label: "Inasistencias",
      href: "/docente/inasistencias",
      icon: "inasistencias",
      description: "Consulta personal de ausencias",
      available: true,
    },
        {
      key: "docente-perfil",
      label: "Perfil",
      href: "/docente/perfil",
      icon: "perfil",
      description: "Identidad y vinculo academico",
      available: true,
    },
  ],

  SUPERVISOR: [
    {
      key: "supervisor-inicio",
      label: "Inicio",
      href: "/supervisor/dashboard",
      icon: "dashboard",
      description: "Panel principal de supervision",
      available: true,
    },
        {
      key: "supervisor-tiempo-real",
      label: "Tiempo real",
      href: "/supervisor/tiempo-real",
      icon: "asistencia",
      description: "Monitoreo de asistencia en vivo",
      available: true,
    },
    {
      key: "supervisor-inconsistencias",
      label: "Inconsistencias",
      href: "/supervisor/inconsistencias",
      icon: "inasistencias",
      description: "Registros que requieren revision",
      available: true,
    },
    {
      key: "supervisor-alertas",
      label: "Alertas",
      href: "/supervisor/alertas",
      icon: "alertas",
      description: "Incumplimientos y notificaciones",
      available: true,
    },
    {
      key: "supervisor-consultas",
      label: "Consultas",
      href: "/supervisor/consultas",
      icon: "consultas",
      description: "Busqueda de asistencia docente",
      available: true,
    },
    {
      key: "supervisor-historial",
      label: "Historial",
      href: "/supervisor/historial",
      icon: "historial",
      description: "Semestres y periodos anteriores",
      available: true,
    },
    {
      key: "supervisor-reportes",
      label: "Reportes",
      href: "/supervisor/reportes",
      icon: "reportes",
      description: "Reportes y exportaciones",
      available: true,
    },
  ],
};

export function getNavigationByRole(
  role: UserRole
): readonly NavigationItem[] {
  return navigationByRole[role] ?? [];
}