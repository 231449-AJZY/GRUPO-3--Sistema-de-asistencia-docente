export type UserRole = "ADMINISTRADOR" | "DOCENTE" | "SUPERVISOR";

export interface UsuarioActivo {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
}