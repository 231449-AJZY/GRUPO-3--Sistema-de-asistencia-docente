"use client";

import type {
  CursoAcademico,
  HorarioCurso,
} from "@/types/horario";

import type {
  TeacherAttendanceRecord,
} from "@/types/teacherDashboard";

interface TeacherTodayScheduleProps {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  records: TeacherAttendanceRecord[];
  currentDate: string;
  selectedScheduleId: number | null;
  onSelectSchedule: (
    schedule: HorarioCurso
  ) => void;
}

export default function TeacherTodaySchedule({
  schedules,
  courses,
  records,
  currentDate,
  selectedScheduleId,
  onSelectSchedule,
}: TeacherTodayScheduleProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-unsaac-text">
              Clases programadas hoy
            </h2>

            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              Seleccione una clase para consultar o registrar su asistencia.
            </p>
          </div>

          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-unsaac-blue">
            {schedules.length} clase(s)
          </span>
        </div>
      </header>

      <div className="space-y-3 p-5">
        {schedules.length > 0 ? (
          schedules.map((schedule) => {
            const course =
              courses.find(
                (item) =>
                  item.id ===
                  schedule.cursoId
              );

            const record =
              records.find(
                (item) =>
                  item.scheduleId ===
                    schedule.id &&
                  item.date ===
                    currentDate
              );

            const selected =
              selectedScheduleId ===
              schedule.id;

            return (
              <button
                key={schedule.id}
                type="button"
                onClick={() =>
                  onSelectSchedule(
                    schedule
                  )
                }
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-unsaac-blue bg-blue-50 shadow-sm ring-2 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="min-w-[82px] rounded-xl bg-unsaac-blue px-3 py-2 text-center text-white">
                      <p className="text-xs font-bold">
                        Inicio
                      </p>

                      <p className="mt-1 font-extrabold tabular-nums">
                        {schedule.horaInicio}
                      </p>
                    </div>

                    <div>
                      <p className="font-extrabold text-unsaac-text">
                        {course?.nombre ??
                          "Curso no disponible"}
                      </p>

                      <p className="mt-1 text-xs font-extrabold text-orange-700">
                        {course?.codigo}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-unsaac-muted">
                        {schedule.horaInicio}
                        {" – "}
                        {schedule.horaFin}
                        {" · "}
                        Aula {schedule.aula}
                      </p>
                    </div>
                  </div>

                  <AttendanceBadge
                    record={record}
                  />
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="font-extrabold text-unsaac-text">
              No tiene clases programadas hoy
            </p>

            <p className="mt-2 text-sm font-semibold text-unsaac-muted">
              Consulte el calendario semanal para revisar sus próximas clases.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function AttendanceBadge({
  record,
}: {
  record:
    | TeacherAttendanceRecord
    | undefined;
}) {
  if (!record) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Pendiente
      </span>
    );
  }

  const styles = {
    presente:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    tardanza:
      "border-orange-200 bg-orange-50 text-orange-700",
    ausente:
      "border-red-200 bg-red-50 text-red-700",
    pendiente:
      "border-slate-200 bg-slate-100 text-slate-600",
  };

  const labels = {
    presente:
      record.exitAt
        ? "Completada"
        : "Presente",
    tardanza:
      record.exitAt
        ? "Completada con tardanza"
        : "Tardanza",
    ausente: "Ausente",
    pendiente: "Pendiente",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${styles[record.status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {labels[record.status]}
    </span>
  );
}