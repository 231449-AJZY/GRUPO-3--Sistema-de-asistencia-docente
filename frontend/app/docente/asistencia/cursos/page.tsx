"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TeacherWeeklySchedule from "@/components/docente/dashboard/TeacherWeeklySchedule";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import {
  clearSession,
  getLegacyUser,
  getToken,
} from "@/lib/auth";
import {
  ApiHorariosError,
  getMisHorarios,
} from "@/lib/services/horarios.service";

import type { HorarioCurso } from "@/types/horario";

import styles from "./page.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

const DAY_NAMES = [
  "",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
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

interface CourseAttendance {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface AttendancePayload {
  cursos?: CourseAttendance[];
}

interface TodaySession {
  schedule: HorarioCurso;
  record: CourseAttendance | null;
}

class AttendanceRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "AttendanceRequestError";
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

function localDateKey(
  date = new Date()
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

function formatDate(
  value: string
): string {
  const clean = cleanDate(value);
  const [year, month, day] =
    clean.split("-").map(Number);

  if (!year || !month || !day) {
    return value || "-";
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLongDate(
  date = new Date()
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

function formatTime(
  value: string
): string {
  return (
    String(value ?? "").slice(0, 5) ||
    "--:--"
  );
}

function normalizeText(
  value: string
): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-PE")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function normalizeStatus(
  value: string
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function statusLabel(
  value: string
): string {
  const normalized =
    normalizeStatus(value);

  if (normalized === "PRESENTE") {
    return "Presente";
  }

  if (normalized === "PUNTUAL") {
    return "Puntual";
  }

  if (normalized === "TARDANZA") {
    return "Tardanza";
  }

  if (normalized === "AUSENTE") {
    return "Ausente";
  }

  return normalized
    ? normalized.toLowerCase()
    : "Pendiente";
}

function statusTone(
  value: string
):
  | "success"
  | "warning"
  | "danger"
  | "neutral" {
  const normalized =
    normalizeStatus(value);

  if (
    normalized === "PRESENTE" ||
    normalized === "PUNTUAL"
  ) {
    return "success";
  }

  if (normalized === "TARDANZA") {
    return "warning";
  }

  if (normalized === "AUSENTE") {
    return "danger";
  }

  return "neutral";
}

function getCourseTone(
  courseId: number
): (typeof COURSE_TONES)[number] {
  const index =
    Math.abs(courseId - 1) %
    COURSE_TONES.length;

  return COURSE_TONES[index];
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

function timeToMinutes(
  value: string
): number {
  const [hour, minute] =
    String(value ?? "")
      .split(":")
      .map(Number);

  return (
    (Number.isFinite(hour)
      ? hour
      : 0) *
      60 +
    (Number.isFinite(minute)
      ? minute
      : 0)
  );
}

function getNextSchedule(
  schedules: HorarioCurso[],
  now = new Date()
):
  | {
      schedule: HorarioCurso;
      startsAt: Date;
    }
  | null {
  const candidates = schedules
    .filter((item) => item.activo)
    .map((schedule) => {
      const startsAt =
        new Date(now);
      const currentDay =
        now.getDay();
      let delta =
        schedule.diaSemana -
        currentDay;
      const [hour, minute] =
        schedule.horaInicio
          .split(":")
          .map(Number);

      startsAt.setHours(
        hour || 0,
        minute || 0,
        0,
        0
      );

      if (
        delta < 0 ||
        (delta === 0 &&
          startsAt <= now)
      ) {
        delta += 7;
      }

      startsAt.setDate(
        startsAt.getDate() +
          delta
      );

      return {
        schedule,
        startsAt,
      };
    })
    .sort(
      (first, second) =>
        first.startsAt.getTime() -
        second.startsAt.getTime()
    );

  return candidates[0] ?? null;
}

function findAttendanceRecord(
  schedule: HorarioCurso,
  records: CourseAttendance[],
  date: string
): CourseAttendance | null {
  const scheduleCourse =
    normalizeText(
      schedule.curso ?? ""
    );
  const scheduleRoom =
    normalizeText(
      schedule.aula ?? ""
    );

  return (
    records.find((record) => {
      const sameDate =
        cleanDate(record.fecha) ===
        date;
      const sameCourse =
        normalizeText(
          record.curso
        ) === scheduleCourse;
      const sameRoom =
        !scheduleRoom ||
        !record.aula ||
        normalizeText(
          record.aula
        ) === scheduleRoom;

      return (
        sameDate &&
        sameCourse &&
        sameRoom
      );
    }) ?? null
  );
}

async function requestCourseAttendance(
  token: string,
  signal: AbortSignal
): Promise<CourseAttendance[]> {
  const response = await fetch(
    `${API_URL}/asistencia/docente/me`,
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
      | AttendancePayload
      | { error?: string }
      | null;

  if (!response.ok) {
    throw new AttendanceRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo cargar la asistencia a cursos.",
      response.status
    );
  }

  return (
    (
      data as AttendancePayload | null
    )?.cursos ?? []
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    statusTone(status);

  return (
    <span
      className={`${styles.statusBadge} ${
        styles[`status${tone}`]
      }`}
    >
      <span />
      {statusLabel(status)}
    </span>
  );
}

function MetricIcon({
  type,
}: {
  type:
    | "courses"
    | "sessions"
    | "records"
    | "late";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "courses") {
    return (
      <svg {...common}>
        <path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" />
        <path d="M7 8v5c0 1.8 2.2 3 5 3s5-1.2 5-3V8" />
        <path d="M20 6v6" />
      </svg>
    );
  }

  if (type === "sessions") {
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
        <path d="M8 14h3M13 14h3M8 18h3" />
      </svg>
    );
  }

  if (type === "records") {
    return (
      <svg {...common}>
        <path d="M5 3h14v18H5z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
        <path d="m14 18 2 2 4-4" />
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
    | "courses"
    | "sessions"
    | "records"
    | "late";
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

function SessionCard({
  item,
}: {
  item: TodaySession;
}) {
  const tone =
    getCourseTone(
      item.schedule.cursoId
    );

  return (
    <article
      className={`${styles.sessionCard} ${
        styles[`course${tone}`]
      }`}
    >
      <span
        className={
          styles.sessionAccent
        }
      />

      <div
        className={
          styles.sessionHeader
        }
      >
        <div>
          <p
            className={
              styles.courseCode
            }
          >
            {item.schedule
              .cursoCodigo ||
              `CUR-${item.schedule.cursoId}`}
          </p>
          <h3>
            {item.schedule.curso ||
              "Curso asignado"}
          </h3>
        </div>

        <StatusBadge
          status={
            item.record
              ?.estado ?? ""
          }
        />
      </div>

      <dl
        className={
          styles.sessionDetails
        }
      >
        <div>
          <dt>Horario</dt>
          <dd>
            {formatTime(
              item.schedule
                .horaInicio
            )}{" "}
            -{" "}
            {formatTime(
              item.schedule.horaFin
            )}
          </dd>
        </div>

        <div>
          <dt>Aula</dt>
          <dd>
            {item.schedule.aula ||
              "-"}
          </dd>
        </div>

        <div>
          <dt>Semestre</dt>
          <dd>
            {item.schedule
              .semestre || "-"}
          </dd>
        </div>

        <div>
          <dt>Marcacion</dt>
          <dd>
            {item.record
              ? formatTime(
                  item.record
                    .hora_registro
                )
              : "Pendiente"}
          </dd>
        </div>
      </dl>

      <div
        className={
          styles.mobileAction
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="7"
            y="2"
            width="10"
            height="20"
            rx="2"
          />
          <path d="M10 5h4M11 19h2" />
        </svg>

        <span>
          {item.record
            ? "Marcacion sincronizada"
            : "Marcar desde la app movil"}
        </span>
      </div>
    </article>
  );
}

export default function CourseAttendancePage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [
    schedules,
    setSchedules,
  ] = useState<
    HorarioCurso[]
  >([]);
  const [records, setRecords] =
    useState<
      CourseAttendance[]
    >([]);
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
        const [
          scheduleResponse,
          attendanceResponse,
        ] =
          await Promise.all([
            getMisHorarios(),
            requestCourseAttendance(
              token,
              controller.signal
            ),
          ]);

        if (cancelled) {
          return;
        }

        setSchedules(
          scheduleResponse.filter(
            (item) => item.activo
          )
        );
        setRecords(
          attendanceResponse
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          (loadError instanceof
            AttendanceRequestError &&
            [401, 403].includes(
              loadError.status
            )) ||
          (loadError instanceof
            ApiHorariosError &&
            [401, 403].includes(
              loadError.status
            ))
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la asistencia a cursos."
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

  const now =
    new Date();
  const today =
    localDateKey(now);
  const currentDay =
    now.getDay();
  const monthPrefix =
    today.slice(0, 7);

  const uniqueCourses =
    useMemo(
      () =>
        new Set(
          schedules.map(
            (schedule) =>
              schedule.cursoId
          )
        ).size,
      [schedules]
    );

  const monthRecords =
    useMemo(
      () =>
        records.filter(
          (record) =>
            cleanDate(
              record.fecha
            ).startsWith(
              monthPrefix
            )
        ),
      [records, monthPrefix]
    );

  const monthLate =
    monthRecords.filter(
      (record) =>
        normalizeStatus(
          record.estado
        ) === "TARDANZA"
    ).length;

  const todaySessions =
    useMemo<TodaySession[]>(
      () =>
        schedules
          .filter(
            (schedule) =>
              schedule.diaSemana ===
              currentDay
          )
          .sort(
            (first, second) =>
              timeToMinutes(
                first.horaInicio
              ) -
              timeToMinutes(
                second.horaInicio
              )
          )
          .map((schedule) => ({
            schedule,
            record:
              findAttendanceRecord(
                schedule,
                records,
                today
              ),
          })),
      [
        schedules,
        records,
        currentDay,
        today,
      ]
    );

  const nextSchedule =
    useMemo(
      () =>
        getNextSchedule(
          schedules,
          now
        ),
      [schedules]
    );

  const recentRecords =
    useMemo(
      () =>
        [...records]
          .sort((first, second) =>
            `${cleanDate(
              second.fecha
            )}T${
              second.hora_registro
            }`.localeCompare(
              `${cleanDate(
                first.fecha
              )}T${
                first.hora_registro
              }`
            )
          )
          .slice(0, 12),
      [records]
    );

  const teacherName =
    getUserName(user);

  if (loading) {
    return (
      <LoadingState
        title="Cargando asistencia a cursos"
        description="Consultando sus horarios y marcaciones academicas."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar la asistencia a cursos"
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
      <div
        className={
          styles.backRow
        }
      >
        <Link
          href="/docente/asistencia"
          className={
            styles.backLink
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a Mi asistencia
        </Link>
      </div>

      <PageHeader
        eyebrow="Mi asistencia"
        title="Registro de asistencia a cursos"
        description="Revise sus sesiones programadas, el estado de cada marcacion y el historial academico sincronizado desde la aplicacion movil."
        badge={
          <span
            className={
              styles.mobileBadge
            }
          >
            <span />
            Validacion movil segura
          </span>
        }
        actions={
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
            Actualizar datos
          </Button>
        }
      />

      <section
        className={
          styles.metricsGrid
        }
      >
        <MetricCard
          title="Cursos asignados"
          value={String(
            uniqueCourses
          ).padStart(2, "0")}
          description="Cursos distintos en su horario activo."
          tone="blue"
          icon="courses"
        />

        <MetricCard
          title="Sesiones semanales"
          value={String(
            schedules.length
          ).padStart(2, "0")}
          description="Bloques academicos programados."
          tone="green"
          icon="sessions"
        />

        <MetricCard
          title="Marcaciones del mes"
          value={String(
            monthRecords.length
          ).padStart(2, "0")}
          description="Asistencias de curso registradas."
          tone="violet"
          icon="records"
        />

        <MetricCard
          title="Tardanzas del mes"
          value={String(
            monthLate
          ).padStart(2, "0")}
          description="Marcaciones posteriores al inicio."
          tone="amber"
          icon="late"
        />
      </section>

      <section
        className={
          styles.summaryGrid
        }
      >
        <article
          className={
            styles.todayCard
          }
        >
          <header
            className={
              styles.sectionHeader
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Programacion diaria
              </p>
              <h2>
                Sesiones de hoy
              </h2>
              <p>
                {formatLongDate(
                  now
                )}
              </p>
            </div>

            <span
              className={
                styles.sectionCount
              }
            >
              {todaySessions.length}{" "}
              sesion(es)
            </span>
          </header>

          <div
            className={
              styles.sessionList
            }
          >
            {todaySessions.length >
            0 ? (
              todaySessions.map(
                (item) => (
                  <SessionCard
                    key={
                      item.schedule.id
                    }
                    item={item}
                  />
                )
              )
            ) : (
              <div
                className={
                  styles.emptyToday
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
                  Sin clases programadas
                </h3>
                <p>
                  No existe una sesion
                  activa para el dia de
                  hoy.
                </p>
              </div>
            )}
          </div>
        </article>

        <article
          className={
            styles.nextCard
          }
        >
          <header>
            <p
              className={
                styles.eyebrow
              }
            >
              Siguiente actividad
            </p>
            <h2>
              Proxima sesion
            </h2>
          </header>

          {nextSchedule ? (
            <div
              className={
                styles.nextContent
              }
            >
              <span
                className={
                  styles.nextCourseIcon
                }
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" />
                  <path d="M7 8v5c0 1.8 2.2 3 5 3s5-1.2 5-3V8" />
                </svg>
              </span>

              <p
                className={
                  styles.nextCode
                }
              >
                {nextSchedule
                  .schedule
                  .cursoCodigo ||
                  `CUR-${nextSchedule.schedule.cursoId}`}
              </p>

              <h3>
                {nextSchedule
                  .schedule
                  .curso ||
                  "Curso asignado"}
              </h3>

              <dl
                className={
                  styles.nextDetails
                }
              >
                <div>
                  <dt>Dia</dt>
                  <dd>
                    {DAY_NAMES[
                      nextSchedule
                        .schedule
                        .diaSemana
                    ] ?? "Dia"}
                  </dd>
                </div>

                <div>
                  <dt>Horario</dt>
                  <dd>
                    {formatTime(
                      nextSchedule
                        .schedule
                        .horaInicio
                    )}{" "}
                    -{" "}
                    {formatTime(
                      nextSchedule
                        .schedule
                        .horaFin
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Aula</dt>
                  <dd>
                    {nextSchedule
                      .schedule
                      .aula || "-"}
                  </dd>
                </div>

                <div>
                  <dt>Docente</dt>
                  <dd>
                    {teacherName}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div
              className={
                styles.noNext
              }
            >
              No hay una proxima sesion
              disponible.
            </div>
          )}

          <div
            className={
              styles.securityNotice
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>

            <div>
              <strong>
                Marcacion protegida
              </strong>
              <p>
                La app movil y el backend
                verifican titularidad,
                fecha, horario, presencia
                y duplicados.
              </p>
            </div>
          </div>
        </article>
      </section>

      {schedules.length > 0 ? (
        <TeacherWeeklySchedule
          horarios={schedules}
        />
      ) : (
        <section
          className={
            styles.noScheduleCard
          }
        >
          <h2>
            No tiene horarios activos
          </h2>
          <p>
            La programacion aparecera
            cuando el Administrador asigne
            cursos al docente.
          </p>
        </section>
      )}

      <section
        className={
          styles.historyCard
        }
      >
        <header
          className={
            styles.historyHeader
          }
        >
          <div>
            <h2>
              Historial de marcaciones de
              cursos
            </h2>
            <p>
              Ultimos registros academicos
              asociados a su cuenta
              docente.
            </p>
          </div>

          <span
            className={
              styles.historyCount
            }
          >
            {records.length} registro(s)
          </span>
        </header>

        <div
          className={
            styles.tableScroll
          }
        >
          <table
            className={
              styles.historyTable
            }
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Curso</th>
                <th>Aula</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Origen</th>
              </tr>
            </thead>

            <tbody>
              {recentRecords.length >
              0 ? (
                recentRecords.map(
                  (
                    record,
                    index
                  ) => (
                    <tr
                      key={`${record.fecha}-${record.hora_registro}-${index}`}
                    >
                      <td>
                        <strong>
                          {formatDate(
                            record.fecha
                          )}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {record.curso ||
                            "Curso"}
                        </strong>
                      </td>
                      <td>
                        {record.aula ||
                          "-"}
                      </td>
                      <td
                        className={
                          styles.timeCell
                        }
                      >
                        {formatTime(
                          record.hora_registro
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            record.estado
                          }
                        />
                      </td>
                      <td>
                        Sistema
                        institucional
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className={
                      styles.emptyCell
                    }
                  >
                    Todavia no existen
                    marcaciones de cursos
                    para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
