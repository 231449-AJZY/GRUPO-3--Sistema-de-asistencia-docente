"use client";

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
} from "@/lib/auth";
import {
  ApiHorariosError,
  getMisHorarios,
} from "@/lib/services/horarios.service";

import type { HorarioCurso } from "@/types/horario";

import styles from "./page.module.css";

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

function durationMinutes(
  schedule: HorarioCurso
): number {
  return Math.max(
    0,
    timeToMinutes(
      schedule.horaFin
    ) -
      timeToMinutes(
        schedule.horaInicio
      )
  );
}

function formatDuration(
  minutes: number
): string {
  const hours = Math.floor(
    minutes / 60
  );
  const remaining =
    minutes % 60;

  if (hours === 0) {
    return `${remaining} min`;
  }

  if (remaining === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remaining} min`;
}

function getCourseTone(
  courseId: number
): (typeof COURSE_TONES)[number] {
  const index =
    Math.abs(courseId - 1) %
    COURSE_TONES.length;

  return COURSE_TONES[index];
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

function csvCell(
  value: string | number
): string {
  let text = String(value ?? "");

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

function MetricIcon({
  type,
}: {
  type:
    | "courses"
    | "sessions"
    | "hours"
    | "rooms";
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

  if (type === "hours") {
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

  return (
    <svg {...common}>
      <path d="M4 21V5l8-3 8 3v16" />
      <path d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" />
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
    | "hours"
    | "rooms";
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
  schedule,
}: {
  schedule: HorarioCurso;
}) {
  const tone =
    getCourseTone(
      schedule.cursoId
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
          styles.sessionTop
        }
      >
        <div>
          <p
            className={
              styles.courseCode
            }
          >
            {schedule.cursoCodigo ||
              `CUR-${schedule.cursoId}`}
          </p>

          <h3>
            {schedule.curso ||
              "Curso asignado"}
          </h3>
        </div>

        <span
          className={
            styles.activeBadge
          }
        >
          Activo
        </span>
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
              schedule.horaInicio
            )}{" "}
            -{" "}
            {formatTime(
              schedule.horaFin
            )}
          </dd>
        </div>

        <div>
          <dt>Aula</dt>
          <dd>
            {schedule.aula ||
              "-"}
          </dd>
        </div>

        <div>
          <dt>Duracion</dt>
          <dd>
            {formatDuration(
              durationMinutes(
                schedule
              )
            )}
          </dd>
        </div>

        <div>
          <dt>Semestre</dt>
          <dd>
            {schedule.semestre ||
              "-"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function TeacherSchedulesPage() {
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

    async function loadData() {
      setLoading(true);
      setError("");

      const storedUser =
        getLegacyUser() as
          | UserData
          | null;

      if (!storedUser) {
        clearSession();
        router.replace("/login");
        return;
      }

      setUser(storedUser);

      try {
        const response =
          await getMisHorarios();

        if (!cancelled) {
          setSchedules(
            response.filter(
              (item) =>
                item.activo
            )
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          loadError instanceof
            ApiHorariosError &&
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
            : "No se pudo cargar la programacion del docente."
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
    };
  }, [reloadKey, router]);

  const now = new Date();
  const currentDay =
    now.getDay();

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

  const uniqueRooms =
    useMemo(
      () =>
        new Set(
          schedules
            .map(
              (schedule) =>
                schedule.aula
                  ?.trim()
                  .toUpperCase()
            )
            .filter(Boolean)
        ).size,
      [schedules]
    );

  const totalMinutes =
    useMemo(
      () =>
        schedules.reduce(
          (sum, schedule) =>
            sum +
            durationMinutes(
              schedule
            ),
          0
        ),
      [schedules]
    );

  const todaySchedules =
    useMemo(
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
          ),
      [schedules, currentDay]
    );

  const groupedSchedules =
    useMemo(
      () =>
        [1, 2, 3, 4, 5]
          .map((day) => ({
            day,
            schedules:
              schedules
                .filter(
                  (schedule) =>
                    schedule.diaSemana ===
                    day
                )
                .sort(
                  (
                    first,
                    second
                  ) =>
                    timeToMinutes(
                      first.horaInicio
                    ) -
                    timeToMinutes(
                      second.horaInicio
                    )
                ),
          }))
          .filter(
            (group) =>
              group.schedules
                .length > 0
          ),
      [schedules]
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

  const activeSemester =
    useMemo(
      () =>
        schedules.find(
          (schedule) =>
            schedule
              .semestreActivo
        )?.semestre ??
        schedules[0]?.semestre ??
        "Sin semestre",
      [schedules]
    );

  const teacherName =
    getUserName(user);

  function exportCsv() {
    const header = [
      "Dia",
      "Codigo",
      "Curso",
      "Hora de inicio",
      "Hora de fin",
      "Duracion",
      "Aula",
      "Semestre",
      "Estado",
    ];

    const rows = [...schedules]
      .sort((first, second) => {
        const byDay =
          first.diaSemana -
          second.diaSemana;

        if (byDay !== 0) {
          return byDay;
        }

        return (
          timeToMinutes(
            first.horaInicio
          ) -
          timeToMinutes(
            second.horaInicio
          )
        );
      })
      .map((schedule) => [
        DAY_NAMES[
          schedule.diaSemana
        ] ?? "Dia",
        schedule.cursoCodigo ||
          `CUR-${schedule.cursoId}`,
        schedule.curso ||
          "Curso asignado",
        formatTime(
          schedule.horaInicio
        ),
        formatTime(
          schedule.horaFin
        ),
        formatDuration(
          durationMinutes(
            schedule
          )
        ),
        schedule.aula || "-",
        schedule.semestre || "-",
        schedule.activo
          ? "Activo"
          : "Inactivo",
      ]);

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row.map(csvCell).join(";")
      )
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8",
      }
    );
    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "mi-horario-docente.csv";
    document.body.appendChild(
      anchor
    );
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <LoadingState
        title="Cargando Mis horarios"
        description="Consultando la programacion academica asignada a su cuenta."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar Mis horarios"
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
        title="Mis horarios"
        description={`Programacion academica vigente de ${teacherName}. Consulte cursos, aulas, duraciones y distribucion semanal.`}
        badge={
          <span
            className={
              styles.semesterBadge
            }
          >
            <span />
            {activeSemester}
          </span>
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
              onClick={exportCsv}
              disabled={
                schedules.length ===
                0
              }
            >
              Exportar CSV
            </Button>
          </div>
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
          description="Cursos distintos dentro del horario activo."
          tone="blue"
          icon="courses"
        />

        <MetricCard
          title="Sesiones semanales"
          value={String(
            schedules.length
          ).padStart(2, "0")}
          description="Bloques academicos programados por semana."
          tone="green"
          icon="sessions"
        />

        <MetricCard
          title="Carga semanal"
          value={formatDuration(
            totalMinutes
          )}
          description="Duracion acumulada de todas las sesiones."
          tone="violet"
          icon="hours"
        />

        <MetricCard
          title="Aulas asignadas"
          value={String(
            uniqueRooms
          ).padStart(2, "0")}
          description="Espacios distintos incluidos en la programacion."
          tone="amber"
          icon="rooms"
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
                Agenda diaria
              </p>
              <h2>
                Clases de hoy
              </h2>
              <p>
                {now.toLocaleDateString(
                  "es-PE",
                  {
                    weekday:
                      "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

            <span
              className={
                styles.sectionCount
              }
            >
              {todaySchedules.length}{" "}
              clase(s)
            </span>
          </header>

          <div
            className={
              styles.todayContent
            }
          >
            {todaySchedules.length >
            0 ? (
              todaySchedules.map(
                (schedule) => (
                  <SessionCard
                    key={
                      schedule.id
                    }
                    schedule={
                      schedule
                    }
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
                  Sin clases para hoy
                </h3>

                <p>
                  No existen sesiones
                  activas programadas en
                  esta fecha.
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
              Proxima clase
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
                  styles.nextIcon
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
                  <dt>Semestre</dt>
                  <dd>
                    {nextSchedule
                      .schedule
                      .semestre || "-"}
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
              No existe una proxima clase
              disponible.
            </div>
          )}

          <footer
            className={
              styles.nextFooter
            }
          >
            La programacion es de solo
            lectura y es administrada por
            el sistema academico.
          </footer>
        </article>
      </section>

      {schedules.length > 0 ? (
        <TeacherWeeklySchedule
          horarios={schedules}
        />
      ) : (
        <section
          className={
            styles.emptySchedule
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
            Sin horarios asignados
          </h2>

          <p>
            Su programacion aparecera
            cuando el Administrador asigne
            cursos y sesiones activas.
          </p>
        </section>
      )}

      {groupedSchedules.length >
      0 ? (
        <section
          className={
            styles.detailCard
          }
        >
          <header
            className={
              styles.detailHeader
            }
          >
            <div>
              <h2>
                Detalle de programacion
              </h2>
              <p>
                Resumen ordenado por dia y
                hora de inicio.
              </p>
            </div>

            <span
              className={
                styles.detailCount
              }
            >
              {schedules.length}{" "}
              sesion(es)
            </span>
          </header>

          <div
            className={
              styles.dayGroups
            }
          >
            {groupedSchedules.map(
              (group) => (
                <article
                  key={
                    group.day
                  }
                  className={
                    styles.dayGroup
                  }
                >
                  <header>
                    <h3>
                      {DAY_NAMES[
                        group.day
                      ] ?? "Dia"}
                    </h3>

                    <span>
                      {
                        group
                          .schedules
                          .length
                      }{" "}
                      clase(s)
                    </span>
                  </header>

                  <div
                    className={
                      styles.daySessions
                    }
                  >
                    {group.schedules.map(
                      (schedule) => (
                        <SessionCard
                          key={
                            schedule.id
                          }
                          schedule={
                            schedule
                          }
                        />
                      )
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
