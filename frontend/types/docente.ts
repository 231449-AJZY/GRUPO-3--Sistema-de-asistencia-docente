export type EstadoBiometrico = "Registrado" | "Pendiente";
export type EstadoDocente = "Activo" | "En pausa" | "Inactivo";
export type CategoriaDocente = "Principal" | "Asociado" | "Auxiliar" | "Contratado";

export interface Docente {
  id: number;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  departamento: string;
  categoria: CategoriaDocente;
  estadoBiometrico: EstadoBiometrico;
  estado: EstadoDocente;
  fechaRegistro: string;
}

export interface DocenteFormData {
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  departamento: string;
  categoria: CategoriaDocente;
  estadoBiometrico: EstadoBiometrico;
  estado: EstadoDocente;
}