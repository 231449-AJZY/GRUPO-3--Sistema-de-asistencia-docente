"use client";

import { getToken } from "@/lib/auth";

import type {
  BleConfiguration,
  BleDepartmentOption,
  BleSecurityEvent,
  BleStation,
  BleStationsDashboard,
  BleStationState,
  BleStationSummary,
  BleStationType,
  CreateBleStationInput,
  GeneratedBleProvisioning,
} from "@/types/bleStation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface BackendStation {
  id: number | string;
  uuid: string;
  codigo: string;
  nombre: string;
  tipo: BleStationType;
  departamento_id?: number | string | null;
  departamento?: string | null;
  aula?: string | null;
  rssi_minimo: number | string;
  muestras_minimas: number | string;
  intervalo_rotacion_seg: number | string;
  estado: BleStationState;
  motivo_estado?: string | null;
  provisionada_en?: string | null;
  ultima_deteccion_en?: string | null;
  ultima_deteccion_rssi?: number | string | null;
  detecciones_hoy?: number | string | null;
  creada_en: string;
  actualizada_en: string;
  creada_por_nombre?: string | null;
  provisionada_por_nombre?: string | null;
}

interface BackendDepartment {
  id: number | string;
  codigo: string;
  nombre: string;
}

interface BackendEvent {
  id: number | string;
  estacion_id?: number | string | null;
  tipo: string;
  resultado: string;
  detalle?: Record<string, unknown> | null;
  creado_en: string;
  estacion_codigo?: string | null;
  estacion_nombre?: string | null;
  actor?: string | null;
}

interface DashboardResponse {
  estaciones: BackendStation[];
  departamentos: BackendDepartment[];
  configuracion: {
    intervalo_rotacion_seg: number | string;
    margen_slots: number | string;
    requerir_en_curso: boolean;
    requerir_en_ingreso: boolean;
    rssi_minimo_default: number | string;
    muestras_minimas_default: number | string;
  };
  resumen: {
    total: number | string;
    pendiente: number | string;
    activa: number | string;
    suspendida: number | string;
    revocada: number | string;
    detecciones_hoy: number | string;
  };
  eventos: BackendEvent[];
}

interface ProvisionResponse {
  provisionamiento: {
    id: string;
    estacion_id: number | string;
    estacion_codigo: string;
    estacion_nombre: string;
    expira_en: string;
    vigencia_minutos: number | string;
    qr_payload: string;
    qr_image: string;
  };
}

interface OperationResponse {
  mensaje?: string;
  error?: string;
  fields?: Record<string, string>;
}

export class BleStationsApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "BleStationsApiError";
    this.status = status;
    this.fields = fields;
  }
}

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new BleStationsApiError("No existe una sesión válida.", 401);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | OperationResponse
    | null;

  if (!response.ok) {
    const operation = data as OperationResponse | null;
    throw new BleStationsApiError(
      operation?.error ?? "La operación Bluetooth no pudo completarse.",
      response.status,
      operation?.fields
    );
  }

  return data as T;
}

function mapStation(value: BackendStation): BleStation {
  return {
    id: toNumber(value.id),
    uuid: value.uuid,
    code: value.codigo,
    name: value.nombre,
    type: value.tipo,
    departmentId: value.departamento_id
      ? toNumber(value.departamento_id)
      : null,
    department: value.departamento ?? null,
    classroom: value.aula ?? null,
    minimumRssi: toNumber(value.rssi_minimo),
    minimumSamples: toNumber(value.muestras_minimas),
    rotationSeconds: toNumber(value.intervalo_rotacion_seg),
    state: value.estado,
    stateReason: value.motivo_estado ?? null,
    provisionedAt: value.provisionada_en ?? null,
    lastDetectionAt: value.ultima_deteccion_en ?? null,
    lastDetectionRssi:
      value.ultima_deteccion_rssi === null ||
      value.ultima_deteccion_rssi === undefined
        ? null
        : toNumber(value.ultima_deteccion_rssi),
    detectionsToday: toNumber(value.detecciones_hoy),
    createdAt: value.creada_en,
    updatedAt: value.actualizada_en,
    createdByName: value.creada_por_nombre ?? null,
    provisionedByName: value.provisionada_por_nombre ?? null,
  };
}

