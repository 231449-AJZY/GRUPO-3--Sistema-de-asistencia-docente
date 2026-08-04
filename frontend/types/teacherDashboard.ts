export type TeacherAttendanceStatus =
  | "pendiente"
  | "presente"
  | "tardanza"
  | "ausente";

export type TeacherAttendanceMethod =
  | "Biométrico"
  | "Manual"
  | "Sistema";

export interface TeacherAttendanceRecord {
  id: number;
  scheduleId: number;
  date: string;
  entryAt: string | null;
  exitAt: string | null;
  status: TeacherAttendanceStatus;
  method: TeacherAttendanceMethod;
  observation: string;
}

export interface TeacherMonthlySummary {
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  completedHours: number;
}