export type ConfigurationSection =
  | "general"
  | "asistencia"
  | "biometria"
  | "notificaciones"
  | "seguridad"
  | "mantenimiento";

export type WorkingDay =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes";

export interface GeneralSettings {
  systemName: string;
  institutionName: string;
  institutionCode: string;
  supportEmail: string;
  timezone: string;
  language: string;
  activeAcademicPeriod: string;
}

export interface AttendanceSettings {
  institutionalEntryTime: string;
  graceMinutes: number;
  earlyCheckinMinutes: number;
  lateLimitMinutes: number;
  requireCheckout: boolean;
  allowManualValidation: boolean;
  workingDays: WorkingDay[];
}

export interface BiometricSettings {
  minimumQuality: number;
  maximumAttempts: number;
  automaticSynchronization: boolean;
  synchronizationIntervalMinutes: number;
  offlineRetentionDays: number;
  preferredDevice: string;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  deviceAlerts: boolean;
  synchronizationAlerts: boolean;
  dailySummary: boolean;
  recipientEmail: string;
}

export interface SecuritySettings {
  sessionDurationHours: number;
  maximumLoginAttempts: number;
  accountLockMinutes: number;
  requireStrongPassword: boolean;
  forcePasswordChange: boolean;
  auditEvents: boolean;
}

export interface MaintenanceSettings {
  automaticBackups: boolean;
  backupFrequency: "Diario" | "Semanal" | "Mensual";
  retentionDays: number;
  maintenanceMode: boolean;
  automaticDiagnostics: boolean;
  lastBackupAt: string;
}

export interface SystemConfiguration {
  general: GeneralSettings;
  attendance: AttendanceSettings;
  biometric: BiometricSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  maintenance: MaintenanceSettings;
}

export interface ConfigurationBackup {
  id: number;
  name: string;
  createdAt: string;
  size: string;
  status: "Completado" | "Procesando" | "Fallido";
}


export interface InstitutionalConfiguration {
  general: GeneralSettings;
  attendance: AttendanceSettings;
}

export interface ConfigurationSemesterOption {
  id: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface InstitutionalConfigurationResponse {
  configuration: InstitutionalConfiguration;
  semestres: ConfigurationSemesterOption[];
  updatedAt: string;
}
