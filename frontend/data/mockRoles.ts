import type {
  SystemPermission,
  SystemRole,
} from "@/types/rol";

export const systemPermissions: SystemPermission[] = [
  {
    id: "dashboard.view",
    module: "Panel principal",
    action: "Consultar",
    description:
      "Visualizar indicadores y resumen institucional.",
  },
  {
    id: "users.manage",
    module: "Usuarios",
    action: "Administrar",
    description:
      "Crear, editar, activar, desactivar y eliminar usuarios.",
  },
  {
    id: "roles.manage",
    module: "Roles",
    action: "Administrar",
    description:
      "Consultar roles y asignarlos a los usuarios.",
  },
  {
    id: "teachers.manage",
    module: "Docentes",
    action: "Administrar",
    description:
      "Gestionar el perfil institucional de los docentes.",
  },
  {
    id: "biometrics.manage",
    module: "Biometría",
    action: "Administrar",
    description:
      "Gestionar capturas, dispositivos y sincronizaciones.",
  },
  {
    id: "attendance.self",
    module: "Asistencia",
    action: "Registro personal",
    description:
      "Registrar y consultar la asistencia propia.",
  },
  {
    id: "attendance.monitor",
    module: "Asistencia",
    action: "Supervisar",
    description:
      "Consultar marcaciones y cumplimiento docente.",
  },
  {
    id: "reports.view",
    module: "Reportes",
    action: "Consultar",
    description:
      "Visualizar reportes e indicadores institucionales.",
  },
  {
    id: "settings.manage",
    module: "Configuración",
    action: "Administrar",
    description:
      "Modificar parámetros generales del sistema.",
  },
];

export const systemRoles: SystemRole[] = [
  {
    id: 1,
    name: "Administrador",
    code: "ROL-ADMIN",
    description:
      "Acceso completo a la administración y configuración del sistema.",
    userCount: 1,
    activeUserCount: 1,
    protected: true,
    tone: "blue",
    permissionIds: [
      "dashboard.view",
      "users.manage",
      "roles.manage",
      "teachers.manage",
      "biometrics.manage",
      "attendance.monitor",
      "reports.view",
      "settings.manage",
    ],
  },
  {
    id: 2,
    name: "Docente",
    code: "ROL-DOCENTE",
    description:
      "Acceso al registro y consulta de la asistencia personal.",
    userCount: 5,
    activeUserCount: 3,
    protected: true,
    tone: "green",
    permissionIds: [
      "dashboard.view",
      "attendance.self",
    ],
  },
  {
    id: 3,
    name: "Supervisor",
    code: "ROL-SUPERVISOR",
    description:
      "Acceso al monitoreo, seguimiento y reportes de asistencia.",
    userCount: 2,
    activeUserCount: 2,
    protected: true,
    tone: "orange",
    permissionIds: [
      "dashboard.view",
      "attendance.monitor",
      "reports.view",
    ],
  },
];