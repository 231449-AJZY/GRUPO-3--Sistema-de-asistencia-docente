"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  CursoAcademico,
  HorarioCurso,
} from "@/types/horario";

import type {
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
} from "@/types/teacherDashboard";

interface TeacherAttendanceHistoryProps {
  records: TeacherAttendanceRecord[];
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
}

type StatusFilter =
  | "all"
  | TeacherAttendanceStatus;

export default function TeacherAttendanceHistory({
  records,
  schedules,
  courses,
}: TeacherAttendanceHistoryProps) {
  const [courseFilter, setCourseFilter] =
    useState<number | "all">("all");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const availableCourses =
    useMemo(() => {
      const ids = new Set(
        schedules.map(
          (schedule) =>
            schedule.cursoId
        )
      );

      return courses.filter(
        (course) =>
          ids.has(course.id)
      );
    }, [
      schedules,
      courses,
    ]);

  const filteredRecords =
    useMemo(() => {
      return [...records]
        .filter((record) => {
          const schedule =
            schedules.find(
              (item) =>
                item.id ===
                record.scheduleId
            );

          const matchesCourse =
            courseFilter === "all" ||
            schedule?.cursoId ===
              courseFilter;

          const matchesStatus =
            statusFilter === "all" ||
            record.status ===
              statusFilter;

          return (
            matchesCourse &&
            matchesStatus
          );
        })
        .sort((first, second) =>
          second.date.localeCompare(
            first.date
          )
        );
    }, [
      records,
      schedules,
      courseFilter,
      statusFilter,
    ]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-unsaac-text">
              Historial de asistencia
            </h2>

            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              Marcaciones recientes asociadas a sus cursos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={String(
                courseFilter
              )}
              onChange={(event) =>
                setCourseFilter(
                  event.target.value ===
                    "all"
                    ? "all"
                    : Number(
                        event.target.value
                      )
                )
              }
              className={fieldClass}
            >
              <option value="all">
                Todos los cursos
              </option>

              {availableCourses.map(
                (course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.codigo} -{" "}
                    {course.nombre}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              className={fieldClass}
            >
              <option value="all">
                Todos los estados
              </option>

              <option value="presente">
                Presente
              </option>

              <option value="tardanza">
                Tardanza
              </option>

              <option value="ausente">
                Ausente
              </option>

              <option value="pendiente">
                Pendiente
              </option>
            </select>
          </div>
        </div>
      </header>

      {filteredRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={headerClass}>
                  Fecha
                </th>

                <th className={headerClass}>
                  Curso
                </th>

                <th className={headerClass}>
                  Horario
                </th>

                <th className={headerClass}>
                  Entrada
                </th>

                <th className={headerClass}>
                  Salida
                </th>

                <th className={headerClass}>
                  Método
                </th>

                <th className={headerClass}>
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(
                (record) => {
                  const schedule =
                    schedules.find(
                      (item) =>
                        item.id ===
                        record.scheduleId
                    );

                  const course =
                    courses.find(
                      (item) =>
                        item.id ===
                        schedule?.cursoId
                    );

                  return (
                    <tr
                      key={record.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className={cellClass}>
                        <p className="font-extrabold text-unsaac-text">
                          {formatDate(
                            record.date
                          )}
                        </p>
                      </td>

                      <td className={cellClass}>
                        <p className="font-extrabold text-unsaac-text">
                          {course?.nombre}
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-unsaac-blue">
                          {course?.codigo}
                        </p>
                      </td>

                      <td className={cellClass}>
                        <p className="font-bold tabular-nums text-unsaac-text">
                          {
                            schedule?.horaInicio
                          }
                          {" – "}
                          {schedule?.horaFin}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                          Aula{" "}
                          {schedule?.aula}
                        </p>
                      </td>

                      <td className={cellClass}>
                        {formatTime(
                          record.entryAt
                        )}
                      </td>

                      <td className={cellClass}>
                        {formatTime(
                          record.exitAt
                        )}
                      </td>

                      <td className={cellClass}>
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-unsaac-blue">
                          {record.method}
                        </span>
                      </td>

                      <td className={cellClass}>
                        <AttendanceStatus
                          status={
                            record.status
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="font-extrabold text-unsaac-text">
            No existen registros para los filtros seleccionados
          </p>

          <p className="mt-2 text-sm font-semibold text-unsaac-muted">
            Cambie el curso o estado para consultar otro resultado.
          </p>
        </div>
      )}
    </div>
  );
}

function AttendanceStatus({
  status,
}: {
  status: TeacherAttendanceStatus;
}) {
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
    presente: "Presente",
    tardanza: "Tardanza",
    ausente: "Ausente",
    pendiente: "Pendiente",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${styles[status]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(
    new Date(`${value}T12:00:00Z`)
  );
}

function formatTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Lima",
    }
  ).format(new Date(value));
}

const headerClass =
  "whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500";

const cellClass =
  "px-5 py-4 align-middle text-sm";

const fieldClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100";