"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import {
  clearSession,
  getLegacyUser,
  getToken,
} from "@/lib/auth";

import styles from "./page.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

const WEEK_DAYS = [
  "Lun",
  "Mar",
  "Mie",
  "Jue",
  "Vie",
  "Sab",
  "Dom",
] as const;

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
] as const;

const COURSE_TONES = [
  "blue",
  "emerald",
  "violet",
  "amber",
  "rose",
  "cyan",
  "indigo",
  "lime",
] as const;

interface UserData {
  id: number;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  email?: string;
  rol: string;
  codigo?: string;
  departamento?: string;
}

interface BackendSchedule {
  id: number | string;
  docente_id: number | string;
  curso_id: number | string;
  semestre_id: number | string;
  aula?: string;
  dia_semana: number | string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  curso_codigo?: string;
  curso?: string;
  creditos?: number | string;
  semestre?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  semestre_activo?: boolean;
}

interface Schedule {
  id: number;
  courseId: number;
  semesterId: number;
  room: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  courseCode: string;
  courseName: string;
  credits: number;
  semesterCode: string;
  semesterStart: string;
  semesterEnd: string;
  semesterActive: boolean;
}

interface SemesterOption {
  id: number;
  code: string;
  start: string;
  end: string;
  active: boolean;
}

interface CalendarDay {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  inSemester: boolean;
  schedules: Schedule[];
}

interface UpcomingEvent {
  date: Date;
  schedule: Schedule;
}

class CalendarRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "CalendarRequestError";
    this.status = status;
  }
}

function cleanDate(
  value: string
): string {
  return String(value ?? "").split(
    "T"
  )[0];
}

function parseDate(
  value: string
): Date | null {
  const clean = cleanDate(value);
  const [year, month, day] =
    clean.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  );
}

function dateKey(
  date: Date
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDay(
  date: Date
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result = new Date(date);
  result.setDate(
    result.getDate() + amount
  );
  return result;
}

function addMonths(
  date: Date,
  amount: number
): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
    12,
    0,
    0,
    0
  );
}

