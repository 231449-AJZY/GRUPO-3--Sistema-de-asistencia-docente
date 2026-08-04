"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import type {
  CursoAcademico,
  DiaSemana,
  HorarioCurso,
} from "@/types/horario";

interface TeacherWeeklyCalendarProps {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  selectedScheduleId: number | null;
  onSelectSchedule: (
    schedule: HorarioCurso
  ) => void;
}

type ViewMode =
  | "calendar"
  | "agenda";

type NumericFilter =
  | "all"
  | number;

const DAYS: Array<{
  id: DiaSemana;
  label: string;
  shortLabel: string;
}> = [
  {
    id: 1,
    label: "Lunes",
    shortLabel: "Lun",
  },
  {
    id: 2,
    label: "Martes",
    shortLabel: "Mar",
  },
  {
    id: 3,
    label: "Miércoles",
    shortLabel: "Mié",
  },
  {
    id: 4,
    label: "Jueves",
    shortLabel: "Jue",
  },
  {
    id: 5,
    label: "Viernes",
    shortLabel: "Vie",
  },
];

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 66;

const COURSE_PALETTES = [
  {
    event:
      "border-blue-300 bg-blue-100 text-blue-950",
    title:
      "text-blue-900",
    code:
      "text-blue-700",
    chip:
      "border-blue-300 bg-blue-100 text-blue-800",
    card:
      "border-blue-200 bg-blue-50",
    line:
      "bg-blue-500",
    dot:
      "bg-blue-500",
  },
  {
    event:
      "border-emerald-300 bg-emerald-100 text-emerald-950",
    title:
      "text-emerald-900",
    code:
      "text-emerald-700",
    chip:
      "border-emerald-300 bg-emerald-100 text-emerald-800",
    card:
      "border-emerald-200 bg-emerald-50",
    line:
      "bg-emerald-500",
    dot:
      "bg-emerald-500",
  },
  {
    event:
      "border-amber-300 bg-amber-100 text-amber-950",
    title:
      "text-amber-900",
    code:
      "text-amber-700",
    chip:
      "border-amber-300 bg-amber-100 text-amber-800",
    card:
      "border-amber-200 bg-amber-50",
    line:
      "bg-amber-500",
    dot:
      "bg-amber-500",
  },
  {
    event:
      "border-violet-300 bg-violet-100 text-violet-950",
    title:
      "text-violet-900",
    code:
      "text-violet-700",
    chip:
      "border-violet-300 bg-violet-100 text-violet-800",
    card:
      "border-violet-200 bg-violet-50",
    line:
      "bg-violet-500",
    dot:
      "bg-violet-500",
  },
  {
    event:
      "border-rose-300 bg-rose-100 text-rose-950",
    title:
      "text-rose-900",
    code:
      "text-rose-700",
    chip:
      "border-rose-300 bg-rose-100 text-rose-800",
    card:
      "border-rose-200 bg-rose-50",
    line:
      "bg-rose-500",
    dot:
      "bg-rose-500",
  },
  {
    event:
      "border-cyan-300 bg-cyan-100 text-cyan-950",
    title:
      "text-cyan-900",
    code:
      "text-cyan-700",
    chip:
      "border-cyan-300 bg-cyan-100 text-cyan-800",
    card:
      "border-cyan-200 bg-cyan-50",
    line:
      "bg-cyan-500",
    dot:
      "bg-cyan-500",
  },
  {
    event:
      "border-indigo-300 bg-indigo-100 text-indigo-950",
    title:
      "text-indigo-900",
    code:
      "text-indigo-700",
    chip:
      "border-indigo-300 bg-indigo-100 text-indigo-800",
    card:
      "border-indigo-200 bg-indigo-50",
    line:
      "bg-indigo-500",
    dot:
      "bg-indigo-500",
  },
] as const;

