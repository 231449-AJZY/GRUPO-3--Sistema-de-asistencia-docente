import type {
  BiometricSynchronizationRecord,
  SynchronizationDevice,
} from "@/types/biometricSynchronization";

export const synchronizationDevices: SynchronizationDevice[] = [
  {
    id: 1,
    codigo: "BIO-001",
    nombre: "Lector biométrico principal",
    ubicacion: "Pabellón de Ingeniería",
    conectado: true,
    pendientes: 3,
    ultimaSincronizacion:
      "Hoy, 12:46:18",
  },
  {
    id: 2,
    codigo: "BIO-002",
    nombre: "Lector biométrico secundario",
    ubicacion: "Facultad de Educación",
    conectado: true,
    pendientes: 2,
    ultimaSincronizacion:
      "Hoy, 11:58:03",
  },
  {
    id: 3,
    codigo: "BIO-003",
    nombre: "Lector de contingencia",
    ubicacion: "Oficina administrativa",
    conectado: false,
    pendientes: 2,
    ultimaSincronizacion:
      "Ayer, 18:32:44",
  },
];

export const initialSynchronizationRecords: BiometricSynchronizationRecord[] = [
  {
    id: 1,
    codigo: "SYNC-0001",
    docente: "Alberto Acosta Sullca",
    codigoDocente: "DOC-001",
    dispositivo: "BIO-001",
    evento: "Entrada",
    fechaLocal: "15/07/2026",
    horaLocal: "07:58:42",
    estado: "Sincronizado",
    intentos: 1,
    sincronizadoEn:
      "15/07/2026 08:00:03",
    observacion:
      "Registro enviado correctamente.",
  },
  {
    id: 2,
    codigo: "SYNC-0002",
    docente: "Verónica Holgado Canales",
    codigoDocente: "DOC-002",
    dispositivo: "BIO-001",
    evento: "Entrada",
    fechaLocal: "15/07/2026",
    horaLocal: "08:04:17",
    estado: "Sincronizado",
    intentos: 1,
    sincronizadoEn:
      "15/07/2026 08:05:11",
    observacion:
      "Registro enviado correctamente.",
  },
  {
    id: 3,
    codigo: "SYNC-0003",
    docente: "Miguel Ángel Valdivia Cárdenas",
    codigoDocente: "DOC-003",
    dispositivo: "BIO-002",
    evento: "Salida",
    fechaLocal: "15/07/2026",
    horaLocal: "12:15:28",
    estado: "Pendiente",
    intentos: 0,
    sincronizadoEn: null,
    observacion:
      "Registro preparado para sincronización.",
  },
  {
    id: 4,
    codigo: "SYNC-0004",
    docente: "Nelly Patricia Jiménez Chino",
    codigoDocente: "DOC-004",
    dispositivo: "BIO-002",
    evento: "Captura",
    fechaLocal: "15/07/2026",
    horaLocal: "12:24:51",
    estado: "Pendiente",
    intentos: 0,
    sincronizadoEn: null,
    observacion:
      "Esperando transferencia al sistema institucional.",
  },
  {
    id: 5,
    codigo: "SYNC-0005",
    docente: "Walter Paul Orosco Soto",
    codigoDocente: "DOC-005",
    dispositivo: "BIO-001",
    evento: "Actualización",
    fechaLocal: "15/07/2026",
    horaLocal: "12:31:06",
    estado: "Pendiente",
    intentos: 0,
    sincronizadoEn: null,
    observacion:
      "Actualización biométrica pendiente.",
  },
  {
    id: 6,
    codigo: "SYNC-0006",
    docente: "Eliana Cáceres Andía",
    codigoDocente: "DOC-006",
    dispositivo: "BIO-003",
    evento: "Entrada",
    fechaLocal: "15/07/2026",
    horaLocal: "08:12:39",
    estado: "Fallido",
    intentos: 2,
    sincronizadoEn: null,
    observacion:
      "No fue posible establecer conexión con el dispositivo.",
  },
  {
    id: 7,
    codigo: "SYNC-0007",
    docente: "Juan Carlos Arias Loayza",
    codigoDocente: "DOC-007",
    dispositivo: "BIO-003",
    evento: "Salida",
    fechaLocal: "14/07/2026",
    horaLocal: "18:03:15",
    estado: "Fallido",
    intentos: 3,
    sincronizadoEn: null,
    observacion:
      "Tiempo de espera agotado durante la transferencia.",
  },
  {
    id: 8,
    codigo: "SYNC-0008",
    docente: "Rosario Quispe Apaza",
    codigoDocente: "DOC-008",
    dispositivo: "BIO-001",
    evento: "Salida",
    fechaLocal: "15/07/2026",
    horaLocal: "13:02:44",
    estado: "Sincronizado",
    intentos: 1,
    sincronizadoEn:
      "15/07/2026 13:03:19",
    observacion:
      "Registro enviado correctamente.",
  },
];