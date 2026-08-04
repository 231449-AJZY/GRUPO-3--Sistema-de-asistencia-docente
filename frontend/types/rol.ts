export type RoleId = number;

export type RoleName =
  | "Administrador"
  | "Docente"
  | "Supervisor";

export type RoleTone =
  | "blue"
  | "green"
  | "orange";

export interface SystemPermission {
  id: string;
  module: string;
  action: string;
  description: string;
}

export interface SystemRole {
  id: RoleId;
  name: RoleName;
  code: string;
  description: string;
  userCount: number;
  activeUserCount: number;
  protected: boolean;
  tone: RoleTone;
  permissionIds: string[];
}
