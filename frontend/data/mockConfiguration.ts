import type {
  ConfigurationBackup,
  SystemConfiguration,
} from "@/types/configuration";

export const defaultSystemConfiguration: SystemConfiguration = {
  general: {
    systemName:
      "Sistema de Asistencia Docente",
    institutionName:
      "Universidad Nacional de San Antonio Abad del Cusco",
    institutionCode: "UNSAAC",
    supportEmail:
      "soporte@unsaac.edu.pe",
    timezone: "America/Lima",
    language: "Español",
    activeAcademicPeriod: "2026-I",
  },

  attendance: {
    institutionalEntryTime: "09:00",
    graceMinutes: 10,
    earlyCheckinMinutes: 30,
    lateLimitMinutes: 20,
    requireCheckout: true,
    allowManualValidation: true,
    workingDays: [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
    ],
  },

  biometric: {
    minimumQuality: 80,
    maximumAttempts: 3,
    automaticSynchronization: true,
    synchronizationIntervalMinutes: 15,
    offlineRetentionDays: 7,
    preferredDevice: "BIO-001",
  },

  notifications: {
    emailAlerts: true,
    deviceAlerts: true,
    synchronizationAlerts: true,
    dailySummary: false,
    recipientEmail:
      "administracion@unsaac.edu.pe",
  },

  security: {
    sessionDurationHours: 8,
    maximumLoginAttempts: 5,
    accountLockMinutes: 15,
    requireStrongPassword: true,
    forcePasswordChange: false,
    auditEvents: true,
  },

  maintenance: {
    automaticBackups: true,
    backupFrequency: "Diario",
    retentionDays: 30,
    maintenanceMode: false,
    automaticDiagnostics: true,
    lastBackupAt:
      "2026-07-15T04:00:00",
  },
};

export const initialSystemConfiguration: SystemConfiguration = {
  ...defaultSystemConfiguration,

  general: {
    ...defaultSystemConfiguration.general,
  },

  attendance: {
    ...defaultSystemConfiguration.attendance,
    workingDays: [
      ...defaultSystemConfiguration
        .attendance.workingDays,
    ],
  },

  biometric: {
    ...defaultSystemConfiguration.biometric,
  },

  notifications: {
    ...defaultSystemConfiguration.notifications,
  },

  security: {
    ...defaultSystemConfiguration.security,
  },

  maintenance: {
    ...defaultSystemConfiguration.maintenance,
  },
};

export const mockConfigurationBackups: ConfigurationBackup[] = [
  {
    id: 1,
    name: "respaldo-2026-07-15",
    createdAt: "2026-07-15T04:00:00",
    size: "1.84 MB",
    status: "Completado",
  },
  {
    id: 2,
    name: "respaldo-2026-07-14",
    createdAt: "2026-07-14T04:00:00",
    size: "1.81 MB",
    status: "Completado",
  },
  {
    id: 3,
    name: "respaldo-2026-07-13",
    createdAt: "2026-07-13T04:00:00",
    size: "1.79 MB",
    status: "Completado",
  },
];
