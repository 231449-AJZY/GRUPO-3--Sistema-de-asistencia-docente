"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";

import type {
  CursoAcademico,
  DiaSemana,
  DocenteHorario,
  HorarioCurso,
} from "@/types/horario";

interface WeeklyScheduleProps {
  horarios: HorarioCurso[];
  cursos: CursoAcademico[];
  docentes: DocenteHorario[];
}

type ViewMode =
  | "calendar"
  | "cards";

type NumericFilter =
  | "all"
  | number;

const DAYS: Array<{
  id: DiaSemana;
  shortLabel: string;
  label: string;
}> = [
  {
    id: 1,
    shortLabel: "Lun",
    label: "Lunes",
  },
  {
    id: 2,
    shortLabel: "Mar",
    label: "Martes",
  },
  {
    id: 3,
    shortLabel: "Mié",
    label: "Miércoles",
  },
  {
    id: 4,
    shortLabel: "Jue",
    label: "Jueves",
  },
  {
    id: 5,
    shortLabel: "Vie",
    label: "Viernes",
  },
];

const START_HOUR = 7;
const END_HOUR = 20;
const HOUR_HEIGHT = 68;

const COURSE_PALETTES = [
  {
    event:
      "border-blue-300 bg-blue-100 text-blue-950",
    title:
      "text-blue-800",
    code:
      "text-blue-700",
    chip:
      "border-blue-300 bg-blue-100 text-blue-800",
    card:
      "border-blue-200 bg-blue-50",
    accent:
      "bg-blue-500",
    dot:
      "bg-blue-500",
  },
  {
    event:
      "border-emerald-300 bg-emerald-100 text-emerald-950",
    title:
      "text-emerald-800",
    code:
      "text-emerald-700",
    chip:
      "border-emerald-300 bg-emerald-100 text-emerald-800",
    card:
      "border-emerald-200 bg-emerald-50",
    accent:
      "bg-emerald-500",
    dot:
      "bg-emerald-500",
  },
  {
    event:
      "border-amber-300 bg-amber-100 text-amber-950",
    title:
      "text-amber-800",
    code:
      "text-amber-700",
    chip:
      "border-amber-300 bg-amber-100 text-amber-800",
    card:
      "border-amber-200 bg-amber-50",
    accent:
      "bg-amber-500",
    dot:
      "bg-amber-500",
  },
  {
    event:
      "border-violet-300 bg-violet-100 text-violet-950",
    title:
      "text-violet-800",
    code:
      "text-violet-700",
    chip:
      "border-violet-300 bg-violet-100 text-violet-800",
    card:
      "border-violet-200 bg-violet-50",
    accent:
      "bg-violet-500",
    dot:
      "bg-violet-500",
  },
  {
    event:
      "border-rose-300 bg-rose-100 text-rose-950",
    title:
      "text-rose-800",
    code:
      "text-rose-700",
    chip:
      "border-rose-300 bg-rose-100 text-rose-800",
    card:
      "border-rose-200 bg-rose-50",
    accent:
      "bg-rose-500",
    dot:
      "bg-rose-500",
  },
  {
    event:
      "border-cyan-300 bg-cyan-100 text-cyan-950",
    title:
      "text-cyan-800",
    code:
      "text-cyan-700",
    chip:
      "border-cyan-300 bg-cyan-100 text-cyan-800",
    card:
      "border-cyan-200 bg-cyan-50",
    accent:
      "bg-cyan-500",
    dot:
      "bg-cyan-500",
  },
  {
    event:
      "border-indigo-300 bg-indigo-100 text-indigo-950",
    title:
      "text-indigo-800",
    code:
      "text-indigo-700",
    chip:
      "border-indigo-300 bg-indigo-100 text-indigo-800",
    card:
      "border-indigo-200 bg-indigo-50",
    accent:
      "bg-indigo-500",
    dot:
      "bg-indigo-500",
  },
  {
    event:
      "border-lime-300 bg-lime-100 text-lime-950",
    title:
      "text-lime-800",
    code:
      "text-lime-700",
    chip:
      "border-lime-300 bg-lime-100 text-lime-800",
    card:
      "border-lime-200 bg-lime-50",
    accent:
      "bg-lime-500",
    dot:
      "bg-lime-500",
  },
] as const;

