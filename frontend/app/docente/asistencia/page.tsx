"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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
import {
  ApiHorariosError,
  getMisHorarios,
} from "@/lib/services/horarios.service";

import type { HorarioCurso } from "@/types/horario";

import styles from "./page.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

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

interface AttendanceEntry {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface AttendanceCourse {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface AttendancePayload {
  ingresos: AttendanceEntry[];
  cursos: AttendanceCourse[];
}

interface RecentRecord {
  key: string;
  date: string;
  time: string;
  type: string;
  detail: string;
  status: string;
  observation: string;
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

async function requestAttendance(
  token: string,
  signal: AbortSignal
): Promise<AttendancePayload> {
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
        "No se pudo cargar la asistencia del docente.",
      response.status
    );
  }

  if (!data) {
    throw new AttendanceRequestError(
      "El servidor devolvio una respuesta vacia.",
      502
    );
  }

  const attendance =
    data as AttendancePayload;

  return {
    ingresos:
      attendance.ingresos ?? [],
    cursos:
      attendance.cursos ?? [],
  };
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

function statusLabel(
  value: string
): string {
  const normalized = String(
    value ?? ""
  ).toUpperCase();

  if (normalized === "PUNTUAL") {
    return "Puntual";
  }

  if (normalized === "PRESENTE") {
    return "Presente";
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
  | "green"
  | "orange"
  | "red"
  | "blue" {
  const normalized = String(
    value ?? ""
  ).toUpperCase();

  if (
    normalized === "PUNTUAL" ||
    normalized === "PRESENTE"
  ) {
    return "green";
  }

  if (normalized === "TARDANZA") {
    return "orange";
  }

  if (normalized === "AUSENTE") {
    return "red";
  }

  return "blue";
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

function dayLabel(
  day: number
): string {
  return (
    [
      "",
      "Lunes",
      "Martes",
      "Miercoles",
      "Jueves",
      "Viernes",
    ][day] ?? "Dia"
  );
}

function AccessIcon({
  type,
}: {
  type:
    | "fingerprint"
    | "courses"
    | "history";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "fingerprint") {
    return (
      <svg {...common}>
        <path d="M7 12c0-3 2.2-5.3 5-5.3s5 2.3 5 5.3" />
        <path d="M9 17c-1-1.5-1.5-3-1.5-5" />
        <path d="M15 18c1-1.8 1.5-3.8 1.5-6" />
        <path d="M10 12c0-1.5.8-2.7 2-2.7s2 1.2 2 2.7c0 2.4-.8 4.7-2 7" />
        <path d="M12 3c5 0 9 4 9 9" />
        <path d="M3 12c0-5 4-9 9-9" />
      </svg>
    );
  }

  if (type === "courses") {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="4"
          width="16"
          height="17"
          rx="2"
        />
        <path d="M8 8h8M8 12h8M8 16h5" />
        <path d="m15 17 2 2 4-4" />
      </svg>
    );
  }

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

function StatusPill({
  status,
}: {
  status: string;
}) {
  const tone =
    statusTone(status);

  return (
    <span
      className={`${styles.statusPill} ${
        styles[
          `status${tone}`
        ]
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function AccessCard({
  number,
  title,
  description,
  tone,
  icon,
  rows,
  step,
  href,
}: {
  number: string;
  title: string;
  description: string;
  tone:
    | "blue"
    | "green"
    | "amber";
  icon:
    | "fingerprint"
    | "courses"
    | "history";
  rows: Array<{
    label: string;
    value: ReactNode;
  }>;
  step: string;
  href?: string;
}) {
  return (
    <article
      className={`${styles.accessCard} ${
        styles[`card${tone}`]
      }`}
    >
      <div
        className={`${styles.cardTop} ${
          styles[`top${tone}`]
        }`}
      >
        <span
          className={`${styles.cardIcon} ${
            styles[`icon${tone}`]
          }`}
        >
          <AccessIcon type={icon} />
        </span>

        <span
          className={
            styles.cardNumber
          }
        >
          {number}
        </span>
      </div>

      <div
        className={
          styles.cardContent
        }
      >
        <h2>{title}</h2>
        <p
          className={
            styles.cardDescription
          }
        >
          {description}
        </p>

        <dl
          className={
            styles.cardDetails
          }
        >
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        {href ? (
          <Link
            href={href}
            className={
              styles.readyButton
            }
          >
            <span>
              Abrir modulo
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            className={
              styles.pendingButton
            }
            disabled
            title={`${step} se implementara en el siguiente paso`}
          >
            <span>
              Preparado para {step}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

export default function TeacherAttendanceMenuPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [
    attendance,
    setAttendance,
  ] =
    useState<AttendancePayload>({
      ingresos: [],
      cursos: [],
    });
  const [
    schedules,
    setSchedules,
  ] = useState<
    HorarioCurso[]
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
          attendanceResponse,
          scheduleResponse,
        ] =
          await Promise.all([
            requestAttendance(
              token,
              controller.signal
            ),
            getMisHorarios(),
          ]);

        if (cancelled) {
          return;
        }

        setAttendance(
          attendanceResponse
        );
        setSchedules(
          scheduleResponse.filter(
            (item) => item.activo
          )
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
            : "No se pudo cargar el panel de asistencia."
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

  const today =
    localDateKey();

  const todayEntry =
    useMemo(
      () =>
        attendance.ingresos.find(
          (entry) =>
            cleanDate(
              entry.fecha
            ) === today
        ) ?? null,
      [
        attendance.ingresos,
        today,
      ]
    );

  const nextSchedule =
    useMemo(
      () =>
        getNextSchedule(
          schedules
        ),
      [schedules]
    );

  const recentRecords =
    useMemo<RecentRecord[]>(
      () => {
        const entryRecords =
          attendance.ingresos.map(
            (
              entry,
              index
            ) => ({
              key: `entry-${entry.fecha}-${entry.hora_registro}-${index}`,
              date: entry.fecha,
              time:
                entry.hora_registro,
              type:
                "Ingreso institucional",
              detail:
                "Acceso general a la universidad",
              status:
                entry.estado,
              observation:
                "Registro institucional",
            })
          );

        const courseRecords =
          attendance.cursos.map(
            (
              course,
              index
            ) => ({
              key: `course-${course.fecha}-${course.hora_registro}-${index}`,
              date: course.fecha,
              time:
                course.hora_registro,
              type:
                "Asistencia a curso",
              detail: `${
                course.curso ||
                "Curso"
              } · Aula ${
                course.aula ||
                "-"
              }`,
              status:
                course.estado,
              observation:
                "Marcacion academica",
            })
          );

        return [
          ...entryRecords,
          ...courseRecords,
        ]
          .sort((a, b) =>
            `${cleanDate(
              b.date
            )}T${b.time}`.localeCompare(
              `${cleanDate(
                a.date
              )}T${a.time}`
            )
          )
          .slice(0, 6);
      },
      [attendance]
    );

  const allRecords =
    useMemo(
      () => [
        ...attendance.ingresos,
        ...attendance.cursos,
      ],
      [attendance]
    );

  const totalRecords =
    allRecords.length;

  const totalTardiness =
    allRecords.filter(
      (record) =>
        String(
          record.estado
        ).toUpperCase() ===
        "TARDANZA"
    ).length;

  const totalAbsences =
    allRecords.filter(
      (record) =>
        String(
          record.estado
        ).toUpperCase() ===
        "AUSENTE"
    ).length;

  const totalCompliant =
    allRecords.filter(
      (record) =>
        [
          "PUNTUAL",
          "PRESENTE",
        ].includes(
          String(
            record.estado
          ).toUpperCase()
        )
    ).length;

  const compliance =
    totalRecords > 0
      ? Math.round(
          (totalCompliant /
            totalRecords) *
            100
        )
      : 0;

  const lastRecord =
    recentRecords[0] ??
    null;

  const teacherName =
    getUserName(user);
  const teacherContact =
    user?.correo ??
    user?.email ??
    "Cuenta institucional";
  const teacherMeta = [
    user?.codigo
      ? `Codigo ${user.codigo}`
      : null,
    user?.departamento ??
      null,
    `${schedules.length} clase(s) asignada(s)`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (loading) {
    return (
      <LoadingState
        title="Cargando Mi asistencia"
        description="Consultando sus registros y horarios personales."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar Mi asistencia"
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
        eyebrow="Control personal"
        title="Mi asistencia"
        description="Registre su ingreso institucional, valide sus sesiones académicas y consulte el historial asociado a su cuenta."
        badge={
          <span
            className={
              styles.headerBadge
            }
          >
            <span />
            Datos personales
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
          styles.teacherBanner
        }
      >
        <span
          className={
            styles.teacherAvatar
          }
          aria-hidden="true"
        >
          {teacherName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
              (part) =>
                part[0]
            )
            .join("")
            .toUpperCase() ||
            "DO"}
        </span>

        <div
          className={
            styles.teacherIdentity
          }
        >
          <p
            className={
              styles.bannerEyebrow
            }
          >
            Docente autenticado
          </p>
          <h2>{teacherName}</h2>
          <p>{teacherContact}</p>
          <p
            className={
              styles.teacherMeta
            }
          >
            {teacherMeta}
          </p>
        </div>

        <div
          className={
            styles.bannerStats
          }
        >
          <div>
            <span>
              Ultima marcacion
            </span>
            <strong>
              {lastRecord
                ? formatTime(
                    lastRecord.time
                  )
                : "--:--"}
            </strong>
          </div>

          <div>
            <span>
              Registros
            </span>
            <strong>
              {totalRecords}
            </strong>
          </div>

          <div>
            <span>
              Cumplimiento
            </span>
            <strong>
              {compliance}%
            </strong>
          </div>
        </div>
      </section>

      <section
        className={
          styles.accessGrid
        }
        aria-label="Opciones de asistencia"
      >
        <AccessCard
          number="01"
          title="Registro de ingreso institucional"
          description="Consulte y gestione la marcacion general de ingreso diario a la universidad."
          tone="blue"
          icon="fingerprint"
          step="8H.2A"
          href="/docente/asistencia/ingreso-institucional"
          rows={[
            {
              label:
                "Estado del dia",
              value: todayEntry ? (
                <StatusPill
                  status={
                    todayEntry.estado
                  }
                />
              ) : (
                <span
                  className={
                    styles.pendingText
                  }
                >
                  Sin registro
                </span>
              ),
            },
            {
              label:
                "Hora registrada",
              value: todayEntry
                ? formatTime(
                    todayEntry.hora_registro
                  )
                : "--:--",
            },
            {
              label:
                "Fecha actual",
              value:
                formatDate(today),
            },
          ]}
        />

        <AccessCard
          number="02"
          title="Registro de asistencia a cursos"
          description="Valide su presencia en las clases asignadas segun la programacion academica vigente."
          tone="green"
          icon="courses"
          step="8H.2B"
          href="/docente/asistencia/cursos"
          rows={[
            {
              label:
                "Proximo curso",
              value:
                nextSchedule
                  ?.schedule
                  .curso ||
                "Sin curso programado",
            },
            {
              label:
                "Horario",
              value:
                nextSchedule
                  ? `${dayLabel(
                      nextSchedule
                        .schedule
                        .diaSemana
                    )} · ${formatTime(
                      nextSchedule
                        .schedule
                        .horaInicio
                    )} - ${formatTime(
                      nextSchedule
                        .schedule
                        .horaFin
                    )}`
                  : "--:--",
            },
            {
              label: "Aula",
              value:
                nextSchedule
                  ?.schedule
                  .aula || "-",
            },
          ]}
        />

        <AccessCard
          number="03"
          title="Historial de asistencia"
          description="Revise sus registros institucionales y academicos con estados y observaciones."
          tone="amber"
          icon="history"
          step="8H.2C"
          href="/docente/asistencia/historial"
          rows={[
            {
              label:
                "Registros totales",
              value:
                totalRecords,
            },
            {
              label:
                "Tardanzas / ausencias",
              value: `${totalTardiness} / ${totalAbsences}`,
            },
            {
              label:
                "Cumplimiento",
              value: `${compliance}%`,
            },
          ]}
        />
      </section>

      <section
        className={
          styles.activityCard
        }
      >
        <header
          className={
            styles.activityHeader
          }
        >
          <div>
            <h2>
              Actividad reciente
            </h2>
            <p>
              Ultimos ingresos
              institucionales y
              marcaciones de curso
              registrados por el
              servidor.
            </p>
          </div>

          <span
            className={
              styles.recordCount
            }
          >
            {recentRecords.length} de{" "}
            {totalRecords}
          </span>
        </header>

        <div
          className={
            styles.tableScroll
          }
        >
          <table
            className={
              styles.activityTable
            }
          >
            <thead>
              <tr>
                <th>Fecha</th>
                <th>
                  Tipo de registro
                </th>
                <th>
                  Curso /
                  dependencia
                </th>
                <th>Hora</th>
                <th>Estado</th>
                <th>
                  Observacion
                </th>
              </tr>
            </thead>

            <tbody>
              {recentRecords.length >
              0 ? (
                recentRecords.map(
                  (record) => (
                    <tr
                      key={
                        record.key
                      }
                    >
                      <td>
                        {formatDate(
                          record.date
                        )}
                      </td>
                      <td>
                        <strong>
                          {
                            record.type
                          }
                        </strong>
                      </td>
                      <td>
                        {
                          record.detail
                        }
                      </td>
                      <td
                        className={
                          styles.timeCell
                        }
                      >
                        {formatTime(
                          record.time
                        )}
                      </td>
                      <td>
                        <StatusPill
                          status={
                            record.status
                          }
                        />
                      </td>
                      <td>
                        {
                          record.observation
                        }
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
                    marcaciones para
                    mostrar.
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
