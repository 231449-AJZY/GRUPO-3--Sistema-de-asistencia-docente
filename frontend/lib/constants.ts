import type { UsuarioActivo } from "@/types/usuario";

export const APP_NAME = "Control de Asistencia Docente";

export const MOCK_ADMIN: UsuarioActivo = {
  id: 1,
  nombre: "Administrador",
  correo: "admin@unsaac.edu.pe",
  rol: "ADMINISTRADOR",
};

export const MOCK_DOCENTE: UsuarioActivo = {
  id: 2,
  nombre: "Dra. Mariela Quispe",
  correo: "mquispe@unsaac.edu.pe",
  rol: "DOCENTE",
};

export const MOCK_SUPERVISOR: UsuarioActivo = {
  id: 3,
  nombre: "Lic. Ana Quispe Vargas",
  correo: "aquispe@unsaac.edu.pe",
  rol: "SUPERVISOR",
};