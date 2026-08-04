export interface DashboardSummary {
  docentesActivos: number;
  asistenciasHoy: number;
  tardanzasHoy: number;
  inasistenciasHoy: number;
}

export interface DashboardMetric {
  title: string;
  value: number;
  description: string;
  color: "blue" | "green" | "yellow" | "red";
  icon: "users" | "user" | "calendar" | "warning";
  trend: number[];
}

export interface HourlyActivity {
  hour: string;
  value: number;
}

export interface RecentAlert {
  id: number;
  type: "tardanza" | "inasistencia" | "horario" | "docente";
  title: string;
  description: string;
  time: string;
}

export interface RecentAttendance {
  id: number | string;
  docente: string;
  registro?: string;
  hora: string;
  estado: "Presente" | "Tardanza" | "Inasistencia";
  aula: string;
  metodo: string;
  resultado:
    | "REGISTRADA"
    | "DUPLICADA"
    | "RECHAZADA"
    | "PENDIENTE"
    | "REQUIERE_REVISION";
}

export interface VerificationSummary {
  totalAttempts: number;
  registered: number;
  duplicate: number;
  rejected: number;
  dynamicQr: number;
  mobileBiometric: number;
  offline: number;
  other: number;
}

export interface BiometricStatus {
  connectedDevices: string;
  syncStatus: string;
  lastRecord: string;
  serverStatus: string;
}

export interface AdminDashboardData {
  summary: DashboardSummary;
  metrics: DashboardMetric[];
  hourlyActivity: HourlyActivity[];
  recentAlerts: RecentAlert[];
  recentAttendances: RecentAttendance[];
  verificationSummary: VerificationSummary;
  biometricStatus: BiometricStatus;
}
