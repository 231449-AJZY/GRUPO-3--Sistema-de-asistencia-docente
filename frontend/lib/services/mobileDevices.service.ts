"use client";

import { getToken } from "@/lib/auth";

import type {
  GeneratedMobileLink,
  MobileAttendanceDashboard,
  MobileAttendanceRecord,
  MobileDevice,
  MobileDevicesDashboard,
  MobileDeviceState,
  MobileLinkRequest,
  MobileRejectedChallenge,
  MobileSecurityEvent,
  MobileTeacherOption,
  AttendanceCleanupPreview,
  AttendanceCleanupResult,
  UnifiedAttendanceFilters,
  UnifiedAttendanceHistory,
  UnifiedAttendanceRecord,
} from "@/types/mobileDevice";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

interface BackendDevice {
  id: number | string;
  uuid_instalacion: string;
  usuario_id: number | string;
  docente_id: number | string;
  fabricante: string;
  modelo: string;
  plataforma: string;
  version_sistema: string;
  sdk_int: number | string;
  version_aplicacion: string;
  huella_clave: string;
  algoritmo_clave: string;
  huella_clave_asistencia?: string | null;
  algoritmo_clave_asistencia?: string | null;
  clave_asistencia_registrada_en?: string | null;
  biometria_disponible: boolean;
  tipos_biometria?: string | null;
  estado: MobileDeviceState;
  motivo_estado?: string | null;
  autorizado_en?: string | null;
  rechazado_en?: string | null;
  suspendido_en?: string | null;
  revocado_en?: string | null;
  ultimo_acceso?: string | null;
  creado_en: string;
  actualizado_en: string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  email: string;
  usuario_activo: boolean;
  departamento?: string | null;
  autorizado_por_nombre?: string | null;
}

interface BackendRequest {
  id: number | string;
  docente_id: number | string;
  usuario_id: number | string;
  estado: MobileLinkRequest["state"];
  expira_en: string;
  utilizado_en?: string | null;
  cancelado_en?: string | null;
  creado_en: string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  creado_por_nombre?: string | null;
}

interface BackendTeacher {
  docente_id: number | string;
  usuario_id: number | string;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  departamento?: string | null;
  dispositivo_id?: number | string | null;
  dispositivo_estado?: MobileDeviceState | null;
}

interface BackendEvent {
  id: number | string;
  tipo: string;
  resultado: string;
  detalle?: Record<string, unknown> | null;
  creado_en: string;
  dispositivo_id?: number | string | null;
  actor?: string;
  docente?: string;
}

interface BackendAttendanceRecord {
  id: number | string;
  desafio_id: string;
  dispositivo_id: number | string;
  docente_id: number | string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  departamento?: string | null;
  fabricante: string;
  modelo: string;
  tipo_objetivo: "INGRESO_INSTITUCIONAL" | "CURSO";
  horario_curso_id?: number | string | null;
  codigo_curso?: string | null;
  curso?: string | null;
  aula?: string | null;
  presencia_ble_requerida?: boolean;
  presencia_ble_validada?: boolean;
  estacion_ble_codigo?: string | null;
  estacion_ble_nombre?: string | null;
  estacion_ble_rssi?: number | string | null;
  estacion_ble_muestras?: number | string | null;
  estado_ingreso?: string | null;
  fecha_ingreso?: string | null;
  hora_ingreso?: string | null;
  estado_curso?: string | null;
  fecha_curso?: string | null;
  hora_curso?: string | null;
  firma_verificada: boolean;
  metodo_verificacion?: "BIOMETRIA_MOVIL" | "QR_DINAMICO";
  resultado: "REGISTRADA" | "DUPLICADA" | "RECHAZADA";
  creado_en: string;
}

interface BackendRejectedChallenge {
  id: string;
  tipo_objetivo: string;
  estado: string;
  motivo_rechazo?: string | null;
  creado_en: string;
  expira_en: string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  fabricante: string;
  modelo: string;
}

interface MobileAttendanceDashboardResponse {
  fecha: string;
  resumen: {
    total: number | string;
    registradas: number | string;
    duplicadas: number | string;
    firmas_verificadas: number | string;
    qr_dinamicos?: number | string;
    cursos: number | string;
    ingresos: number | string;
  };
  marcaciones: BackendAttendanceRecord[];
  rechazadas: BackendRejectedChallenge[];
}

