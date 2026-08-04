export type SynchronizationStatus =
  | "Sincronizado"
  | "Pendiente"
  | "Fallido"
  | "Sincronizando";

export type SynchronizationEventType =
  | "Entrada"
  | "Salida"
  | "Captura"
  | "Actualización";

export interface BiometricSynchronizationRecord {
  id: number;
  codigo: string;
  docente: string;
  codigoDocente: string;
  dispositivo: string;
  evento: SynchronizationEventType;
  fechaLocal: string;
  horaLocal: string;
  estado: SynchronizationStatus;
  intentos: number;
  sincronizadoEn: string | null;
  observacion: string;
}

export interface SynchronizationDevice {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string;
  conectado: boolean;
  pendientes: number;
  ultimaSincronizacion: string;
}