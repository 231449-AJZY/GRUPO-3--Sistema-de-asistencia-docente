export interface BiometricDashboardSummary {
  totalTeachers: number;
  completedTeachers: number;
  inProgressTeachers: number;
  pendingTeachers: number;
  activeFingerprints: number;
  capturesToday: number;
  totalDevices: number;
  connectedDevices: number;
  warningDevices: number;
  disconnectedDevices: number;
  maintenanceDevices: number;
  pendingRecords: number;
  coveragePercent: number;
  deviceAvailabilityPercent: number;
  lastDeviceActivity: string | null;
}

export interface BiometricDashboardAlert {
  type: string;
  tone: "info" | "warning" | "danger";
  title: string;
  description: string;
  href: string;
}

export interface BiometricRecentCapture {
  id: number;
  docente_id: number;
  teacher_code: string;
  teacher: string;
  department: string | null;
  finger: string;
  quality: number | null;
  device_code: string | null;
  sdk_version: string | null;
  enrolled_at: string;
  enrolled_by: string | null;
}

export interface BiometricRecentEvent {
  id: number;
  type: string;
  result: string;
  quality: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  teacher: string | null;
  device_code: string | null;
}

export interface BiometricDashboardData {
  summary: BiometricDashboardSummary;
  alerts: BiometricDashboardAlert[];
  recentCaptures: BiometricRecentCapture[];
  recentEvents: BiometricRecentEvent[];
  security: {
    storesRawImages: false;
    templateEncryption: string;
    templateKeyConfigured: boolean;
  };
}

export interface BiometricTeacher {
  id: number;
  codigo: string;
  dni: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  departamento: string | null;
  categoria: string | null;
  activo: boolean;
  fingerprints: number;
  biometric_status:
    | "REGISTRADO"
    | "EN_PROCESO"
    | "PENDIENTE";
}

export interface BiometricTeacherList {
  teachers: BiometricTeacher[];
}

export interface BiometricEnrollment {
  id: number;
  docente_id: number;
  dedo: string;
  calidad: number;
  dispositivo_codigo: string | null;
  version_sdk: string | null;
  enrolado_en: string;
}