function monthKey(
  date: Date
): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatDate(
  date: Date
): string {
  return date.toLocaleDateString(
    "es-PE",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function formatShortDate(
  date: Date
): string {
  return date.toLocaleDateString(
    "es-PE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatMonth(
  date: Date
): string {
  const text =
    date.toLocaleDateString(
      "es-PE",
      {
        month: "long",
        year: "numeric",
      }
    );

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function formatTime(
  value: string
): string {
  return (
    String(value ?? "").slice(0, 5) ||
    "--:--"
  );
}

function getUserName(
  user: UserData | null
): string {
  if (!user) {
    return "Docente";
  }

  const splitName =
    `${user.nombres ?? ""} ${
      user.apellidos ?? ""
    }`.trim();

  return (
    splitName ||
    user.nombre ||
    "Docente"
  );
}

function getCourseTone(
  courseId: number
): (typeof COURSE_TONES)[number] {
  const index =
    Math.abs(courseId - 1) %
    COURSE_TONES.length;

  return COURSE_TONES[index];
}

function normalizeSchedule(
  raw: BackendSchedule
): Schedule {
  return {
    id: Number(raw.id),
    courseId: Number(raw.curso_id),
    semesterId: Number(
      raw.semestre_id
    ),
    room: raw.aula ?? "",
    dayOfWeek: Number(
      raw.dia_semana
    ),
    startTime: String(
      raw.hora_inicio ?? ""
    ).slice(0, 5),
    endTime: String(
      raw.hora_fin ?? ""
    ).slice(0, 5),
    active: Boolean(raw.activo),
    courseCode:
      raw.curso_codigo ?? "",
    courseName: raw.curso ?? "",
    credits: Number(
      raw.creditos ?? 0
    ),
    semesterCode:
      raw.semestre ?? "",
    semesterStart: cleanDate(
      raw.fecha_inicio ?? ""
    ),
    semesterEnd: cleanDate(
      raw.fecha_fin ?? ""
    ),
    semesterActive: Boolean(
      raw.semestre_activo
    ),
  };
}

async function requestSchedules(
  token: string,
  signal: AbortSignal
): Promise<Schedule[]> {
  const response = await fetch(
    `${API_URL}/horarios/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal,
    }
  );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | {
          horarios?: BackendSchedule[];
          error?: string;
        }
      | null;

  if (!response.ok) {
    throw new CalendarRequestError(
      data?.error ??
        "No se pudo cargar el calendario academico.",
      response.status
    );
  }

  return (
    data?.horarios ?? []
  ).map(normalizeSchedule);
}

function isWithinRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  const current =
    startOfDay(date).getTime();

  return (
    current >=
      startOfDay(start).getTime() &&
    current <=
      startOfDay(end).getTime()
  );
}

function getMondayIndex(
  jsDay: number
): number {
  return jsDay === 0
    ? 6
    : jsDay - 1;
}

function buildCalendarDays(
  month: Date,
  schedules: Schedule[],
  semester: SemesterOption
): CalendarDay[] {
  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
    12
  );
  const start = addDays(
    first,
    -getMondayIndex(
      first.getDay()
    )
  );
  const semesterStart =
    parseDate(semester.start);
  const semesterEnd =
    parseDate(semester.end);

  return Array.from(
    { length: 42 },
    (_, index) => {
      const date = addDays(
        start,
        index
      );
      const inSemester =
        semesterStart &&
        semesterEnd
          ? isWithinRange(
              date,
              semesterStart,
              semesterEnd
            )
          : false;

      const daySchedules =
        inSemester
          ? schedules
              .filter(
                (schedule) =>
                  schedule.active &&
                  schedule.dayOfWeek ===
                    date.getDay()
              )
              .sort((firstItem, secondItem) =>
                firstItem.startTime.localeCompare(
                  secondItem.startTime
                )
              )
          : [];

      return {
        date,
        key: dateKey(date),
        inCurrentMonth:
          date.getMonth() ===
            month.getMonth() &&
          date.getFullYear() ===
            month.getFullYear(),
        inSemester,
        schedules: daySchedules,
      };
    }
  );
}

function projectedMonthSessions(
  month: Date,
  schedules: Schedule[],
  semester: SemesterOption
): number {
  return buildCalendarDays(
    month,
    schedules,
    semester
  )
    .filter(
      (day) =>
        day.inCurrentMonth
    )
    .reduce(
      (total, day) =>
        total +
        day.schedules.length,
      0
    );
}

function academicWeeks(
  semester: SemesterOption
): number {
  const start =
    parseDate(semester.start);
  const end =
    parseDate(semester.end);

  if (!start || !end) {
    return 0;
  }

  const milliseconds =
    startOfDay(end).getTime() -
    startOfDay(start).getTime();
  const days =
    Math.floor(
      milliseconds /
        86_400_000
    ) + 1;

  return Math.ceil(days / 7);
}

function buildUpcomingEvents(
  schedules: Schedule[],
  semester: SemesterOption,
  limit = 8
): UpcomingEvent[] {
  const semesterStart =
    parseDate(semester.start);
  const semesterEnd =
    parseDate(semester.end);

  if (
    !semesterStart ||
    !semesterEnd
  ) {
    return [];
  }

  const today = startOfDay(
    new Date()
  );
  let cursor =
    today > semesterStart
      ? today
      : semesterStart;
  const events: UpcomingEvent[] =
    [];

  while (
    cursor <= semesterEnd &&
    events.length < limit
  ) {
    const daySchedules =
      schedules
        .filter(
          (schedule) =>
            schedule.active &&
            schedule.dayOfWeek ===
              cursor.getDay()
        )
        .sort((first, second) =>
          first.startTime.localeCompare(
            second.startTime
          )
        );

    for (const schedule of daySchedules) {
      const eventDate =
        new Date(cursor);
      const [hour, minute] =
        schedule.startTime
          .split(":")
          .map(Number);

      eventDate.setHours(
        hour || 0,
        minute || 0,
        0,
        0
      );

      if (
        eventDate >= new Date() ||
        dateKey(cursor) !==
          dateKey(today)
      ) {
        events.push({
          date: eventDate,
          schedule,
        });
      }

      if (
        events.length >= limit
      ) {
        break;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return events;
}

function MetricIcon({
  type,
}: {
  type:
    | "period"
    | "courses"
    | "sessions"
    | "weeks";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "period") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
        />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
    );
  }

  if (type === "courses") {
    return (
      <svg {...common}>
        <path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" />
        <path d="M7 8v5c0 1.8 2.2 3 5 3s5-1.2 5-3V8" />
      </svg>
    );
  }

  if (type === "sessions") {
    return (
      <svg {...common}>
        <path d="M5 3h14v18H5z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  tone:
    | "blue"
    | "green"
    | "violet"
    | "amber";
  icon:
    | "period"
    | "courses"
    | "sessions"
    | "weeks";
}) {
  return (
    <article
      className={styles.metricCard}
    >
      <span
        className={`${styles.metricIcon} ${
          styles[`metric${tone}`]
        }`}
      >
        <MetricIcon type={icon} />
      </span>

      <div>
        <p
          className={
            styles.metricTitle
          }
        >
          {title}
        </p>

        <strong
          className={`${styles.metricValue} ${
            styles[`value${tone}`]
          }`}
        >
          {value}
        </strong>

        <p
          className={
            styles.metricDescription
          }
        >
          {description}
        </p>
      </div>
    </article>
  );
}

export default function TeacherAcademicCalendarPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [
    schedules,
    setSchedules,
  ] = useState<
    Schedule[]
  >([]);
  const [
    selectedSemesterId,
    setSelectedSemesterId,
  ] = useState<number | null>(
    null
  );
  const [
    visibleMonth,
    setVisibleMonth,
  ] = useState(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      12
    );
  });
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() =>
    startOfDay(new Date())
  );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    reloadKey,
    setReloadKey,
  ] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller =
      new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      const storedUser =
        getLegacyUser() as
          | UserData
          | null;
      const token =
        getToken();

      if (
        !storedUser ||
        !token
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setUser(storedUser);

      try {
        const response =
          await requestSchedules(
            token,
            controller.signal
          );

        if (cancelled) {
          return;
        }

        const activeSchedules =
          response.filter(
            (schedule) =>
              schedule.active
          );

        setSchedules(
          activeSchedules
        );

        const activeSemester =
          activeSchedules.find(
            (schedule) =>
              schedule
                .semesterActive
          );
        const initialSchedule =
          activeSemester ??
          activeSchedules[0];

        if (initialSchedule) {
          setSelectedSemesterId(
            initialSchedule
              .semesterId
          );

          const semesterStart =
            parseDate(
              initialSchedule
                .semesterStart
            );
          const semesterEnd =
            parseDate(
              initialSchedule
                .semesterEnd
            );
          const today =
            startOfDay(
              new Date()
            );
          const focusDate =
            semesterStart &&
            semesterEnd &&
            isWithinRange(
              today,
              semesterStart,
              semesterEnd
            )
              ? today
              : semesterStart ??
                today;

          setSelectedDate(
            focusDate
          );
          setVisibleMonth(
            new Date(
              focusDate.getFullYear(),
              focusDate.getMonth(),
              1,
              12
            )
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          loadError instanceof
            CalendarRequestError &&
          [401, 403].includes(
            loadError.status
          )
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el calendario academico."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, router]);

  const semesters =
    useMemo<SemesterOption[]>(
      () => {
        const map =
          new Map<
            number,
            SemesterOption
          >();

        schedules.forEach(
          (schedule) => {
            if (
              !map.has(
                schedule.semesterId
              )
            ) {
              map.set(
                schedule.semesterId,
                {
                  id:
                    schedule.semesterId,
                  code:
                    schedule
                      .semesterCode ||
                    `Semestre ${schedule.semesterId}`,
                  start:
                    schedule
                      .semesterStart,
                  end:
                    schedule
                      .semesterEnd,
                  active:
                    schedule
                      .semesterActive,
                }
              );
            }
          }
        );

        return Array.from(
          map.values()
        ).sort((first, second) => {
          if (
            first.active !==
            second.active
          ) {
            return first.active
              ? -1
              : 1;
          }

          return second.start.localeCompare(
            first.start
          );
        });
      },
      [schedules]
    );

  const selectedSemester =
    useMemo(
      () =>
        semesters.find(
          (semester) =>
            semester.id ===
            selectedSemesterId
        ) ??
        semesters[0] ??
        null,
      [
        semesters,
        selectedSemesterId,
      ]
    );

  const semesterSchedules =
    useMemo(
      () =>
        selectedSemester
          ? schedules.filter(
              (schedule) =>
                schedule
                  .semesterId ===
                selectedSemester.id
            )
          : [],
      [
        schedules,
        selectedSemester,
      ]
    );

  const calendarDays =
    useMemo(
      () =>
        selectedSemester
          ? buildCalendarDays(
              visibleMonth,
              semesterSchedules,
              selectedSemester
            )
          : [],
      [
        visibleMonth,
        semesterSchedules,
        selectedSemester,
      ]
    );

  const selectedDay =
    useMemo(
      () =>
        calendarDays.find(
          (day) =>
            day.key ===
            dateKey(selectedDate)
        ) ?? null,
      [
        calendarDays,
        selectedDate,
      ]
    );

  const upcomingEvents =
    useMemo(
      () =>
        selectedSemester
          ? buildUpcomingEvents(
              semesterSchedules,
              selectedSemester
            )
          : [],
      [
        semesterSchedules,
        selectedSemester,
      ]
    );

  const uniqueCourses =
    useMemo(
      () =>
        new Set(
          semesterSchedules.map(
            (schedule) =>
              schedule.courseId
          )
        ).size,
      [semesterSchedules]
    );

  const monthlySessions =
    selectedSemester
      ? projectedMonthSessions(
          visibleMonth,
          semesterSchedules,
          selectedSemester
        )
      : 0;

  const weeks =
    selectedSemester
      ? academicWeeks(
          selectedSemester
        )
      : 0;

  const semesterStart =
    selectedSemester
      ? parseDate(
          selectedSemester.start
        )
      : null;
  const semesterEnd =
    selectedSemester
      ? parseDate(
          selectedSemester.end
        )
      : null;

  const canGoPrevious =
    semesterStart
      ? monthKey(
          addMonths(
            visibleMonth,
            -1
          )
        ) >=
        monthKey(semesterStart)
      : false;

  const canGoNext =
    semesterEnd
      ? monthKey(
          addMonths(
            visibleMonth,
            1
          )
        ) <=
        monthKey(semesterEnd)
      : false;

  const teacherName =
    getUserName(user);

  function selectSemester(
    semesterId: number
  ) {
    const semester =
      semesters.find(
        (item) =>
          item.id === semesterId
      );

    setSelectedSemesterId(
      semesterId
    );

    if (!semester) {
      return;
    }

    const start =
      parseDate(
        semester.start
      );
    const end =
      parseDate(
        semester.end
      );
    const today =
      startOfDay(new Date());
    const focusDate =
      start &&
      end &&
      isWithinRange(
        today,
        start,
        end
      )
        ? today
        : start ?? today;

    setSelectedDate(focusDate);
    setVisibleMonth(
      new Date(
        focusDate.getFullYear(),
        focusDate.getMonth(),
        1,
        12
      )
    );
  }

  function goToToday() {
    if (
      !semesterStart ||
      !semesterEnd
    ) {
      return;
    }

    const today =
      startOfDay(new Date());
    const target =
      isWithinRange(
        today,
        semesterStart,
        semesterEnd
      )
        ? today
        : semesterStart;

    setSelectedDate(target);
    setVisibleMonth(
      new Date(
        target.getFullYear(),
        target.getMonth(),
        1,
        12
      )
    );
  }

  if (loading) {
    return (
      <LoadingState
        title="Cargando calendario academico"
        description="Proyectando sus clases dentro de las fechas reales del semestre."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar el calendario"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          setReloadKey(
            (current) =>
              current + 1
          )
        }
        fullHeight
      />
    );
  }

  return (
    <div
      className={`${styles.page} admin-dashboard-animated`}
    >
      <PageHeader
        eyebrow="Programacion personal"
        title="Calendario academico"
        description={`Vista mensual de las clases asignadas a ${teacherName}, limitada por las fechas reales de cada semestre.`}
        badge={
          selectedSemester ? (
            <span
              className={
                styles.semesterBadge
              }
            >
              <span />
              {selectedSemester.code}
            </span>
          ) : null
        }
        actions={
          <div
            className={
              styles.headerActions
            }
          >
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setReloadKey(
                  (current) =>
                    current + 1
                )
              }
            >
              Actualizar
            </Button>

            <Button
              type="button"
              onClick={goToToday}
              disabled={
                !selectedSemester
              }
            >
              Ir a hoy
            </Button>
          </div>
        }
      />

      {selectedSemester ? (
        <>
          <section
            className={
              styles.metricsGrid
            }
          >
            <MetricCard
              title="Periodo academico"
              value={
                selectedSemester.code
              }
              description={`${formatShortDate(
                semesterStart ??
                  new Date()
              )} - ${formatShortDate(
                semesterEnd ??
                  new Date()
              )}`}
              tone="blue"
              icon="period"
            />

            <MetricCard
              title="Cursos del periodo"
              value={String(
                uniqueCourses
              ).padStart(2, "0")}
              description="Cursos distintos asignados al docente."
              tone="green"
              icon="courses"
            />

            <MetricCard
              title="Sesiones del mes"
              value={String(
                monthlySessions
              ).padStart(2, "0")}
              description={`Proyeccion para ${formatMonth(
                visibleMonth
              )}.`}
              tone="violet"
              icon="sessions"
            />

            <MetricCard
              title="Duracion del periodo"
              value={`${weeks} sem`}
              description="Semanas calendario entre inicio y fin."
              tone="amber"
              icon="weeks"
            />
          </section>

          <section
            className={
              styles.calendarLayout
            }
          >
            <article
              className={
                styles.calendarCard
              }
            >
              <header
                className={
                  styles.calendarHeader
                }
              >
                <div>
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    Vista mensual
                  </p>
                  <h2>
                    {formatMonth(
                      visibleMonth
                    )}
                  </h2>
                  <p>
                    Seleccione una fecha
                    para revisar sus
                    sesiones.
                  </p>
                </div>

                <div
                  className={
                    styles.calendarControls
                  }
                >
                  {semesters.length >
                  1 ? (
                    <label
                      className={
                        styles.semesterSelect
                      }
                    >
                      <span>
                        Semestre
                      </span>
                      <select
                        value={
                          selectedSemester.id
                        }
                        onChange={(
                          event
                        ) =>
                          selectSemester(
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        }
                      >
                        {semesters.map(
                          (
                            semester
                          ) => (
                            <option
                              key={
                                semester.id
                              }
                              value={
                                semester.id
                              }
                            >
                              {
                                semester.code
                              }
                              {semester.active
                                ? " · Activo"
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  ) : null}

                  <div
                    className={
                      styles.monthButtons
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMonth(
                          (
                            current
                          ) =>
                            addMonths(
                              current,
                              -1
                            )
                        )
                      }
                      disabled={
                        !canGoPrevious
                      }
                      aria-label="Mes anterior"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMonth(
                          (
                            current
                          ) =>
                            addMonths(
                              current,
                              1
                            )
                        )
                      }
                      disabled={
                        !canGoNext
                      }
                      aria-label="Mes siguiente"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </header>

              <div
                className={
                  styles.weekHeader
                }
              >
                {WEEK_DAYS.map(
                  (day) => (
                    <span key={day}>
                      {day}
                    </span>
                  )
                )}
              </div>

              <div
                className={
                  styles.calendarGrid
                }
              >
                {calendarDays.map(
                  (day) => {
                    const isToday =
                      day.key ===
                      dateKey(
                        new Date()
                      );
                    const isSelected =
                      day.key ===
                      dateKey(
                        selectedDate
                      );

                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={`${styles.calendarDay} ${
                          !day.inCurrentMonth
                            ? styles.outsideMonth
                            : ""
                        } ${
                          !day.inSemester
                            ? styles.outsideSemester
                            : ""
                        } ${
                          isToday
                            ? styles.today
                            : ""
                        } ${
                          isSelected
                            ? styles.selectedDay
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedDate(
                            day.date
                          )
                        }
                        disabled={
                          !day.inSemester
                        }
                      >
                        <span
                          className={
                            styles.dayNumber
                          }
                        >
                          {day.date.getDate()}
                        </span>

                        <div
                          className={
                            styles.dayEvents
                          }
                        >
                          {day.schedules
                            .slice(0, 3)
                            .map(
                              (
                                schedule
                              ) => {
                                const tone =
                                  getCourseTone(
                                    schedule.courseId
                                  );

                                return (
                                  <span
                                    key={
                                      schedule.id
                                    }
                                    className={`${styles.dayEvent} ${
                                      styles[
                                        `event${tone}`
                                      ]
                                    }`}
                                    title={`${schedule.courseName} · ${formatTime(
                                      schedule.startTime
                                    )}`}
                                  >
                                    <strong>
                                      {formatTime(
                                        schedule.startTime
                                      )}
                                    </strong>
                                    <em>
                                      {schedule.courseCode ||
                                        schedule.courseName}
                                    </em>
                                  </span>
                                );
                              }
                            )}

                          {day.schedules
                            .length > 3 ? (
                            <span
                              className={
                                styles.moreEvents
                              }
                            >
                              +
                              {day
                                .schedules
                                .length -
                                3}{" "}
                              mas
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <footer
                className={
                  styles.calendarFooter
                }
              >
                <div
                  className={
                    styles.legend
                  }
                >
                  {Array.from(
                    new Map(
                      semesterSchedules.map(
                        (
                          schedule
                        ) => [
                          schedule.courseId,
                          schedule,
                        ]
                      )
                    ).values()
                  ).map(
                    (schedule) => {
                      const tone =
                        getCourseTone(
                          schedule.courseId
                        );

                      return (
                        <span
                          key={
                            schedule.courseId
                          }
                        >
                          <i
                            className={
                              styles[
                                `legend${tone}`
                              ]
                            }
                          />
                          {schedule.courseCode ||
                            schedule.courseName}
                        </span>
                      );
                    }
                  )}
                </div>

                <p>
                  Fuente: horarios
                  personales y fechas del
                  semestre. Los feriados y
                  eventos institucionales
                  todavia no tienen una
                  fuente en el backend.
                </p>
              </footer>
            </article>

            <aside
              className={
                styles.agendaColumn
              }
            >
              <article
                className={
                  styles.selectedCard
                }
              >
                <header>
                  <p
                    className={
                      styles.eyebrow
                    }
                  >
                    Agenda seleccionada
                  </p>
                  <h2>
                    {formatDate(
                      selectedDate
                    )}
                  </h2>
                </header>

                <div
                  className={
                    styles.selectedSessions
                  }
                >
                  {selectedDay &&
                  selectedDay.schedules
                    .length > 0 ? (
                    selectedDay.schedules.map(
                      (schedule) => {
                        const tone =
                          getCourseTone(
                            schedule.courseId
                          );

                        return (
                          <article
                            key={
                              schedule.id
                            }
                            className={`${styles.agendaItem} ${
                              styles[
                                `agenda${tone}`
                              ]
                            }`}
                          >
                            <span
                              className={
                                styles.agendaAccent
                              }
                            />

                            <p>
                              {schedule.courseCode ||
                                `CUR-${schedule.courseId}`}
                            </p>

                            <h3>
                              {schedule.courseName ||
                                "Curso asignado"}
                            </h3>

                            <dl>
                              <div>
                                <dt>
                                  Horario
                                </dt>
                                <dd>
                                  {formatTime(
                                    schedule.startTime
                                  )}{" "}
                                  -{" "}
                                  {formatTime(
                                    schedule.endTime
                                  )}
                                </dd>
                              </div>

                              <div>
                                <dt>
                                  Aula
                                </dt>
                                <dd>
                                  {schedule.room ||
                                    "-"}
                                </dd>
                              </div>
                            </dl>
                          </article>
                        );
                      }
                    )
                  ) : (
                    <div
                      className={
                        styles.emptyAgenda
                      }
                    >
                      <span
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="17"
                            rx="3"
                          />
                          <path d="M8 2v4M16 2v4M3 9h18" />
                          <path d="m9 15 2 2 4-4" />
                        </svg>
                      </span>

                      <h3>
                        Sin clases
                      </h3>
                      <p>
                        No hay sesiones
                        programadas para
                        esta fecha.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article
                className={
                  styles.upcomingCard
                }
              >
                <header>
                  <div>
                    <p
                      className={
                        styles.eyebrow
                      }
                    >
                      Agenda futura
                    </p>
                    <h2>
                      Proximas clases
                    </h2>
                  </div>

                  <span>
                    {
                      upcomingEvents.length
                    }
                  </span>
                </header>

                <div
                  className={
                    styles.upcomingList
                  }
                >
                  {upcomingEvents.length >
                  0 ? (
                    upcomingEvents.map(
                      (
                        event,
                        index
                      ) => {
                        const tone =
                          getCourseTone(
                            event
                              .schedule
                              .courseId
                          );

                        return (
                          <article
                            key={`${event.schedule.id}-${dateKey(
                              event.date
                            )}-${index}`}
                            className={
                              styles.upcomingItem
                            }
                          >
                            <span
                              className={`${styles.upcomingDate} ${
                                styles[
                                  `date${tone}`
                                ]
                              }`}
                            >
                              <strong>
                                {event.date.getDate()}
                              </strong>
                              <em>
                                {event.date.toLocaleDateString(
                                  "es-PE",
                                  {
                                    month:
                                      "short",
                                  }
                                )}
                              </em>
                            </span>

                            <div>
                              <p>
                                {DAY_NAMES[
                                  event.date.getDay()
                                ]}
                                {" · "}
                                {formatTime(
                                  event
                                    .schedule
                                    .startTime
                                )}
                              </p>

                              <h3>
                                {event
                                  .schedule
                                  .courseName ||
                                  "Curso asignado"}
                              </h3>

                              <span>
                                Aula{" "}
                                {event
                                  .schedule
                                  .room ||
                                  "-"}
                              </span>
                            </div>
                          </article>
                        );
                      }
                    )
                  ) : (
                    <p
                      className={
                        styles.noUpcoming
                      }
                    >
                      No existen clases
                      futuras dentro del
                      semestre.
                    </p>
                  )}
                </div>
              </article>
            </aside>
          </section>
        </>
      ) : (
        <section
          className={
            styles.emptyState
          }
        >
          <span
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="3"
              />
              <path d="M8 2v4M16 2v4M3 9h18" />
              <path d="M8 14h8M8 18h5" />
            </svg>
          </span>

          <h2>
            Sin calendario disponible
          </h2>

          <p>
            La cuenta docente no tiene
            horarios con fechas de semestre
            para construir la agenda
            academica.
          </p>
        </section>
      )}
    </div>
  );
}