interface DashboardResponse {
  dispositivos: BackendDevice[];
  solicitudes: BackendRequest[];
  docentes: BackendTeacher[];
  resumen: {
    total: number | string;
    pendientes: number | string;
    autorizados: number | string;
    suspendidos: number | string;
    rechazados: number | string;
    revocados: number | string;
  };
  eventos: BackendEvent[];
}

interface GeneratedLinkResponse {
  solicitud: {
    id: number | string;
    docente_id: number | string;
    usuario_id: number | string;
    estado: MobileLinkRequest["state"];
    expira_en: string;
    creado_en: string;
    codigo_docente: string;
    nombres: string;
    apellidos: string;
    qr_payload: string;
    qr_image: string;
    vigencia_minutos: number | string;
  };
}

interface OperationResponse {
  mensaje?: string;
  dispositivo?: BackendDevice;
  error?: string;
  fields?: Record<string, string>;
}

export class MobileDevicesApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "MobileDevicesApiError";
    this.status = status;
    this.fields = fields;
  }
}

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function mapDevice(value: BackendDevice): MobileDevice {
  return {
    id: toNumber(value.id),
    installationId: value.uuid_instalacion,
    userId: toNumber(value.usuario_id),
    teacherId: toNumber(value.docente_id),
    manufacturer: value.fabricante,
    model: value.modelo,
    platform: value.plataforma,
    systemVersion: value.version_sistema,
    sdkInt: toNumber(value.sdk_int),
    appVersion: value.version_aplicacion,
    keyFingerprint: value.huella_clave,
    keyAlgorithm: value.algoritmo_clave,
    attendanceKeyFingerprint: value.huella_clave_asistencia ?? null,
    attendanceKeyAlgorithm: value.algoritmo_clave_asistencia ?? null,
    attendanceKeyRegisteredAt:
      value.clave_asistencia_registrada_en ?? null,
    biometricAvailable: value.biometria_disponible,
    biometricTypes: value.tipos_biometria ?? "",
    state: value.estado,
    stateReason: value.motivo_estado ?? null,
    authorizedAt: value.autorizado_en ?? null,
    rejectedAt: value.rechazado_en ?? null,
    suspendedAt: value.suspendido_en ?? null,
    revokedAt: value.revocado_en ?? null,
    lastAccess: value.ultimo_acceso ?? null,
    createdAt: value.creado_en,
    updatedAt: value.actualizado_en,
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    email: value.email,
    userActive: value.usuario_activo,
    department: value.departamento ?? null,
    authorizedByName: value.autorizado_por_nombre ?? null,
  };
}

function mapRequest(value: BackendRequest): MobileLinkRequest {
  return {
    id: toNumber(value.id),
    teacherId: toNumber(value.docente_id),
    userId: toNumber(value.usuario_id),
    state: value.estado,
    expiresAt: value.expira_en,
    usedAt: value.utilizado_en ?? null,
    cancelledAt: value.cancelado_en ?? null,
    createdAt: value.creado_en,
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    createdByName: value.creado_por_nombre ?? null,
  };
}

function mapTeacher(value: BackendTeacher): MobileTeacherOption {
  return {
    teacherId: toNumber(value.docente_id),
    userId: toNumber(value.usuario_id),
    code: value.codigo,
    names: value.nombres,
    surnames: value.apellidos,
    email: value.email,
    department: value.departamento ?? null,
    deviceId: value.dispositivo_id
      ? toNumber(value.dispositivo_id)
      : null,
    deviceState: value.dispositivo_estado ?? null,
  };
}

function mapEvent(value: BackendEvent): MobileSecurityEvent {
  return {
    id: toNumber(value.id),
    type: value.tipo,
    result: value.resultado,
    detail: value.detalle ?? {},
    createdAt: value.creado_en,
    deviceId: value.dispositivo_id
      ? toNumber(value.dispositivo_id)
      : null,
    actor: value.actor ?? "Sistema",
    teacher: value.docente ?? "",
  };
}

