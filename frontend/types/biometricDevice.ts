export type BiometricDeviceStatus =
  | "connected"
  | "disconnected"
  | "warning"
  | "maintenance";

export interface BiometricDevice {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  ipAddress: string;
  port: number;
  macAddress: string;
  firmwareVersion: string;
  status: BiometricDeviceStatus;
  signalPercentage: number;
  lastActivityAt: string | null;
  lastSynchronizationAt: string | null;
  lastDiagnosticAt: string | null;
  pendingRecords: number;
  registeredTemplates: number;
  automaticSync: boolean;
  active: boolean;
  message: string;
}

export interface BiometricDeviceDiagnostic {
  id: string;
  label: string;
  description: string;
  status: "success" | "warning" | "error";
}

/*
 * Contrato de compatibilidad para los componentes biom?tricos
 * antiguos que todav?a utilizan propiedades en espa?ol.
 */
export type LegacyBiometricDeviceStatus =
  | "Advertencia"
  | "Conectado"
  | "Desconectado"
  | "Mantenimiento"
  | "Reiniciando";

export interface LegacyBiometricDevice {
  id: number;

  codigo: string;
  nombre: string;
  fabricante: string;
  modelo: string;

  numeroSerie: string;
  serial: string;

  ubicacion: string;

  direccionIp: string;
  ipAddress: string;
  ip: string;

  puerto: number;

  direccionMac: string;
  macAddress: string;

  versionFirmware: string;
  firmware: string;

  estado: LegacyBiometricDeviceStatus;
  estadoConexion: LegacyBiometricDeviceStatus;

  conectado: boolean;
  requiereAtencion: boolean;

  senal: number;
  porcentajeSenal: number;
  nivelSenal: number;

  ultimaActividad: string | null;
  ultimaConexion: string | null;
  ultimaComunicacion: string | null;
  ultimaSincronizacion: string | null;
  ultimoDiagnostico: string | null;

  registrosPendientes: number;
  registrosHoy: number;
  totalRegistros: number;

  huellasRegistradas: number;
  plantillasRegistradas: number;

  sincronizacionAutomatica: boolean;
  activo: boolean;
  mensaje: string;

  [key: string]:
    | string
    | number
    | boolean
    | null;
}
