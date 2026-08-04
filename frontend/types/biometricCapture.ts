export type CaptureStage =
  | "ready"
  | "capturing"
  | "review"
  | "completed"
  | "error";

export type FingerCode =
  | "PULGAR_DERECHO"
  | "INDICE_DERECHO"
  | "MEDIO_DERECHO"
  | "ANULAR_DERECHO"
  | "MENIQUE_DERECHO"
  | "PULGAR_IZQUIERDO"
  | "INDICE_IZQUIERDO"
  | "MEDIO_IZQUIERDO"
  | "ANULAR_IZQUIERDO"
  | "MENIQUE_IZQUIERDO";

export type BiometricCaptureStatus =
  | "Registrado"
  | "Pendiente"
  | "En proceso";

export interface CaptureTeacher {
  id: number;
  codigo: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  facultad: string;
  departamento: string;
  categoria: string;
  estadoBiometrico: BiometricCaptureStatus;
  huellasRegistradas: number;
  totalHuellas: number;
}

export interface FingerOption {
  code: FingerCode;
  label: string;
  shortLabel: string;
  hand: "Derecha" | "Izquierda";
}

export interface CaptureReader {
  id: number;
  codigo: string;
  nombre: string;
  modelo: string;
  ubicacion: string;
  conectado: boolean;
  calidadConexion: number;
  ultimaActividad: string;
}

export interface FingerprintCapture {
  id: number;
  docenteId: number;
  docente: string;
  codigoDocente: string;
  finger: FingerCode;
  fingerLabel: string;
  quality: number;
  qualityLabel:
    | "Excelente"
    | "Buena"
    | "Regular"
    | "Deficiente";
  fecha: string;
  hora: string;
  dispositivo: string;
  resultado:
    | "Registrado"
    | "Repetir";
}