function mapAttendanceRecord(
  value: BackendAttendanceRecord
): MobileAttendanceRecord {
  return {
    id: toNumber(value.id),
    challengeId: value.desafio_id,
    deviceId: toNumber(value.dispositivo_id),
    teacherId: toNumber(value.docente_id),
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    department: value.departamento ?? null,
    manufacturer: value.fabricante,
    model: value.modelo,
    targetType: value.tipo_objetivo,
    scheduleId: value.horario_curso_id
      ? toNumber(value.horario_curso_id)
      : null,
    courseCode: value.codigo_curso ?? null,
    courseName: value.curso ?? null,
    classroom: value.aula ?? null,
    bleRequired: value.presencia_ble_requerida === true,
    bleValidated: value.presencia_ble_validada === true,
    bleStationCode: value.estacion_ble_codigo ?? null,
    bleStationName: value.estacion_ble_nombre ?? null,
    bleStationRssi:
      value.estacion_ble_rssi === null ||
      value.estacion_ble_rssi === undefined
        ? null
        : toNumber(value.estacion_ble_rssi),
    bleStationSamples:
      value.estacion_ble_muestras === null ||
      value.estacion_ble_muestras === undefined
        ? null
        : toNumber(value.estacion_ble_muestras),
    entryState: value.estado_ingreso ?? null,
    entryDate: value.fecha_ingreso ?? null,
    entryTime: value.hora_ingreso ?? null,
    courseState: value.estado_curso ?? null,
    courseDate: value.fecha_curso ?? null,
    courseTime: value.hora_curso ?? null,
    signatureVerified: value.firma_verificada,
    verificationMethod: value.metodo_verificacion ?? "BIOMETRIA_MOVIL",
    result: value.resultado,
    createdAt: value.creado_en,
  };
}

function mapRejectedChallenge(
  value: BackendRejectedChallenge
): MobileRejectedChallenge {
  return {
    id: value.id,
    targetType: value.tipo_objetivo,
    state: value.estado,
    reason: value.motivo_rechazo ?? null,
    createdAt: value.creado_en,
    expiresAt: value.expira_en,
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    manufacturer: value.fabricante,
    model: value.modelo,
  };
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new MobileDevicesApiError(
      "No existe una sesión válida.",
      401
    );
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

  const data = (await response
    .json()
    .catch(() => null)) as
    | T
    | OperationResponse
    | null;

  if (!response.ok) {
    const errorData = data as OperationResponse | null;
    throw new MobileDevicesApiError(
      errorData?.error ??
        "No se pudo completar la operación.",
      response.status,
      errorData?.fields
    );
  }

  return data as T;
}

export async function getMobileDevicesDashboard(): Promise<MobileDevicesDashboard> {
  const data = await request<DashboardResponse>(
    "/dispositivos"
  );

  return {
    devices: data.dispositivos.map(mapDevice),
    requests: data.solicitudes.map(mapRequest),
    teachers: data.docentes.map(mapTeacher),
    summary: {
      total: toNumber(data.resumen.total),
      pending: toNumber(data.resumen.pendientes),
      authorized: toNumber(data.resumen.autorizados),
      suspended: toNumber(data.resumen.suspendidos),
      rejected: toNumber(data.resumen.rechazados),
      revoked: toNumber(data.resumen.revocados),
    },
    events: data.eventos.map(mapEvent),
  };
}

export async function getMobileAttendanceDashboard(): Promise<MobileAttendanceDashboard> {
  const data = await request<MobileAttendanceDashboardResponse>(
    "/asistencia-movil/resumen?limit=40"
  );

  return {
    date: data.fecha,
    summary: {
      total: toNumber(data.resumen.total),
      registered: toNumber(data.resumen.registradas),
      duplicate: toNumber(data.resumen.duplicadas),
      verifiedSignatures: toNumber(
        data.resumen.firmas_verificadas
      ),
      dynamicQr: toNumber(data.resumen.qr_dinamicos),
      courses: toNumber(data.resumen.cursos),
      institutionalEntries: toNumber(data.resumen.ingresos),
    },
    records: data.marcaciones.map(mapAttendanceRecord),
    rejected: data.rechazadas.map(mapRejectedChallenge),
  };
}

export async function generateMobileLink(
  teacherId: number
): Promise<GeneratedMobileLink> {
  const data = await request<GeneratedLinkResponse>(
    "/dispositivos/sincronizacion/crear",
    {
      method: "POST",
      body: JSON.stringify({ docenteId: teacherId }),
    }
  );

  const value = data.solicitud;

  return {
    id: toNumber(value.id),
    teacherId: toNumber(value.docente_id),
    userId: toNumber(value.usuario_id),
    state: value.estado,
    expiresAt: value.expira_en,
    createdAt: value.creado_en,
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    qrPayload: value.qr_payload,
    qrImage: value.qr_image,
    validityMinutes: toNumber(value.vigencia_minutos),
  };
}