export interface BiometricEnrollmentInput {
  teacherId: number;
  finger: string;
  templateBase64: string;
  quality: number;
  sdkVersion?: string;
  device?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
export interface BiometricBridgeStatus {
  online: boolean;
  ok?: boolean;
  bridgeVersion?: string;
  protocolVersion?: number;
  host?: string;
  port?: number;
  adapterConfigured: boolean;
  adapterAvailable: boolean;
  adapterCommand?: string | null;
  device?: Record<string, unknown> | null;
  storesRawImages: false;
  message?: string;
  code?: string;
  error?: string;
}

export interface BiometricBridgeCapture {
  ok: true;
  finger: string;
  quality: number;
  templateBase64: string;
  templateBytes: number;
  templateSha256: string;
  sdkVersion: string | null;
  device: Record<string, unknown>;
  metadata: Record<string, unknown>;
  security: {
    rawImageStored: false;
    templateOnly: true;
    transport: string;
  };
}

export interface BiometricRecentCaptureList {
  captures: BiometricRecentCapture[];
}
// PASO_8J3_DISPOSITIVOS_REALES
export type BiometricDeviceState =
  | "CONECTADO"
  | "ADVERTENCIA"
  | "DESCONECTADO"
  | "MANTENIMIENTO";

export type BiometricDeviceConnectionType =
  | "PUENTE_LOCAL"
  | "AGENTE_REMOTO"
  | "RED";

export interface BiometricDevice {
  id: number;
  codigo: string;
  nombre: string;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  ubicacion: string | null;
  ip_address: string | null;
  puerto: number | null;
  mac_address: string | null;
  version_firmware: string | null;
  version_sdk: string | null;
  agente_id: string | null;
  tipo_conexion: BiometricDeviceConnectionType;
  estado_actual: BiometricDeviceState;
  estado_reportado: BiometricDeviceState;
  porcentaje_senal: number;
  registros_pendientes: number;
  plantillas_registradas: number;
  sincronizacion_automatica: boolean;
  activo: boolean;
  mensaje: string | null;
  ultima_actividad_en: string | null;
  ultima_sincronizacion_en: string | null;
  ultimo_diagnostico_en: string | null;
  ultima_latencia_ms: number | null;
  ultimo_error_codigo: string | null;
  diagnostico_detalle: Record<string, unknown> | null;
  retirado_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface BiometricDeviceSummary {
  total: number;
  connected: number;
  warning: number;
  disconnected: number;
  maintenance: number;
  pendingRecords: number;
}

export interface BiometricDeviceList {
  summary: BiometricDeviceSummary;
  devices: BiometricDevice[];
}

export interface BiometricDeviceEvent {
  id: number;
  type: string;
  result: "EXITOSO" | "FALLIDO" | "ADVERTENCIA" | "REVOCADO";
  detail: Record<string, unknown> | null;
  created_at: string;
  performed_by: string | null;
}

export interface BiometricDeviceDetail {
  device: BiometricDevice;
  events: BiometricDeviceEvent[];
  security: {
    storesRawImages: false;
    diagnosticsUseLocalBridge: true;
  };
}

export interface BiometricDeviceInput {
  codigo: string;
  nombre: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  ubicacion?: string;
  ip_address?: string;
  puerto?: number | null;
  mac_address?: string;
  version_firmware?: string;
  version_sdk?: string;
  agente_id?: string;
  tipo_conexion: BiometricDeviceConnectionType;
  sincronizacion_automatica: boolean;
  activo: boolean;
  mensaje?: string;
}

export type BiometricDeviceAction =
  | "ACTIVAR"
  | "REACTIVAR"
  | "MANTENIMIENTO"
  | "RETIRAR";

export interface BiometricDeviceDiagnostic {
  ok: boolean;
  result: "EXITOSO" | "FALLIDO" | "ADVERTENCIA";
  state: BiometricDeviceState;
  message: string;
  latencyMs: number;
  errorCode: string | null;
  matched: boolean;
  bridgeStatus?: Record<string, unknown> | null;
  detail: Record<string, unknown>;
  device: BiometricDevice;
}

export interface BiometricDeviceDiagnosticResponse {
  message: string;
  diagnostic: BiometricDeviceDiagnostic;
}

export interface BiometricGeneralDiagnosticResponse {
  message: string;
  summary: {
    total: number;
    connected: number;
    warning: number;
    disconnected: number;
    maintenance: number;
    retired: number;
  };
  bridge: {
    online: boolean;
    adapterConfigured?: boolean;
    adapterAvailable?: boolean;
    bridgeVersion?: string | null;
    device?: Record<string, unknown> | null;
  };
  localDiagnostic: BiometricDeviceDiagnostic | null;
  warning: string | null;
  devices: Array<{
    id: number;
    codigo: string;
    nombre: string;
    estado_actual: BiometricDeviceState;
    activo: boolean;
    ultima_actividad_en: string | null;
    ultimo_diagnostico_en: string | null;
    ultima_latencia_ms: number | null;
    ultimo_error_codigo: string | null;
    mensaje: string | null;
  }>;
  methodology: string;
}

// PASO_8J4_CIERRE_BIOMETRICO_ADMIN
export type BiometricSynchronizationState =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "SINCRONIZADO"
  | "FALLIDO"
  | "CANCELADO";

export interface BiometricSynchronizationDevice {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string | null;
  tipo_conexion: BiometricDeviceConnectionType;
  sincronizacion_automatica: boolean;
  activo: boolean;
  registros_pendientes: number;
  ultima_sincronizacion_en: string | null;
  ultima_actividad_en: string | null;
  estado_actual: BiometricDeviceState;
  mensaje: string | null;
}

export interface BiometricSynchronizationJob {
  id: number;
  dispositivo_id: number | null;
  device_code: string;
  device_name: string;
  estado: BiometricSynchronizationState;
  registros_detectados: number;
  registros_procesados: number;
  registros_fallidos: number;
  codigo_resultado: string | null;
  mensaje: string | null;
  detalle: Record<string, unknown> | null;
  solicitado_en: string;
  iniciado_en: string | null;
  completado_en: string | null;
  requested_by: string | null;
}

export interface BiometricSynchronizationDashboard {
  summary: {
    total: number;
    connected: number;
    automatic: number;
    pendingRecords: number;
    total_jobs: number;
    synchronized_jobs: number;
    failed_jobs: number;
    pending_jobs: number;
    detected_records: number;
    processed_records: number;
    last_completed_at: string | null;
  };
  devices: BiometricSynchronizationDevice[];
  jobs: BiometricSynchronizationJob[];
  methodology: string;
}

export interface BiometricHistoryRecord {
  id: number;
  tipo: string;
  resultado:
    | "EXITOSO"
    | "FALLIDO"
    | "ADVERTENCIA"
    | "REVOCADO";
  calidad: number | null;
  detalle: Record<string, unknown> | null;
  creado_en: string;
  docente_id: number | null;
  dispositivo_id: number | null;
  teacher_code: string | null;
  teacher: string | null;
  department: string | null;
  device_code: string | null;
  device_name: string | null;
  performed_by: string | null;
}

export interface BiometricHistoryFilters {
  search?: string;
  result?: string;
  type?: string;
  deviceId?: number | null;
  teacherId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface BiometricHistoryResponse {
  summary: {
    total: number;
    successful: number;
    failed: number;
    warnings: number;
    revoked: number;
    teachers: number;
    devices: number;
  };
  records: BiometricHistoryRecord[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    totalPages: number;
  };
  security: {
    storesRawImages: false;
    containsTemplates: false;
  };
}

export interface BiometricReportMetric {
  label: string;
  value: number;
}

export interface BiometricDeviceReportMetric {
  code: string;
  label: string;
  value: number;
  failed: number;
}

export interface BiometricDepartmentReportMetric {
  label: string;
  value: number;
  teachers: number;
}

export interface BiometricReportResponse {
  generatedAt: string;
  range: {
    dateFrom: string;
    dateTo: string;
  };
  summary: {
    total_events: number;
    successful_events: number;
    failed_events: number;
    warning_events: number;
    revoked_events: number;
    involved_teachers: number;
    involved_devices: number;
    total_devices: number;
    connected_devices: number;
    warning_devices: number;
    disconnected_devices: number;
    maintenance_devices: number;
    pending_records: number;
    total_jobs: number;
    synchronized_jobs: number;
    failed_jobs: number;
    detected_records: number;
    processed_records: number;
    active_templates: number;
    enrolled_teachers: number;
    invalid_hashes: number;
    suspicious_raw_metadata: number;
  };
  byResult: BiometricReportMetric[];
  byType: BiometricReportMetric[];
  byDevice: BiometricDeviceReportMetric[];
  byDepartment: BiometricDepartmentReportMetric[];
  quality: {
    average: number | null;
    minimum: number | null;
    maximum: number | null;
    samples: number;
  };
  integrity: {
    active_templates: number;
    enrolled_teachers: number;
    invalid_hashes: number;
    suspicious_raw_metadata: number;
    templateKeyConfigured: boolean;
    storesRawImages: false;
    encryption: string;
  };
  methodology: string;
}

export interface BiometricIntegrityResponse {
  devices_table: boolean;
  events_table: boolean;
  synchronization_table: boolean;
  active_templates: number;
  missing_hashes: number;
  suspicious_raw_metadata: number;
  templateKeyConfigured: boolean;
  storesRawImages: false;
  encryption: string;
  closedModules: string[];
}
