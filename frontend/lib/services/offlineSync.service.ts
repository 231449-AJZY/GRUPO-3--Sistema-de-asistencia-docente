"use client";

import { getToken } from "@/lib/auth";

import type {
  OfflineSyncBatch,
  OfflineSyncConflict,
  OfflineSyncDashboard,
  OfflineSyncRecord,
  OfflineSyncStatus,
  OfflineSyncSummary,
} from "@/types/offlineSync";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface BackendSummary {
  total: number | string;
  registradas: number | string;
  duplicadas: number | string;
  rechazadas: number | string;
  requieren_revision: number | string;
  recibidas_hoy: number | string;
}

interface BackendRecord {
  id: number | string;
  local_id: string;
  lote_id?: string | null;
  credencial_id: string;
  dispositivo_id: number | string;
  docente_id: number | string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  departamento?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  horario_curso_id?: number | string | null;
  codigo_curso?: string | null;
  curso?: string | null;
  aula?: string | null;
  estacion_ble_id?: number | string | null;
  estacion_codigo?: string | null;
  estacion_nombre?: string | null;
  secuencia: number | string;
  fecha_hora_estimada: string;
  fecha_local_estimada: string;
  hora_local_estimada: string;
  firma_verificada: boolean;
  reloj_confiable: boolean;
  presencia_ble_validada: boolean;
  resultado: OfflineSyncStatus;
  motivo_resultado?: string | null;
  recibido_en: string;
  revisado_en?: string | null;
  observacion_revision?: string | null;
}

interface BackendBatch {
  id: string;
  dispositivo_id: number | string;
  credencial_id?: string | null;
  estado: string;
  total_registros: number | string;
  registrados: number | string;
  duplicados: number | string;
  rechazados: number | string;
  requieren_revision: number | string;
  iniciado_en: string;
  completado_en?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
}

interface BackendConflict {
  id: number | string;
  marcacion_offline_id: number | string;
  tipo: string;
  estado: string;
  detalle?: Record<string, unknown> | null;
  creado_en: string;
  local_id: string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  curso?: string | null;
  aula?: string | null;
}

interface DashboardResponse {
  resumen: BackendSummary;
  registros: BackendRecord[];
  lotes: BackendBatch[];
  conflictos: BackendConflict[];
}

interface OperationResponse {
  message?: string;
  error?: string;
  result?: OfflineSyncStatus;
}

export class OfflineSyncApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OfflineSyncApiError";
    this.status = status;
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
    throw new OfflineSyncApiError("No existe una sesión válida.", 401);
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
    throw new OfflineSyncApiError(
      operation?.error ?? "La operación de sincronización no pudo completarse.",
      response.status
    );
  }

  return data as T;
}

function mapSummary(value: BackendSummary): OfflineSyncSummary {
  return {
    total: toNumber(value.total),
    registered: toNumber(value.registradas),
    duplicated: toNumber(value.duplicadas),
    rejected: toNumber(value.rechazadas),
    review: toNumber(value.requieren_revision),
    receivedToday: toNumber(value.recibidas_hoy),
  };
}

function mapRecord(value: BackendRecord): OfflineSyncRecord {
  return {
    id: toNumber(value.id),
    localId: value.local_id,
    batchId: value.lote_id ?? null,
    credentialId: value.credencial_id,
    deviceId: toNumber(value.dispositivo_id),
    teacherId: toNumber(value.docente_id),
    teacherCode: value.codigo_docente,
    teacherName: `${value.nombres} ${value.apellidos}`.trim(),
    department: value.departamento ?? null,
    manufacturer: value.fabricante ?? null,
    model: value.modelo ?? null,
    scheduleId:
      value.horario_curso_id === null || value.horario_curso_id === undefined
        ? null
        : toNumber(value.horario_curso_id),
    courseCode: value.codigo_curso ?? null,
    course: value.curso ?? null,
    classroom: value.aula ?? null,
    stationId:
      value.estacion_ble_id === null || value.estacion_ble_id === undefined
        ? null
        : toNumber(value.estacion_ble_id),
    stationCode: value.estacion_codigo ?? null,
    stationName: value.estacion_nombre ?? null,
    sequence: toNumber(value.secuencia),
    estimatedAt: value.fecha_hora_estimada,
    estimatedDate: value.fecha_local_estimada,
    estimatedTime: value.hora_local_estimada,
    signatureVerified: value.firma_verificada,
    trustedClock: value.reloj_confiable,
    bleValidated: value.presencia_ble_validada,
    status: value.resultado,
    reason: value.motivo_resultado ?? null,
    receivedAt: value.recibido_en,
    reviewedAt: value.revisado_en ?? null,
    reviewObservation: value.observacion_revision ?? null,
  };
}

function mapBatch(value: BackendBatch): OfflineSyncBatch {
  return {
    id: value.id,
    deviceId: toNumber(value.dispositivo_id),
    credentialId: value.credencial_id ?? null,
    status: value.estado,
    total: toNumber(value.total_registros),
    registered: toNumber(value.registrados),
    duplicated: toNumber(value.duplicados),
    rejected: toNumber(value.rechazados),
    review: toNumber(value.requieren_revision),
    startedAt: value.iniciado_en,
    completedAt: value.completado_en ?? null,
    manufacturer: value.fabricante ?? null,
    model: value.modelo ?? null,
    teacherCode: value.codigo_docente,
    teacherName: `${value.nombres} ${value.apellidos}`.trim(),
  };
}

function mapConflict(value: BackendConflict): OfflineSyncConflict {
  return {
    id: toNumber(value.id),
    recordId: toNumber(value.marcacion_offline_id),
    type: value.tipo,
    status: value.estado,
    detail: value.detalle ?? {},
    createdAt: value.creado_en,
    localId: value.local_id,
    teacherCode: value.codigo_docente,
    teacherName: `${value.nombres} ${value.apellidos}`.trim(),
    course: value.curso ?? null,
    classroom: value.aula ?? null,
  };
}

export async function getOfflineSyncDashboard(): Promise<OfflineSyncDashboard> {
  const data = await request<DashboardResponse>(
    "/asistencia-offline/dashboard"
  );

  return {
    summary: mapSummary(data.resumen),
    records: data.registros.map(mapRecord),
    batches: data.lotes.map(mapBatch),
    conflicts: data.conflictos.map(mapConflict),
  };
}

export async function reviewOfflineRecord(
  recordId: number,
  action: "ACEPTAR" | "RECHAZAR",
  observation: string
): Promise<string> {
  const data = await request<OperationResponse>(
    `/asistencia-offline/registros/${recordId}/revisar`,
    {
      method: "POST",
      body: JSON.stringify({ action, observation }),
    }
  );

  return data.message ?? "La revisión fue registrada.";
}
