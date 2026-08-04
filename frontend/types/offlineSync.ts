export type OfflineSyncStatus =
  | "PENDIENTE"
  | "REGISTRADA"
  | "DUPLICADA"
  | "RECHAZADA"
  | "REQUIERE_REVISION";

export interface OfflineSyncSummary {
  total: number;
  registered: number;
  duplicated: number;
  rejected: number;
  review: number;
  receivedToday: number;
}

export interface OfflineSyncRecord {
  id: number;
  localId: string;
  batchId: string | null;
  credentialId: string;
  deviceId: number;
  teacherId: number;
  teacherCode: string;
  teacherName: string;
  department: string | null;
  manufacturer: string | null;
  model: string | null;
  scheduleId: number | null;
  courseCode: string | null;
  course: string | null;
  classroom: string | null;
  stationId: number | null;
  stationCode: string | null;
  stationName: string | null;
  sequence: number;
  estimatedAt: string;
  estimatedDate: string;
  estimatedTime: string;
  signatureVerified: boolean;
  trustedClock: boolean;
  bleValidated: boolean;
  status: OfflineSyncStatus;
  reason: string | null;
  receivedAt: string;
  reviewedAt: string | null;
  reviewObservation: string | null;
}

export interface OfflineSyncBatch {
  id: string;
  deviceId: number;
  credentialId: string | null;
  status: string;
  total: number;
  registered: number;
  duplicated: number;
  rejected: number;
  review: number;
  startedAt: string;
  completedAt: string | null;
  manufacturer: string | null;
  model: string | null;
  teacherCode: string;
  teacherName: string;
}

export interface OfflineSyncConflict {
  id: number;
  recordId: number;
  type: string;
  status: string;
  detail: Record<string, unknown>;
  createdAt: string;
  localId: string;
  teacherCode: string;
  teacherName: string;
  course: string | null;
  classroom: string | null;
}

export interface OfflineSyncDashboard {
  summary: OfflineSyncSummary;
  records: OfflineSyncRecord[];
  batches: OfflineSyncBatch[];
  conflicts: OfflineSyncConflict[];
}
