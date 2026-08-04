/** Rol normalizado utilizado por la sesión y la navegación. */
export type UserRole =
  | "ADMINISTRADOR"
  | "DOCENTE"
  | "SUPERVISOR";

/** Usuario mínimo almacenado en la sesión. */
export interface UsuarioActivo {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
}

export type UsuarioRol =
  | "Administrador"
  | "Docente"
  | "Supervisor";

export type UsuarioRolId = number;

export interface RolSistema {
  id: UsuarioRolId;
  nombre: UsuarioRol;
  descripcion: string;
  totalUsuarios?: number;
  usuariosActivos?: number;
}

export interface Usuario {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  rolId: UsuarioRolId;
  rol: UsuarioRol;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  docenteId?: number | null;
}

export interface UsuarioFormValues {
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  rolId: UsuarioRolId;
  activo: boolean;
  password: string;
}