export async function cancelMobileLink(
  requestId: number
): Promise<string> {
  const data = await request<OperationResponse>(
    `/dispositivos/vinculaciones/${requestId}/cancelar`,
    { method: "PATCH", body: "{}" }
  );
  return data.mensaje ?? "Solicitud cancelada.";
}

export async function transitionMobileDevice(
  deviceId: number,
  action:
    | "aprobar"
    | "rechazar"
    | "suspender"
    | "reactivar"
    | "revocar",
  reason = ""
): Promise<string> {
  const isRevoke = action === "revocar";
  const data = await request<OperationResponse>(
    isRevoke
      ? `/dispositivos/${deviceId}`
      : `/dispositivos/${deviceId}/${action}`,
    {
      method: isRevoke ? "DELETE" : "PATCH",
      body: JSON.stringify({ motivo: reason }),
    }
  );

  return data.mensaje ?? "Estado actualizado.";
}

interface BackendUnifiedAttendanceRecord {
  registro_uid: string;
  fuente: string;
  docente_id: number | string;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  email: string;
  departamento?: string | null;
  dispositivo_id?: number | string | null;
  fabricante?: string | null;
  modelo?: string | null;
  tipo_objetivo: "CURSO" | "INGRESO_INSTITUCIONAL";
  horario_curso_id?: number | string | null;
  codigo_curso?: string | null;
  curso?: string | null;
  aula?: string | null;
  fecha: string;
  hora: string;
  estado: string;
  resultado:
    | "REGISTRADA"
    | "DUPLICADA"
    | "RECHAZADA"
    | "PENDIENTE"
    | "REQUIERE_REVISION";
  metodo_verificacion:
    | "QR_DINAMICO"
    | "BIOMETRIA_MOVIL"
    | "OFFLINE_SINCRONIZADO"
    | "LECTOR_BIOMETRICO"
    | "MANUAL";
  firma_verificada: boolean;
  presencia_ble_requerida: boolean;
  presencia_ble_validada: boolean;
  registro_ingreso_id?: number | string | null;
  registro_asistencia_id?: number | string | null;
  detalle?: Record<string, unknown> | null;
  ip_origen?: string | null;
  creado_en: string;
}

interface UnifiedAttendanceHistoryResponse {
  total: number | string;
  limit: number | string;
  offset: number | string;
  resumen: {
    total: number | string;
    registradas: number | string;
    duplicadas: number | string;
    rechazadas: number | string;
    qr: number | string;
    biometria: number | string;
    offline: number | string;
    otros: number | string;
    cursos: number | string;
    ingresos: number | string;
  };
  marcaciones: BackendUnifiedAttendanceRecord[];
}

interface CleanupPreviewResponse {
  docente: {
    docente_id: number | string;
    usuario_id: number | string;
    codigo: string;
    nombres: string;
    apellidos: string;
    email: string;
  };
  fecha: string;
  conteos: {
    qr: number | string;
    offline: number | string;
    firmas: number | string;
    desafios: number | string;
    cursos: number | string;
    ingresos: number | string;
    total: number | string;
  };
  marcaciones: BackendUnifiedAttendanceRecord[];
}

interface CleanupExecutionResponse {
  mensaje: string;
  respaldo: string;
  eliminados: Record<string, number | string>;
}

