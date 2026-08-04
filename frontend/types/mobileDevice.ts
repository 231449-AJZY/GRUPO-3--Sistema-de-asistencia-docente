export type MobileDeviceState =
  | "PENDIENTE"
  | "AUTORIZADO"
  | "SUSPENDIDO"
  | "RECHAZADO"
  | "REVOCADO";

export type MobileLinkRequestState =
  | "VIGENTE"
  | "UTILIZADA"
  | "CANCELADA"
  | "EXPIRADA";

export interface MobileDevice {
  id: number;
  installationId: string;
  userId: number;
  teacherId: number;
  manufacturer: string;
  model: string;
  platform: string;
  systemVersion: string;
  sdkInt: number;
  appVersion: string;
  keyFingerprint: string;
  keyAlgorithm: string;
  attendanceKeyFingerprint: string | null;
  attendanceKeyAlgorithm: string | null;
  attendanceKeyRegisteredAt: string | null;
  biometricAvailable: boolean;
  biometricTypes: string;
  state: MobileDeviceState;
  stateReason: string | null;
  authorizedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  revokedAt: string | null;
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
  teacherCode: string;
  names: string;
  surnames: string;
  email: string;
  userActive: boolean;
  department: string | null;
  authorizedByName: string | null;
}

export interface MobileLinkRequest {
  id: number;
  teacherId: number;
  userId: number;
  state: MobileLinkRequestState;
  expiresAt: string;
  usedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  teacherCode: string;
  names: string;
  surnames: string;
  createdByName: string | null;
}

export interface MobileTeacherOption {
  teacherId: number;
  userId: number;
  code: string;
  names: string;
  surnames: string;
  email: string;
  department: string | null;
  deviceId: number | null;
  deviceState: MobileDeviceState | null;
}

export interface MobileDeviceSummary {
  total: number;
  pending: number;
  authorized: number;
  suspended: number;
  rejected: number;
  revoked: number;
}

export interface MobileSecurityEvent {
  id: number;
  type: string;
  result: string;
  detail: Record<string, unknown>;
  createdAt: string;
  deviceId: number | null;
  actor: string;
  teacher: string;
}

export interface MobileDevicesDashboard {
  devices: MobileDevice[];
  requests: MobileLinkRequest[];
  teachers: MobileTeacherOption[];
  summary: MobileDeviceSummary;
  events: MobileSecurityEvent[];
}

export interface GeneratedMobileLink {
  id: number;
  teacherId: number;
  userId: number;
  state: MobileLinkRequestState;
  expiresAt: string;
  createdAt: string;
  teacherCode: string;
  names: string;
  surnames: string;
  qrPayload: string;
  qrImage: string;
  validityMinutes: number;
}

export interface MobileAttendanceSummary {
  total: number;
  registered: number;
  duplicate: number;
  verifiedSignatures: number;
  dynamicQr: number;
  courses: number;
  institutionalEntries: number;
}

export interface MobileAttendanceRecord {
  id: number;
  challengeId: string;
  deviceId: number;
  teacherId: number;
  teacherCode: string;
  names: string;
  surnames: string;
  department: string | null;
  manufacturer: string;
  model: string;
  targetType: "INGRESO_INSTITUCIONAL" | "CURSO";
  scheduleId: number | null;
  courseCode: string | null;
  courseName: string | null;
  classroom: string | null;
  bleRequired: boolean;
  bleValidated: boolean;
  bleStationCode: string | null;
  bleStationName: string | null;
  bleStationRssi: number | null;
  bleStationSamples: number | null;
  entryState: string | null;
  entryDate: string | null;
  entryTime: string | null;
  courseState: string | null;
  courseDate: string | null;
  courseTime: string | null;
  signatureVerified: boolean;
  verificationMethod: "BIOMETRIA_MOVIL" | "QR_DINAMICO";
  result: "REGISTRADA" | "DUPLICADA" | "RECHAZADA";
  createdAt: string;
}

export interface MobileRejectedChallenge {
  id: string;
  targetType: string;
  state: string;
  reason: string | null;
  createdAt: string;
  expiresAt: string;
  teacherCode: string;
  names: string;
  surnames: string;
  manufacturer: string;
  model: string;
}

export interface MobileAttendanceDashboard {
  date: string;
  summary: MobileAttendanceSummary;
  records: MobileAttendanceRecord[];
  rejected: MobileRejectedChallenge[];
}

export type UnifiedAttendanceMethod =
  | "QR_DINAMICO"
  | "BIOMETRIA_MOVIL"
  | "OFFLINE_SINCRONIZADO"
  | "LECTOR_BIOMETRICO"
  | "MANUAL";

export type UnifiedAttendanceResult =
  | "REGISTRADA"
  | "DUPLICADA"
  | "RECHAZADA"
  | "PENDIENTE"
  | "REQUIERE_REVISION";

export type UnifiedAttendanceTarget =
  | "CURSO"
  | "INGRESO_INSTITUCIONAL";

export interface UnifiedAttendanceRecord {
  id: string;
  source: string;
  teacherId: number;
  teacherCode: string;
  names: string;
  surnames: string;
  email: string;
  department: string | null;
  deviceId: number | null;
  manufacturer: string | null;
  model: string | null;
  targetType: UnifiedAttendanceTarget;
  scheduleId: number | null;
  courseCode: string | null;
  courseName: string | null;
  classroom: string | null;
  date: string;
  time: string;
  state: string;
  result: UnifiedAttendanceResult;
  verificationMethod: UnifiedAttendanceMethod;
  signatureVerified: boolean;
  bleRequired: boolean;
  bleValidated: boolean;
  entryRecordId: number | null;
  courseRecordId: number | null;
  detail: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface UnifiedAttendanceSummary {
  total: number;
  registered: number;
  duplicate: number;
  rejected: number;
  dynamicQr: number;
  mobileBiometric: number;
  offline: number;
  other: number;
  courses: number;
  institutionalEntries: number;
}

export interface UnifiedAttendanceHistory {
  total: number;
  limit: number;
  offset: number;
  summary: UnifiedAttendanceSummary;
  records: UnifiedAttendanceRecord[];
}

export interface UnifiedAttendanceFilters {
  search?: string;
  teacherId?: number | null;
  method?: UnifiedAttendanceMethod | "";
  result?: UnifiedAttendanceResult | "";
  targetType?: UnifiedAttendanceTarget | "";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AttendanceCleanupCounts {
  qr: number;
  offline: number;
  signatures: number;
  challenges: number;
  courses: number;
  institutionalEntries: number;
  total: number;
}

export interface AttendanceCleanupPreview {
  teacher: {
    teacherId: number;
    userId: number;
    code: string;
    names: string;
    surnames: string;
    email: string;
  };
  date: string;
  counts: AttendanceCleanupCounts;
  records: UnifiedAttendanceRecord[];
}

export interface AttendanceCleanupResult {
  message: string;
  backupPath: string;
  deleted: Record<string, number>;
}
