export type BleStationType = "AULA" | "INGRESO" | "PRUEBA";

export type BleStationState =
  | "PENDIENTE"
  | "ACTIVA"
  | "SUSPENDIDA"
  | "REVOCADA";

export interface BleDepartmentOption {
  id: number;
  code: string;
  name: string;
}

export interface BleStation {
  id: number;
  uuid: string;
  code: string;
  name: string;
  type: BleStationType;
  departmentId: number | null;
  department: string | null;
  classroom: string | null;
  minimumRssi: number;
  minimumSamples: number;
  rotationSeconds: number;
  state: BleStationState;
  stateReason: string | null;
  provisionedAt: string | null;
  lastDetectionAt: string | null;
  lastDetectionRssi: number | null;
  detectionsToday: number;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  provisionedByName: string | null;
}

export interface BleConfiguration {
  rotationSeconds: number;
  slotMargin: number;
  requiredForCourse: boolean;
  requiredForEntry: boolean;
  defaultMinimumRssi: number;
  defaultMinimumSamples: number;
}

export interface BleStationSummary {
  total: number;
  pending: number;
  active: number;
  suspended: number;
  revoked: number;
  detectionsToday: number;
}

export interface BleSecurityEvent {
  id: number;
  stationId: number | null;
  type: string;
  result: string;
  detail: Record<string, unknown>;
  createdAt: string;
  stationCode: string | null;
  stationName: string | null;
  actor: string | null;
}

export interface BleStationsDashboard {
  stations: BleStation[];
  departments: BleDepartmentOption[];
  configuration: BleConfiguration;
  summary: BleStationSummary;
  events: BleSecurityEvent[];
}

export interface CreateBleStationInput {
  code: string;
  name: string;
  type: BleStationType;
  departmentId: number | null;
  classroom: string;
  minimumRssi: number;
  minimumSamples: number;
  rotationSeconds: number;
}

export interface GeneratedBleProvisioning {
  id: string;
  stationId: number;
  stationCode: string;
  stationName: string;
  expiresAt: string;
  validityMinutes: number;
  qrPayload: string;
  qrImage: string;
}
