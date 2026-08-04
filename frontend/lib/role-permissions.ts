import type {
  RoleName,
  RoleTone,
  SystemPermission,
} from "@/types/rol";

export const systemPermissions: SystemPermission[] = [
  {
    id: "dashboard.view",
    module: "Panel principal",
    action: "Consultar",
    description:
      "Visualizar indicadores y el resumen institucional.",
  },
  {
    id: "users.manage",
    module: "Usuarios",
    action: "Administrar",
    description:
      "Crear, editar, activar, desactivar y asignar roles a las cuentas.",
  },
  {
    id: "roles.manage",
    module: "Roles",
    action: "Administrar",
    description:
      "Consultar los roles oficiales y asignarlos a los usuarios.",
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

interface RolePresentation {
  code: string;
  tone: RoleTone;
  permissionIds: string[];
}

const ROLE_PRESENTATION: Record<RoleName, RolePresentation> = {
  Administrador: {
    code: "ROL-ADMIN",
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
  Docente: {
    code: "ROL-DOCENTE",
    tone: "green",
    permissionIds: [
      "dashboard.view",
      "attendance.self",
    ],
  },
  Supervisor: {
    code: "ROL-SUPERVISOR",
    tone: "orange",
    permissionIds: [
      "dashboard.view",
      "attendance.monitor",
      "reports.view",
    ],
  },
};

export function getRolePresentation(
  roleName: RoleName
): RolePresentation {
  return ROLE_PRESENTATION[roleName];
}
