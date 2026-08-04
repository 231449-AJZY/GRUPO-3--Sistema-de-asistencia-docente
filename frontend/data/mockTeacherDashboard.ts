import type {
  TeacherAttendanceRecord,
} from "@/types/teacherDashboard";

export const DASHBOARD_TEACHER_CODE =
  "DOC-001";

export const initialTeacherAttendanceRecords:
  TeacherAttendanceRecord[] = [
  {
    id: 1,
    scheduleId: 2,
    date: "2026-07-01",
    entryAt:
      "2026-07-01T09:55:00-05:00",
    exitAt:
      "2026-07-01T12:03:00-05:00",
    status: "presente",
    method: "Biométrico",
    observation:
      "Marcación completada correctamente.",
  },
  {
    id: 2,
    scheduleId: 1,
    date: "2026-07-06",
    entryAt:
      "2026-07-06T08:14:00-05:00",
    exitAt:
      "2026-07-06T10:01:00-05:00",
    status: "tardanza",
    method: "Biométrico",
    observation:
      "Ingreso posterior a la tolerancia.",
  },
  {
    id: 3,
    scheduleId: 2,
    date: "2026-07-08",
    entryAt: null,
    exitAt: null,
    status: "ausente",
    method: "Sistema",
    observation:
      "No se registró marcación de ingreso.",
  },
  {
    id: 4,
    scheduleId: 1,
    date: "2026-07-13",
    entryAt:
      "2026-07-13T07:58:00-05:00",
    exitAt:
      "2026-07-13T10:04:00-05:00",
    status: "presente",
    method: "Biométrico",
    observation:
      "Asistencia registrada dentro del horario.",
  },
  {
    id: 5,
    scheduleId: 1,
    date: "2026-06-29",
    entryAt:
      "2026-06-29T08:02:00-05:00",
    exitAt:
      "2026-06-29T10:00:00-05:00",
    status: "presente",
    method: "Biométrico",
    observation:
      "Registro normal.",
  },
];

export function cloneTeacherAttendanceRecords() {
  return initialTeacherAttendanceRecords.map(
    (record) => ({
      ...record,
    })
  );
}