function mapDepartment(value: BackendDepartment): BleDepartmentOption {
  return {
    id: toNumber(value.id),
    code: value.codigo,
    name: value.nombre,
  };
}

function mapEvent(value: BackendEvent): BleSecurityEvent {
  return {
    id: toNumber(value.id),
    stationId: value.estacion_id ? toNumber(value.estacion_id) : null,
    type: value.tipo,
    result: value.resultado,
    detail: value.detalle ?? {},
    createdAt: value.creado_en,
    stationCode: value.estacion_codigo ?? null,
    stationName: value.estacion_nombre ?? null,
    actor: value.actor ?? null,
  };
}

function mapConfiguration(
  value: DashboardResponse["configuracion"]
): BleConfiguration {
  return {
    rotationSeconds: toNumber(value.intervalo_rotacion_seg),
    slotMargin: toNumber(value.margen_slots),
    requiredForCourse: value.requerir_en_curso,
    requiredForEntry: value.requerir_en_ingreso,
    defaultMinimumRssi: toNumber(value.rssi_minimo_default),
    defaultMinimumSamples: toNumber(value.muestras_minimas_default),
  };
}

function mapSummary(value: DashboardResponse["resumen"]): BleStationSummary {
  return {
    total: toNumber(value.total),
    pending: toNumber(value.pendiente),
    active: toNumber(value.activa),
    suspended: toNumber(value.suspendida),
    revoked: toNumber(value.revocada),
    detectionsToday: toNumber(value.detecciones_hoy),
  };
}

export async function getBleStationsDashboard(): Promise<BleStationsDashboard> {
  const data = await request<DashboardResponse>(
    "/estaciones-ble/dashboard"
  );

  return {
    stations: data.estaciones.map(mapStation),
    departments: data.departamentos.map(mapDepartment),
    configuration: mapConfiguration(data.configuracion),
    summary: mapSummary(data.resumen),
    events: data.eventos.map(mapEvent),
  };
}

export async function createBleStation(
  input: CreateBleStationInput
): Promise<string> {
  const data = await request<OperationResponse>("/estaciones-ble", {
    method: "POST",
    body: JSON.stringify({
      codigo: input.code.trim().toUpperCase(),
      nombre: input.name.trim(),
      tipo: input.type,
      departamento_id: input.departmentId,
      aula: input.classroom.trim(),
      rssi_minimo: input.minimumRssi,
      muestras_minimas: input.minimumSamples,
      intervalo_rotacion_seg: input.rotationSeconds,
    }),
  });

  return data.mensaje ?? "Estación creada.";
}

export async function generateBleProvisioning(
  stationId: number
): Promise<GeneratedBleProvisioning> {
  const data = await request<ProvisionResponse>(
    `/estaciones-ble/${stationId}/provisionamiento`,
    {
      method: "POST",
      body: "{}",
    }
  );
  const value = data.provisionamiento;

  return {
    id: value.id,
    stationId: toNumber(value.estacion_id),
    stationCode: value.estacion_codigo,
    stationName: value.estacion_nombre,
    expiresAt: value.expira_en,
    validityMinutes: toNumber(value.vigencia_minutos),
    qrPayload: value.qr_payload,
    qrImage: value.qr_image,
  };
}

export async function transitionBleStation(
  stationId: number,
  action: "suspender" | "reactivar" | "revocar",
  reason = ""
): Promise<string> {
  const revoke = action === "revocar";
  const data = await request<OperationResponse>(
    revoke
      ? `/estaciones-ble/${stationId}`
      : `/estaciones-ble/${stationId}/${action}`,
    {
      method: revoke ? "DELETE" : "PATCH",
      body: JSON.stringify({ motivo: reason }),
    }
  );

  return data.mensaje ?? "Estado actualizado.";
}
