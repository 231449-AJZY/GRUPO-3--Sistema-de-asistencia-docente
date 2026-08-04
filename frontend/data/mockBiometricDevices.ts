import type {
  BiometricDevice,
  LegacyBiometricDevice,
} from "@/types/biometricDevice";

export const initialBiometricDevices: BiometricDevice[] = [
  {
    id: 1,
    code: "BIO-001",
    name: "Lector biométrico principal",
    manufacturer: "ZKTeco",
    model: "SpeedFace-V5L",
    serialNumber: "ZK-SFV5L-2026-001",
    location: "Puerta principal - Facultad",
    ipAddress: "192.168.1.101",
    port: 4370,
    macAddress: "00:1A:2B:3C:4D:01",
    firmwareVersion: "Ver 7.8.2",
    status: "connected",
    signalPercentage: 96,
    lastActivityAt: "2026-07-15T20:02:18",
    lastSynchronizationAt: "2026-07-15T19:58:42",
    lastDiagnosticAt: "2026-07-15T17:30:00",
    pendingRecords: 0,
    registeredTemplates: 126,
    automaticSync: true,
    active: true,
    message: "Conectado y funcionando correctamente.",
  },
  {
    id: 2,
    code: "BIO-002",
    name: "Lector biométrico laboratorio",
    manufacturer: "Hikvision",
    model: "DS-K1T341",
    serialNumber: "HK-K1T341-2026-017",
    location: "Laboratorio de cómputo 02",
    ipAddress: "192.168.1.102",
    port: 8000,
    macAddress: "00:1A:2B:3C:4D:02",
    firmwareVersion: "V3.5.1",
    status: "connected",
    signalPercentage: 82,
    lastActivityAt: "2026-07-15T19:56:31",
    lastSynchronizationAt: "2026-07-15T19:45:10",
    lastDiagnosticAt: "2026-07-15T17:35:00",
    pendingRecords: 7,
    registeredTemplates: 98,
    automaticSync: true,
    active: true,
    message: "Operativo con registros pendientes de sincronización.",
  },
  {
    id: 3,
    code: "BIO-003",
    name: "Lector biométrico administrativo",
    manufacturer: "Suprema",
    model: "BioStation 2",
    serialNumber: "SUP-BS2-2026-009",
    location: "Oficina administrativa",
    ipAddress: "192.168.1.103",
    port: 51211,
    macAddress: "00:1A:2B:3C:4D:03",
    firmwareVersion: "1.9.4",
    status: "warning",
    signalPercentage: 42,
    lastActivityAt: "2026-07-15T18:21:08",
    lastSynchronizationAt: "2026-07-15T17:50:24",
    lastDiagnosticAt: "2026-07-15T17:40:00",
    pendingRecords: 18,
    registeredTemplates: 74,
    automaticSync: false,
    active: true,
    message: "Conectividad inestable. Se recomienda revisar la red.",
  },
];

export function cloneBiometricDevices() {
  return initialBiometricDevices.map(
    (device) => ({
      ...device,
    })
  );
}

/*
 * Adaptador para componentes antiguos que todav?a utilizan
 * nombres de propiedades en espa?ol.
 *
 * La p?gina moderna de dispositivos contin?a utilizando:
 * initialBiometricDevices y cloneBiometricDevices.
 */

/*
 * Adaptador para el dashboard y los componentes antiguos.
 * La implementaci?n moderna contin?a utilizando
 * initialBiometricDevices y cloneBiometricDevices.
 */
export const mockBiometricDevices:
  LegacyBiometricDevice[] =
  initialBiometricDevices.map(
    (device) => {
      const estado:
        LegacyBiometricDevice["estado"] =
        device.status === "connected"
          ? "Conectado"
          : device.status === "warning"
            ? "Advertencia"
            : device.status === "maintenance"
              ? "Mantenimiento"
              : "Desconectado";

      const conectado =
        device.status === "connected";

      const requiereAtencion =
        device.status === "warning" ||
        device.status === "disconnected";

      return {
        id: device.id,

        codigo: device.code,
        nombre: device.name,
        fabricante: device.manufacturer,
        modelo: device.model,

        numeroSerie:
          device.serialNumber,

        serial:
          device.serialNumber,

        ubicacion:
          device.location,

        direccionIp:
          device.ipAddress,

        ipAddress:
          device.ipAddress,

        ip:
          device.ipAddress,

        puerto:
          device.port,

        direccionMac:
          device.macAddress,

        macAddress:
          device.macAddress,

        versionFirmware:
          device.firmwareVersion,

        firmware:
          device.firmwareVersion,

        estado,
        estadoConexion: estado,

        conectado,
        requiereAtencion,

        senal:
          device.signalPercentage,

        porcentajeSenal:
          device.signalPercentage,

        nivelSenal:
          device.signalPercentage,

        ultimaActividad:
          device.lastActivityAt,

        ultimaConexion:
          device.lastActivityAt,

        ultimaComunicacion:
          device.lastActivityAt,

        ultimaSincronizacion:
          device.lastSynchronizationAt,

        ultimoDiagnostico:
          device.lastDiagnosticAt,

        registrosPendientes:
          device.pendingRecords,

        /*
         * Valor simulado para la tarjeta legacy.
         */
        registrosHoy:
          Math.max(
            0,
            device.registeredTemplates -
              device.pendingRecords
          ),

        totalRegistros:
          device.pendingRecords,

        huellasRegistradas:
          device.registeredTemplates,

        plantillasRegistradas:
          device.registeredTemplates,

        sincronizacionAutomatica:
          device.automaticSync,

        activo:
          device.active,

        mensaje:
          device.message,
      };
    }
  );

export type {
  LegacyBiometricDevice,
} from "@/types/biometricDevice";

