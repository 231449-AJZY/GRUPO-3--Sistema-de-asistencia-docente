export type BiometricHistoryResult =
  | "Exitoso"
  | "Fallido"
  | "Pendiente";

export type BiometricValidationType =
  | "Huella digital"
  | "Validación manual";

export type BiometricEventType =
  | "Entrada"
  | "Salida"
  | "Registro"
  | "Actualización";

export interface BiometricHistoryRecord {
  id: number;
  codigo: string;
  docente: string;
  codigoDocente: string;
  dni: string;
  facultad: string;
  evento: BiometricEventType;
  fechaIso: string;
  fecha: string;
  hora: string;
  tipoValidacion: BiometricValidationType;
  resultado: BiometricHistoryResult;
  dispositivo: string;
  ubicacion: string;
  calidad: number | null;
  direccionIp: string;
  observacion: string;
}