function mapUnifiedAttendanceRecord(
  value: BackendUnifiedAttendanceRecord
): UnifiedAttendanceRecord {
  return {
    id: value.registro_uid,
    source: value.fuente,
    teacherId: toNumber(value.docente_id),
    teacherCode: value.codigo_docente,
    names: value.nombres,
    surnames: value.apellidos,
    email: value.email,
    department: value.departamento ?? null,
    deviceId:
      value.dispositivo_id === null ||
      value.dispositivo_id === undefined
        ? null
        : toNumber(value.dispositivo_id),
    manufacturer: value.fabricante ?? null,
    model: value.modelo ?? null,
    targetType: value.tipo_objetivo,
    scheduleId:
      value.horario_curso_id === null ||
      value.horario_curso_id === undefined
        ? null
        : toNumber(value.horario_curso_id),
    courseCode: value.codigo_curso ?? null,
    courseName: value.curso ?? null,
    classroom: value.aula ?? null,
    date: value.fecha,
    time: value.hora,
    state: value.estado,
    result: value.resultado,
    verificationMethod: value.metodo_verificacion,
    signatureVerified: value.firma_verificada === true,
    bleRequired: value.presencia_ble_requerida === true,
    bleValidated: value.presencia_ble_validada === true,
    entryRecordId:
      value.registro_ingreso_id === null ||
      value.registro_ingreso_id === undefined
        ? null
        : toNumber(value.registro_ingreso_id),
    courseRecordId:
      value.registro_asistencia_id === null ||
      value.registro_asistencia_id === undefined
        ? null
        : toNumber(value.registro_asistencia_id),
    detail: value.detalle ?? {},
    ipAddress: value.ip_origen ?? null,
    createdAt: value.creado_en,
  };
}

export async function getUnifiedAttendanceHistory(
  filters: UnifiedAttendanceFilters = {}
): Promise<UnifiedAttendanceHistory> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("q", filters.search.trim());
  }
  if (filters.teacherId) {
    params.set("docenteId", String(filters.teacherId));
  }
  if (filters.method) {
    params.set("metodo", filters.method);
  }
  if (filters.result) {
    params.set("resultado", filters.result);
  }
  if (filters.targetType) {
    params.set("tipo", filters.targetType);
  }
  if (filters.dateFrom) {
    params.set("desde", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("hasta", filters.dateTo);
  }
  params.set("limit", String(filters.limit ?? 100));
  params.set("offset", String(filters.offset ?? 0));

  const data = await request<UnifiedAttendanceHistoryResponse>(
    `/asistencia-movil/historial?${params.toString()}`
  );

  return {
    total: toNumber(data.total),
    limit: toNumber(data.limit),
    offset: toNumber(data.offset),
    summary: {
      total: toNumber(data.resumen.total),
      registered: toNumber(data.resumen.registradas),
      duplicate: toNumber(data.resumen.duplicadas),
      rejected: toNumber(data.resumen.rechazadas),
      dynamicQr: toNumber(data.resumen.qr),
      mobileBiometric: toNumber(data.resumen.biometria),
      offline: toNumber(data.resumen.offline),
      other: toNumber(data.resumen.otros),
      courses: toNumber(data.resumen.cursos),
      institutionalEntries: toNumber(data.resumen.ingresos),
    },
    records: data.marcaciones.map(mapUnifiedAttendanceRecord),
  };
}

export async function previewAttendanceCleanup(
  teacherId: number,
  date: string
): Promise<AttendanceCleanupPreview> {
  const data = await request<CleanupPreviewResponse>(
    "/asistencia-movil/limpieza-pruebas/vista-previa",
    {
      method: "POST",
      body: JSON.stringify({ docenteId: teacherId, fecha: date }),
    }
  );

  return {
    teacher: {
      teacherId: toNumber(data.docente.docente_id),
      userId: toNumber(data.docente.usuario_id),
      code: data.docente.codigo,
      names: data.docente.nombres,
      surnames: data.docente.apellidos,
      email: data.docente.email,
    },
    date: data.fecha,
    counts: {
      qr: toNumber(data.conteos.qr),
      offline: toNumber(data.conteos.offline),
      signatures: toNumber(data.conteos.firmas),
      challenges: toNumber(data.conteos.desafios),
      courses: toNumber(data.conteos.cursos),
      institutionalEntries: toNumber(data.conteos.ingresos),
      total: toNumber(data.conteos.total),
    },
    records: data.marcaciones.map(mapUnifiedAttendanceRecord),
  };
}

export async function executeAttendanceCleanup(
  teacherId: number,
  date: string,
  confirmation: string
): Promise<AttendanceCleanupResult> {
  const data = await request<CleanupExecutionResponse>(
    "/asistencia-movil/limpieza-pruebas/ejecutar",
    {
      method: "POST",
      body: JSON.stringify({
        docenteId: teacherId,
        fecha: date,
        confirmacion: confirmation,
      }),
    }
  );

  return {
    message: data.mensaje,
    backupPath: data.respaldo,
    deleted: Object.fromEntries(
      Object.entries(data.eliminados).map(([key, value]) => [
        key,
        toNumber(value),
      ])
    ),
  };
}