export default function TeacherWeeklyCalendar({
  schedules,
  courses,
  selectedScheduleId,
  onSelectSchedule,
}: TeacherWeeklyCalendarProps) {
  const [
    courseFilter,
    setCourseFilter,
  ] = useState<NumericFilter>("all");

  const [
    dayFilter,
    setDayFilter,
  ] = useState<
    "all" | DiaSemana
  >("all");

  const [
    roomFilter,
    setRoomFilter,
  ] = useState("all");

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>(
    "calendar"
  );

  const availableCourses =
    useMemo(() => {
      const ids =
        new Set(
          schedules.map(
            (schedule) =>
              schedule.cursoId
          )
        );

      return courses
        .filter((course) =>
          ids.has(course.id)
        )
        .sort((first, second) =>
          first.nombre.localeCompare(
            second.nombre,
            "es"
          )
        );
    }, [
      schedules,
      courses,
    ]);

  const availableRooms =
    useMemo(() => {
      return Array.from(
        new Set(
          schedules.map(
            (schedule) =>
              schedule.aula
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
    }, [schedules]);

  const visibleDays =
    useMemo(() => {
      if (dayFilter === "all") {
        return DAYS;
      }

      return DAYS.filter(
        (day) =>
          day.id === dayFilter
      );
    }, [dayFilter]);

  const filteredSchedules =
    useMemo(() => {
      return schedules
        .filter((schedule) => {
          const matchesCourse =
            courseFilter === "all" ||
            schedule.cursoId ===
              courseFilter;

          const matchesDay =
            dayFilter === "all" ||
            schedule.diaSemana ===
              dayFilter;

          const matchesRoom =
            roomFilter === "all" ||
            schedule.aula
              .trim()
              .toUpperCase() ===
              roomFilter;

          return (
            matchesCourse &&
            matchesDay &&
            matchesRoom
          );
        })
        .sort(compareSchedules);
    }, [
      schedules,
      courseFilter,
      dayFilter,
      roomFilter,
    ]);

  const hasFilters =
    courseFilter !== "all" ||
    dayFilter !== "all" ||
    roomFilter !== "all";

  function clearFilters() {
    setCourseFilter("all");
    setDayFilter("all");
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
    <section
      id="mi-horario"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#075A9D]">
              Programación académica
            </p>

            <h2 className="mt-2 text-xl font-black text-[#17324D] sm:text-2xl">
              Mi horario semanal
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Calendario por horas, cursos y aulas asignadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-[#075A9D]">
              {filteredSchedules.length} clase(s)
            </span>

            {hasFilters && (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
                Filtro activo
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_190px_190px_auto_auto]">
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
                  Todos mis cursos
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
            </FilterField>

            <FilterField label="Día">
              <select
                value={String(
                  dayFilter
                )}
                onChange={(event) =>
                  setDayFilter(
                    event.target.value ===
                      "all"
                      ? "all"
                      : Number(
                          event.target.value
                        ) as DiaSemana
                  )
                }
                className={fieldClass}
              >
                <option value="all">
                  Toda la semana
                </option>

                {DAYS.map((day) => (
                  <option
                    key={day.id}
                    value={day.id}
                  >
                    {day.label}
                  </option>
                ))}
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
              <div className="flex h-11 rounded-xl border border-slate-200 bg-white p-1">
                <ViewButton
                  active={
                    viewMode ===
                    "calendar"
                  }
                  onClick={() =>
                    setViewMode(
                      "calendar"
                    )
                  }
                >
                  Calendario
                </ViewButton>

                <ViewButton
                  active={
                    viewMode ===
                    "agenda"
                  }
                  onClick={() =>
                    setViewMode(
                      "agenda"
                    )
                  }
                >
                  Agenda
                </ViewButton>
              </div>
            </FilterField>

            <div className="flex items-end">
              <button
                type="button"
                disabled={!hasFilters}
                onClick={clearFilters}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#17324D] transition hover:border-blue-300 hover:text-[#075A9D] disabled:cursor-not-allowed disabled:opacity-45 xl:w-auto"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {availableCourses.length >
          0 && (
          <div className="mt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#17324D]">
                  Colores por curso
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Seleccione un curso para aislar sus horarios.
                </p>
              </div>

              {courseFilter !==
                "all" && (
                <button
                  type="button"
                  onClick={() =>
                    setCourseFilter(
                      "all"
                    )
                  }
                  className="text-xs font-black text-[#075A9D] hover:underline"
                >
                  Mostrar todos
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {availableCourses.map(
                (course) => {
                  const palette =
                    getCoursePalette(
                      course.id
                    );

                  const active =
                    courseFilter ===
                    course.id;

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() =>
                        isolateCourse(
                          course.id
                        )
                      }
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                        active
                          ? `${palette.chip} ring-2 ring-offset-2`
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${palette.dot}`}
                      />

                      <span>
                        {course.codigo}
                      </span>

                      <span className="hidden font-semibold md:inline">
                        {course.nombre}
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
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <p className="font-black text-[#17324D]">
                No existen clases para esta selección
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Cambie el curso, día o aula para consultar otros horarios.
              </p>
            </div>
          ) : viewMode ===
            "calendar" ? (
            <CalendarView
              schedules={
                filteredSchedules
              }
              courses={courses}
              days={visibleDays}
              selectedScheduleId={
                selectedScheduleId
              }
              onSelectSchedule={
                onSelectSchedule
              }
            />
          ) : (
            <AgendaView
              schedules={
                filteredSchedules
              }
              courses={courses}
              days={visibleDays}
              selectedScheduleId={
                selectedScheduleId
              }
              onSelectSchedule={
                onSelectSchedule
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function CalendarView({
  schedules,
  courses,
  days,
  selectedScheduleId,
  onSelectSchedule,
}: {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  days: typeof DAYS;
  selectedScheduleId:
    | number
    | null;
  onSelectSchedule: (
    schedule: HorarioCurso
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

  const minimumWidth =
    84 +
    days.length * 230;

  const columns =
    `84px repeat(${days.length}, minmax(230px, 1fr))`;

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-300 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div
          style={{
            minWidth:
              minimumWidth,
          }}
        >
          <div
            className="grid border-b border-slate-200 bg-slate-100"
            style={{
              gridTemplateColumns:
                columns,
            }}
          >
            <div className="flex h-14 items-center justify-center border-r border-slate-200 text-sm font-black text-[#17324D]">
              Hora
            </div>

            {days.map((day) => {
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
                  <span className="font-black text-[#17324D]">
                    {day.shortLabel}
                  </span>

                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#075A9D]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns:
                columns,
            }}
          >
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
                    <span className="absolute left-0 top-0 flex w-[83px] -translate-y-1/2 justify-center bg-slate-50 px-2 text-xs font-black tabular-nums text-slate-500">
                      {formatHour(hour)}
                    </span>
                  </div>
                )
              )}
            </div>

            {days.map((day) => {
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
                      columns:
                        eventColumns,
                    }) => {
                      const course =
                        courses.find(
                          (item) =>
                            item.id ===
                            schedule.cursoId
                        );

                      const palette =
                        getCoursePalette(
                          schedule.cursoId
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
                          className={`absolute overflow-hidden rounded-xl border p-2.5 text-left shadow-sm transition hover:z-30 hover:scale-[1.02] hover:shadow-lg ${palette.event} ${
                            selected
                              ? "ring-2 ring-[#075A9D] ring-offset-2"
                              : ""
                          } ${
                            schedule.activo
                              ? ""
                              : "opacity-55 grayscale-[0.2]"
                          }`}
                          style={getScheduleStyle(
                            schedule,
                            column,
                            eventColumns
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`truncate text-xs font-black ${palette.code}`}
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
                            className={`mt-1 line-clamp-2 text-sm font-black leading-4 ${palette.title}`}
                          >
                            {course?.nombre ??
                              "Curso"}
                          </p>

                          <p className="mt-2 text-xs font-black tabular-nums">
                            {
                              schedule.horaInicio
                            }
                            {" – "}
                            {schedule.horaFin}
                          </p>

                          <p className="mt-1 truncate text-xs font-bold">
                            Aula{" "}
                            {schedule.aula}
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

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">
          Cada curso conserva el mismo color en todos los días y aulas.
        </p>
      </footer>
    </div>
  );
}

function AgendaView({
  schedules,
  courses,
  days,
  selectedScheduleId,
  onSelectSchedule,
}: {
  schedules: HorarioCurso[];
  courses: CursoAcademico[];
  days: typeof DAYS;
  selectedScheduleId:
    | number
    | null;
  onSelectSchedule: (
    schedule: HorarioCurso
  ) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-4"
      style={{
        gridTemplateColumns:
          days.length > 1
            ? `repeat(${days.length}, minmax(220px, 1fr))`
            : "minmax(0, 1fr)",
      }}
    >
      {days.map((day) => {
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
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            <header className="flex items-center justify-between bg-[#075A9D] px-4 py-3 text-white">
              <h3 className="font-black">
                {day.label}
              </h3>

              <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-black">
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

                    const palette =
                      getCoursePalette(
                        schedule.cursoId
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
                        className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette.card} ${
                          selected
                            ? "ring-2 ring-[#075A9D] ring-offset-2"
                            : ""
                        }`}
                      >
                        <span
                          className={`absolute bottom-0 left-0 top-0 w-1 ${palette.line}`}
                        />

                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`font-black tabular-nums ${palette.title}`}
                          >
                            {
                              schedule.horaInicio
                            }
                            {" – "}
                            {schedule.horaFin}
                          </p>

                          <span
                            className={`mt-1 h-2 w-2 rounded-full ${
                              schedule.activo
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                        </div>

                        <p className="mt-3 text-sm font-black leading-5 text-[#17324D]">
                          {course?.nombre}
                        </p>

                        <p
                          className={`mt-1 text-xs font-black ${palette.code}`}
                        >
                          {course?.codigo}
                        </p>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-300/60 pt-3">
                          <span className="text-xs font-bold text-slate-500">
                            Aula
                          </span>

                          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black text-[#075A9D] shadow-sm">
                            {schedule.aula}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center">
                  <p className="text-xs font-bold text-slate-500">
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
  children:
    ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
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
  children:
    ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 text-xs font-black transition ${
        active
          ? "bg-[#075A9D] text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100"
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

  return sorted.map(
    (schedule) => {
      const overlapping =
        sorted
          .filter(
            (candidate) =>
              schedulesOverlap(
                schedule,
                candidate
              )
          )
          .sort(
            compareSchedules
          );

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
    }
  );
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
      58,
      duration /
        60 *
        HOUR_HEIGHT -
        8
    );

  const width =
    100 / columns;

  const left =
    column * width;

  return {
    top,
    height,
    left:
      `calc(${left}% + 4px)`,
    width:
      `calc(${width}% - 8px)`,
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
  "text-sm font-semibold text-[#17324D] outline-none transition",
  "focus:border-[#075A9D] focus:ring-4 focus:ring-blue-100",
].join(" ");