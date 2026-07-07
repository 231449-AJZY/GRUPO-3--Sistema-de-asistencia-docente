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
  id: number;
  docente: string;
  hora: string;
  estado: "Presente" | "Tardanza" | "Inasistencia";
  aula: string;
  metodo: "Biométrico" | "Manual";
}

export interface BiometricStatus {
  connectedDevices: string;
  syncStatus: string;
  lastRecord: string;
  serverStatus: string;
}

export interface AdminDashboardData {
  metrics: DashboardMetric[];
  hourlyActivity: HourlyActivity[];
  recentAlerts: RecentAlert[];
  recentAttendances: RecentAttendance[];
  biometricStatus: BiometricStatus;
}