export default function WeeklySchedule({
  horarios,
  cursos,
  docentes,
}: WeeklyScheduleProps) {
  const [
    courseFilter,
    setCourseFilter,
  ] = useState<NumericFilter>("all");

  const [
    teacherFilter,
    setTeacherFilter,
  ] = useState<NumericFilter>("all");

  const [
    roomFilter,
    setRoomFilter,
  ] = useState("all");

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>("calendar");

  const availableCourses =
    useMemo(() => {
      const ids = new Set(
        horarios.map(
          (horario) =>
            horario.cursoId
        )
      );

      return cursos
        .filter(
          (curso) =>
            ids.has(curso.id)
        )
        .sort((first, second) =>
          first.nombre.localeCompare(
            second.nombre,
            "es"
          )
        );
    }, [
      horarios,
      cursos,
    ]);

  const availableTeachers =
    useMemo(() => {
      const ids = new Set(
        horarios.map(
          (horario) =>
            horario.docenteId
        )
      );

      return docentes
        .filter(
          (docente) =>
            ids.has(docente.id)
        )
        .sort((first, second) =>
          first.nombre.localeCompare(
            second.nombre,
            "es"
          )
        );
    }, [
      horarios,
      docentes,
    ]);

  const availableRooms =
    useMemo(() => {
      return Array.from(
        new Set(
          horarios.map(
            (horario) =>
              horario.aula
                .trim()
                .toUpperCase()
          )
        )
      ).sort((first, second) =>
        first.localeCompare(
          second,
          "es"
        )
      );
    }, [horarios]);

  const filteredSchedules =
    useMemo(() => {
      return horarios
        .filter((horario) => {
          const matchesCourse =
            courseFilter === "all" ||
            horario.cursoId ===
              courseFilter;

          const matchesTeacher =
            teacherFilter === "all" ||
            horario.docenteId ===
              teacherFilter;

          const matchesRoom =
            roomFilter === "all" ||
            horario.aula
              .trim()
              .toUpperCase() ===
              roomFilter;

          return (
            matchesCourse &&
            matchesTeacher &&
            matchesRoom
          );
        })
        .sort(compareSchedules);
    }, [
      horarios,
      courseFilter,
      teacherFilter,
      roomFilter,
    ]);

  const hasFilters =
    courseFilter !== "all" ||
    teacherFilter !== "all" ||
    roomFilter !== "all";

  function clearFilters() {
    setCourseFilter("all");
    setTeacherFilter("all");
    setRoomFilter("all");
  }

  function isolateCourse(
    courseId: number
  ) {
    setCourseFilter(
      courseFilter === courseId
        ? "all"
        : courseId
    );
  }

  return (
    <SectionCard
      title="Calendario semanal visual"
      description="Vista por horas, cursos, docentes y aulas del periodo académico seleccionado."
      action={
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-unsaac-blue">
            {filteredSchedules.length}{" "}
            clase(s)
          </span>

          {hasFilters && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-orange-700">
              Filtro activo
            </span>
          )}
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_auto_auto]">
          <FilterField label="Curso">
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
                (curso) => (
                  <option
                    key={curso.id}
                    value={curso.id}
                  >
                    {curso.codigo} -{" "}
                    {curso.nombre}
                  </option>
                )
              )}
            </select>
          </FilterField>

          <FilterField label="Docente">
            <select
              value={String(
                teacherFilter
              )}
              onChange={(event) =>
                setTeacherFilter(
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
                Todos los docentes
              </option>

              {availableTeachers.map(
                (docente) => (
                  <option
                    key={docente.id}
                    value={docente.id}
                  >
                    {docente.codigo} -{" "}
                    {docente.nombre}
                  </option>
                )
              )}
            </select>
          </FilterField>

          <FilterField label="Aula">
            <select
              value={roomFilter}
              onChange={(event) =>
                setRoomFilter(
                  event.target.value
                )
              }
              className={fieldClass}
            >
              <option value="all">
                Todas las aulas
              </option>

              {availableRooms.map(
                (room) => (
                  <option
                    key={room}
                    value={room}
                  >
                    {room}
                  </option>
                )
              )}
            </select>
          </FilterField>

          <FilterField label="Vista">
            <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
              <ViewButton
                active={
                  viewMode === "calendar"
                }
                onClick={() =>
                  setViewMode("calendar")
                }
              >
                Calendario
              </ViewButton>

              <ViewButton
                active={
                  viewMode === "cards"
                }
                onClick={() =>
                  setViewMode("cards")
                }
              >
                Tarjetas
              </ViewButton>
            </div>
          </FilterField>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-unsaac-text transition hover:border-blue-300 hover:text-unsaac-blue disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {availableCourses.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-unsaac-text">
                Colores por curso
              </p>

              <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                Pulse un curso para mostrar únicamente sus horarios.
              </p>
            </div>

            {courseFilter !== "all" && (
              <button
                type="button"
                onClick={() =>
                  setCourseFilter("all")
                }
                className="text-xs font-extrabold text-unsaac-blue hover:underline"
              >
                Mostrar todos
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {availableCourses.map(
              (curso) => {
                const palette =
                  getCoursePalette(
                    curso.id
                  );

                const active =
                  courseFilter ===
                  curso.id;

                return (
                  <button
                    key={curso.id}
                    type="button"
                    onClick={() =>
                      isolateCourse(
                        curso.id
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                      active
                        ? `${palette.chip} ring-2 ring-offset-2`
                        : "border-slate-200 bg-white text-unsaac-muted hover:border-blue-300"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${palette.dot}`}
                    />

                    <span>
                      {curso.codigo}
                    </span>

                    <span className="hidden font-semibold sm:inline">
                      {curso.nombre}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        {filteredSchedules.length ===
        0 ? (
          <EmptyState
            title="No existen clases para esta selección"
            description="Cambie el curso, docente, aula o los filtros generales de la página."
          />
        ) : viewMode === "calendar" ? (
          <CalendarView
            schedules={
              filteredSchedules
            }
            courses={cursos}
            teachers={docentes}
            onSelectCourse={
              isolateCourse
            }
          />
        ) : (
          <CardsView
            schedules={
              filteredSchedules
            }
            courses={cursos}
            teachers={docentes}
            onSelectCourse={
              isolateCourse
            }
          />
        )}
      </div>
    </SectionCard>
  );
}

function CalendarView({
  schedules,
  courses,
  teachers,
  onSelectCourse,
}: {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  teachers: DocenteHorario[];
  onSelectCourse: (
    courseId: number
  ) => void;
}) {
  const hourMarks =
    Array.from(
      {
        length:
          END_HOUR -
          START_HOUR +
          1,
      },
      (_, index) =>
        START_HOUR + index
    );

  const totalHeight =
    (
      END_HOUR -
      START_HOUR
    ) * HOUR_HEIGHT;

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-300 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[84px_repeat(5,minmax(210px,1fr))] border-b border-slate-200 bg-slate-100">
            <div className="flex h-14 items-center justify-center border-r border-slate-200 text-sm font-extrabold text-unsaac-text">
              Hora
            </div>

            {DAYS.map((day) => {
              const count =
                schedules.filter(
                  (schedule) =>
                    schedule.diaSemana ===
                    day.id
                ).length;

              return (
                <div
                  key={day.id}
                  className="flex h-14 items-center justify-center gap-2 border-r border-slate-200 px-3 last:border-r-0"
                >
                  <span className="font-extrabold text-unsaac-text">
                    {day.shortLabel}
                  </span>

                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-unsaac-blue">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[84px_repeat(5,minmax(210px,1fr))]">
            <div
              className="relative border-r border-slate-200 bg-slate-50"
              style={{
                height: totalHeight,
              }}
            >
              {hourMarks.map(
                (hour, index) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-200"
                    style={{
                      top:
                        index *
                        HOUR_HEIGHT,
                    }}
                  >
                    <span className="absolute left-0 top-0 flex w-[83px] -translate-y-1/2 justify-center bg-slate-50 px-2 text-xs font-extrabold tabular-nums text-slate-500">
                      {formatHour(hour)}
                    </span>
                  </div>
                )
              )}
            </div>

            {DAYS.map((day) => {
              const daySchedules =
                schedules.filter(
                  (schedule) =>
                    schedule.diaSemana ===
                    day.id
                );

              const positioned =
                positionSchedules(
                  daySchedules
                );

              return (
                <div
                  key={day.id}
                  className="relative border-r border-slate-200 bg-white last:border-r-0"
                  style={{
                    height: totalHeight,
                  }}
                >
                  {hourMarks.map(
                    (hour, index) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-slate-200"
                        style={{
                          top:
                            index *
                            HOUR_HEIGHT,
                        }}
                      />
                    )
                  )}

                  {positioned.map(
                    ({
                      schedule,
                      column,
                      columns,
                    }) => {
                      const course =
                        courses.find(
                          (item) =>
                            item.id ===
                            schedule.cursoId
                        );

                      const teacher =
                        teachers.find(
                          (item) =>
                            item.id ===
                            schedule.docenteId
                        );

                      const palette =
                        getCoursePalette(
                          schedule.cursoId
                        );

                      const style =
                        getScheduleStyle(
                          schedule,
                          column,
                          columns
                        );

                      return (
                        <button
                          key={schedule.id}
                          type="button"
                          onClick={() =>
                            onSelectCourse(
                              schedule.cursoId
                            )
                          }
                          className={`absolute overflow-hidden rounded-xl border p-2.5 text-left shadow-sm transition hover:z-30 hover:scale-[1.02] hover:shadow-md ${palette.event} ${
                            schedule.activo
                              ? ""
                              : "opacity-60 grayscale-[0.25]"
                          }`}
                          style={style}
                          title={[
                            course?.nombre,
                            teacher?.nombre,
                            schedule.aula,
                            `${schedule.horaInicio} - ${schedule.horaFin}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`truncate text-xs font-extrabold ${palette.code}`}
                            >
                              {course?.codigo ??
                                "CURSO"}
                            </p>

                            <span
                              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                schedule.activo
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                            />
                          </div>

                          <p
                            className={`mt-1 truncate text-sm font-extrabold ${palette.title}`}
                          >
                            {course?.nombre ??
                              "Curso"}
                          </p>

                          <p className="mt-1 text-xs font-extrabold tabular-nums">
                            {
                              schedule.horaInicio
                            }
                            {" – "}
                            {schedule.horaFin}
                          </p>

                          <p className="mt-1 truncate text-xs font-bold">
                            {schedule.aula}
                          </p>

                          <p className="mt-1 truncate text-[11px] font-semibold opacity-80">
                            {teacher?.nombre ??
                              "Docente"}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-unsaac-muted">
          Cada curso mantiene el mismo color aunque sea impartido por diferentes docentes o en distintos días y aulas.
        </p>
      </div>
    </div>
  );
}

function CardsView({
  schedules,
  courses,
  teachers,
  onSelectCourse,
}: {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  teachers: DocenteHorario[];
  onSelectCourse: (
    courseId: number
  ) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {DAYS.map((day) => {
        const daySchedules =
          schedules
            .filter(
              (schedule) =>
                schedule.diaSemana ===
                day.id
            )
            .sort(compareSchedules);

        return (
          <article
            key={day.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            <header className="flex items-center justify-between bg-unsaac-blue px-4 py-3 text-white">
              <h3 className="font-extrabold">
                {day.label}
              </h3>

              <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-extrabold">
                {daySchedules.length}
              </span>
            </header>

            <div className="space-y-3 p-3">
              {daySchedules.length >
              0 ? (
                daySchedules.map(
                  (schedule) => {
                    const course =
                      courses.find(
                        (item) =>
                          item.id ===
                          schedule.cursoId
                      );

                    const teacher =
                      teachers.find(
                        (item) =>
                          item.id ===
                          schedule.docenteId
                      );

                    const palette =
                      getCoursePalette(
                        schedule.cursoId
                      );

                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        onClick={() =>
                          onSelectCourse(
                            schedule.cursoId
                          )
                        }
                        className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette.card} ${
                          schedule.activo
                            ? ""
                            : "opacity-60"
                        }`}
                      >
                        <span
                          className={`absolute bottom-0 left-0 top-0 w-1 ${palette.accent}`}
                        />

                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`font-extrabold tabular-nums ${palette.title}`}
                          >
                            {
                              schedule.horaInicio
                            }
                            {" – "}
                            {schedule.horaFin}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border bg-white/70 px-2 py-1 text-[10px] font-extrabold ${
                              schedule.activo
                                ? "border-emerald-200 text-emerald-700"
                                : "border-red-200 text-red-700"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {schedule.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-extrabold text-unsaac-text">
                          {course?.nombre ??
                            "Curso"}
                        </p>

                        <p
                          className={`mt-1 text-xs font-extrabold ${palette.code}`}
                        >
                          {course?.codigo}
                        </p>

                        <p className="mt-3 text-xs font-semibold leading-5 text-unsaac-muted">
                          {teacher?.nombre}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                          <span className="text-xs font-extrabold text-unsaac-muted">
                            Aula
                          </span>

                          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-unsaac-blue shadow-sm">
                            {schedule.aula}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center">
                  <p className="text-xs font-bold text-unsaac-muted">
                    Sin clases
                  </p>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function ViewButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 text-xs font-extrabold transition ${
        active
          ? "bg-unsaac-blue text-white shadow-sm"
          : "text-unsaac-muted hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function positionSchedules(
  schedules: HorarioCurso[]
) {
  const sorted =
    [...schedules].sort(
      compareSchedules
    );

  return sorted.map((schedule) => {
    const overlapping =
      sorted
        .filter((candidate) =>
          schedulesOverlap(
            schedule,
            candidate
          )
        )
        .sort(compareSchedules);

    const column =
      Math.max(
        0,
        overlapping.findIndex(
          (candidate) =>
            candidate.id ===
            schedule.id
        )
      );

    return {
      schedule,
      column,
      columns:
        Math.max(
          1,
          overlapping.length
        ),
    };
  });
}

function getScheduleStyle(
  schedule: HorarioCurso,
  column: number,
  columns: number
): CSSProperties {
  const start =
    Math.max(
      START_HOUR * 60,
      timeToMinutes(
        schedule.horaInicio
      )
    );

  const end =
    Math.min(
      END_HOUR * 60,
      timeToMinutes(
        schedule.horaFin
      )
    );

  const top =
    (
      start -
      START_HOUR * 60
    ) /
      60 *
      HOUR_HEIGHT +
    4;

  const duration =
    Math.max(
      30,
      end - start
    );

  const height =
    Math.max(
      54,
      duration /
        60 *
        HOUR_HEIGHT -
        8
    );

  const widthPercentage =
    100 / columns;

  const leftPercentage =
    column * widthPercentage;

  return {
    top,
    height,
    left:
      `calc(${leftPercentage}% + 4px)`,
    width:
      `calc(${widthPercentage}% - 8px)`,
    zIndex:
      10 + column,
  };
}

function schedulesOverlap(
  first: HorarioCurso,
  second: HorarioCurso
) {
  if (
    first.diaSemana !==
    second.diaSemana
  ) {
    return false;
  }

  const firstStart =
    timeToMinutes(
      first.horaInicio
    );

  const firstEnd =
    timeToMinutes(
      first.horaFin
    );

  const secondStart =
    timeToMinutes(
      second.horaInicio
    );

  const secondEnd =
    timeToMinutes(
      second.horaFin
    );

  return (
    firstStart < secondEnd &&
    firstEnd > secondStart
  );
}

function compareSchedules(
  first: HorarioCurso,
  second: HorarioCurso
) {
  if (
    first.diaSemana !==
    second.diaSemana
  ) {
    return (
      first.diaSemana -
      second.diaSemana
    );
  }

  return first.horaInicio.localeCompare(
    second.horaInicio
  );
}

function timeToMinutes(
  value: string
) {
  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function formatHour(
  hour: number
) {
  return `${String(hour).padStart(
    2,
    "0"
  )}:00`;
}

function getCoursePalette(
  courseId: number
) {
  const index =
    Math.abs(courseId - 1) %
    COURSE_PALETTES.length;

  return COURSE_PALETTES[index];
}

const fieldClass = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4",
  "text-sm font-semibold text-unsaac-text outline-none transition",
  "focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100",
].join(" ");