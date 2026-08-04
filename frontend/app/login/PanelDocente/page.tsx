"use client";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";


import { clearSession, getLegacyUser, getToken } from "@/lib/auth";
import {
  ApiHorariosError,
  getMisHorarios,
} from "@/lib/services/horarios.service";


import type { HorarioCurso } from "@/types/horario";


import styles from "./page.module.css";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const WEEK_DAYS = [
  { id: 1, short: "Lun", name: "Lunes" },
  { id: 2, short: "Mar", name: "Martes" },
  { id: 3, short: "Mie", name: "Miercoles" },
  { id: 4, short: "Jue", name: "Jueves" },
  { id: 5, short: "Vie", name: "Viernes" },
] as const;


interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
  codigo?: string;
}


interface DashboardPayload {
  stats: {
    asistencias: number;
    tardanzas: number;
    inasistencias: number;
  };
  historial: Array<{
    fecha: string;
    hora_registro: string;
    estado: string;
  }>;
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
  method: string;
}


class DashboardRequestError extends Error {
  status: number;


  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardRequestError";
    this.status = status;
  }
}


async function requestJson<T>(
  path: string,
  token: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });


  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;


  if (!response.ok) {
    throw new DashboardRequestError(
      (data as { error?: string } | null)?.error ??
        "No se pudo cargar el dashboard docente.",
      response.status
    );
  }


  if (!data) {
    throw new DashboardRequestError(
      "El servidor devolvio una respuesta vacia.",
      502
    );
  }


  return data as T;
}


function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function cleanDate(value: string): string {
  return String(value ?? "").split("T")[0];
}


function formatDate(value: string): string {
  const clean = cleanDate(value);
  const [year, month, day] = clean.split("-").map(Number);


  if (!year || !month || !day) {
    return value || "-";
  }


  return new Date(year, month - 1, day).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function formatTime(value: string): string {
  return String(value ?? "").slice(0, 5) || "--:--";
}


function statusLabel(value: string): string {
  const normalized = String(value ?? "").toUpperCase();


  if (normalized === "PUNTUAL" || normalized === "PRESENTE") {
    return normalized === "PUNTUAL" ? "Puntual" : "Presente";
  }


  if (normalized === "TARDANZA") {
    return "Tardanza";
  }


  if (normalized === "AUSENTE") {
    return "Ausente";
  }


  return normalized ? normalized.toLowerCase() : "Pendiente";
}


function statusTone(value: string): "green" | "orange" | "red" | "blue" {
  const normalized = String(value ?? "").toUpperCase();


  if (normalized === "PUNTUAL" || normalized === "PRESENTE") {
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


function isCurrentMonth(value: string, todayKey: string): boolean {
  return cleanDate(value).slice(0, 7) === todayKey.slice(0, 7);
}


function startOfCurrentWeek(now = new Date()): Date {
  const result = new Date(now);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
  result.setHours(0, 0, 0, 0);
  return result;
}


function isCurrentWeek(value: string, now = new Date()): boolean {
  const clean = cleanDate(value);
  const [year, month, day] = clean.split("-").map(Number);


  if (!year || !month || !day) {
    return false;
  }


  const recordDate = new Date(year, month - 1, day);
  const start = startOfCurrentWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return recordDate >= start && recordDate < end;
}


function getNextSchedule(
  schedules: HorarioCurso[],
  now = new Date()
): { schedule: HorarioCurso; startsAt: Date } | null {
  const candidates = schedules
    .filter((item) => item.activo)
    .map((schedule) => {
      const startsAt = new Date(now);
      const currentDay = now.getDay();
      let delta = schedule.diaSemana - currentDay;
      const [hour, minute] = schedule.horaInicio.split(":").map(Number);


      startsAt.setHours(hour || 0, minute || 0, 0, 0);


      if (delta < 0 || (delta === 0 && startsAt <= now)) {
        delta += 7;
      }


      startsAt.setDate(startsAt.getDate() + delta);
      return { schedule, startsAt };
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());


  return candidates[0] ?? null;
}


function timeUntilLabel(startsAt: Date | null, now = new Date()): string {
  if (!startsAt) {
    return "Sin actividad programada";
  }


  const minutes = Math.max(
    0,
    Math.round((startsAt.getTime() - now.getTime()) / 60000)
  );


  if (minutes < 60) {
    return `En ${minutes} min`;
  }


  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;


  if (hours < 24) {
    return remaining > 0
      ? `En ${hours} h ${remaining} min`
      : `En ${hours} h`;
  }


  return startsAt.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}


function MetricIcon({ type }: { type: "check" | "calendar" | "clock" | "alert" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;


  if (type === "check") {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }


  if (type === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
    );
  }


  if (type === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </svg>
    );
  }


  return (
    <svg {...common}>
      <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}


function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className={`${styles.statusPill} ${styles[`status${tone}`]}`}>
      {statusLabel(status)}
    </span>
  );
}


function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.sectionCard} ${className}`}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}


export default function DocenteDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [attendance, setAttendance] = useState<AttendancePayload>({
    ingresos: [],
    cursos: [],
  });
  const [schedules, setSchedules] = useState<HorarioCurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();


    async function loadDashboard() {
      setLoading(true);
      setError("");


      const storedUser = getLegacyUser();
      const token = getToken();


      if (!storedUser || !token) {
        clearSession();
        router.replace("/login");
        return;
      }


      setUser(storedUser);


      try {
        const [dashboardResponse, attendanceResponse, scheduleResponse] =
          await Promise.all([
            requestJson<DashboardPayload>(
              "/dashboard/docente",
              token,
              controller.signal
            ),
            requestJson<AttendancePayload>(
              "/asistencia/docente/me",
              token,
              controller.signal
            ),
            getMisHorarios(),
          ]);


        if (cancelled) {
          return;
        }


        setDashboard(dashboardResponse);
        setAttendance({
          ingresos: attendanceResponse.ingresos ?? [],
          cursos: attendanceResponse.cursos ?? [],
        });
        setSchedules(scheduleResponse.filter((item) => item.activo));
      } catch (loadError) {
        if (cancelled) {
          return;
        }


        if (
          (loadError instanceof DashboardRequestError &&
            [401, 403].includes(loadError.status)) ||
          (loadError instanceof ApiHorariosError &&
            [401, 403].includes(loadError.status))
        ) {
          clearSession();
          router.replace("/login");
          return;
        }


        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la informacion del docente."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    void loadDashboard();


    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, router]);


  const todayKey = localDateKey();
  const docenteName = user
    ? `${user.nombres} ${user.apellidos}`.trim()
    : "Docente";


  const todayEntry = useMemo(
    () =>
      attendance.ingresos.find(
        (entry) => cleanDate(entry.fecha) === todayKey
      ) ?? null,
    [attendance.ingresos, todayKey]
  );


  const nextSchedule = useMemo(
    () => getNextSchedule(schedules),
    [schedules]
  );


  const monthlyTardiness = useMemo(() => {
    const entries = attendance.ingresos.filter(
      (entry) =>
        isCurrentMonth(entry.fecha, todayKey) &&
        entry.estado.toUpperCase() === "TARDANZA"
    ).length;
    const courses = attendance.cursos.filter(
      (entry) =>
        isCurrentMonth(entry.fecha, todayKey) &&
        entry.estado.toUpperCase() === "TARDANZA"
    ).length;
    return Math.max(dashboard?.stats.tardanzas ?? 0, entries + courses);
  }, [attendance, dashboard, todayKey]);


  const monthlyAbsences = useMemo(() => {
    const entries = attendance.ingresos.filter(
      (entry) =>
        isCurrentMonth(entry.fecha, todayKey) &&
        entry.estado.toUpperCase() === "AUSENTE"
    ).length;
    const courses = attendance.cursos.filter(
      (entry) =>
        isCurrentMonth(entry.fecha, todayKey) &&
        entry.estado.toUpperCase() === "AUSENTE"
    ).length;
    return Math.max(dashboard?.stats.inasistencias ?? 0, entries + courses);
  }, [attendance, dashboard, todayKey]);


  const latestTardiness = useMemo(() => {
    return [...attendance.ingresos, ...attendance.cursos]
      .filter((entry) => entry.estado.toUpperCase() === "TARDANZA")
      .sort((a, b) => cleanDate(b.fecha).localeCompare(cleanDate(a.fecha)))[0];
  }, [attendance]);


  const latestAbsence = useMemo(() => {
    return [...attendance.ingresos, ...attendance.cursos]
      .filter((entry) => entry.estado.toUpperCase() === "AUSENTE")
      .sort((a, b) => cleanDate(b.fecha).localeCompare(cleanDate(a.fecha)))[0];
  }, [attendance]);


  const recentRecords = useMemo<RecentRecord[]>(() => {
    const entries = attendance.ingresos.map((entry, index) => ({
      key: `entry-${cleanDate(entry.fecha)}-${entry.hora_registro}-${index}`,
      date: cleanDate(entry.fecha),
      time: formatTime(entry.hora_registro),
      type: "Ingreso institucional",
      detail: "Acceso general a la universidad",
      status: entry.estado,
      method: "Sistema",
    }));


    const courses = attendance.cursos.map((entry, index) => ({
      key: `course-${cleanDate(entry.fecha)}-${entry.hora_registro}-${index}`,
      date: cleanDate(entry.fecha),
      time: formatTime(entry.hora_registro),
      type: "Asistencia de curso",
      detail: `${entry.curso || "Curso"} - ${entry.aula || "Sin aula"}`,
      status: entry.estado,
      method: "Sistema",
    }));


    return [...entries, ...courses]
      .sort((a, b) =>
        `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
      )
      .slice(0, 5);
  }, [attendance]);


  const classesDictatedThisWeek = useMemo(
    () => attendance.cursos.filter((entry) => isCurrentWeek(entry.fecha)).length,
    [attendance.cursos]
  );


  const upcoming = nextSchedule?.schedule ?? null;
  const upcomingDay = upcoming
    ? WEEK_DAYS.find((day) => day.id === upcoming.diaSemana)?.name ?? ""
    : "";


  if (loading) {
    return (
      <div className={styles.dashboard} aria-busy="true">
        <div className={styles.loadingTitle} />
        <div className={styles.loadingSubtitle} />
        <div className={styles.loadingGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.loadingCard} />
          ))}
        </div>
        <div className={styles.loadingPanel} />
      </div>
    );
  }


  if (error) {
    return (
      <div className={styles.dashboard}>
        <section className={styles.errorCard}>
          <span className={styles.errorIcon}>!</span>
          <div>
            <h1>No se pudo cargar el dashboard docente</h1>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              Reintentar
            </button>
          </div>
        </section>
      </div>
    );
  }


  const currentStatus = todayEntry?.estado ?? "PENDIENTE";
  const currentStatusText = todayEntry
    ? statusLabel(todayEntry.estado)
    : "Pendiente";


  return (
    <div className={styles.dashboard}>
      <header className={styles.pageIntro}>
        <div>
          <h1>Dashboard del docente</h1>
          <p>
            Bienvenido, <strong>{docenteName}</strong> &middot; Resumen de
            asistencia y actividad acad&eacute;mica
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Actualizar datos
        </button>
      </header>


      <section className={styles.metricsGrid} aria-label="Indicadores docentes">
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricGreen}`}>
            <MetricIcon type="check" />
          </span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Estado de asistencia del d&iacute;a</span>
            <strong className={`${styles.metricValue} ${styles.valueGreen}`}>
              {currentStatusText}
            </strong>
            <span className={styles.metricDetail}>
              {todayEntry
                ? `Ingreso registrado a las ${formatTime(todayEntry.hora_registro)}`
                : "Aun no existe ingreso institucional registrado"}
            </span>
            <StatusPill status={currentStatus} />
          </div>
        </article>


        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricBlue}`}>
            <MetricIcon type="calendar" />
          </span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Pr&oacute;ximo curso asignado</span>
            <strong className={styles.courseValue}>
              {upcoming?.curso || "Sin curso programado"}
            </strong>
            <span className={styles.metricDetail}>
              {upcoming
                ? `${upcoming.aula || "Sin aula"} - ${formatTime(upcoming.horaInicio)} a ${formatTime(upcoming.horaFin)}`
                : "No existen horarios activos para mostrar"}
            </span>
            <span className={styles.metricFootnote}>
              {upcoming
                ? `${upcomingDay} - ${upcoming.semestre || "Periodo activo"}`
                : "Consulte la programacion academica"}
            </span>
          </div>
        </article>


        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricOrange}`}>
            <MetricIcon type="clock" />
          </span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Tardanzas del mes</span>
            <strong className={`${styles.metricValue} ${styles.valueOrange}`}>
              {String(monthlyTardiness).padStart(2, "0")}
            </strong>
            <span className={styles.metricDetail}>
              Ingresos institucionales y sesiones de curso
            </span>
            <span className={styles.metricFootnote}>
              Ultima tardanza: {latestTardiness ? formatDate(latestTardiness.fecha) : "Sin registros"}
            </span>
          </div>
        </article>


        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.metricRed}`}>
            <MetricIcon type="alert" />
          </span>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Inasistencias del mes</span>
            <strong className={`${styles.metricValue} ${styles.valueRed}`}>
              {String(monthlyAbsences).padStart(2, "0")}
            </strong>
            <span className={styles.metricDetail}>
              Registros de ausencia en el periodo actual
            </span>
            <span className={styles.metricFootnote}>
              Ultima ausencia: {latestAbsence ? formatDate(latestAbsence.fecha) : "Sin registros"}
            </span>
          </div>
        </article>
      </section>


      <div className={styles.middleGrid}>
        <SectionCard
          title="Calendario resumido semanal"
          description="Vista de los cursos programados en la semana academica."
          className={styles.calendarCard}
        >
          <div className={styles.weekGrid}>
            {WEEK_DAYS.map((day) => {
              const daySchedules = schedules
                .filter((schedule) => schedule.diaSemana === day.id)
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));


              return (
                <div key={day.id} className={styles.dayColumn}>
                  <div className={styles.dayHeader}>
                    <strong>{day.short}</strong>
                    <span>{day.name}</span>
                  </div>
                  <div className={styles.dayBody}>
                    {daySchedules.length === 0 ? (
                      <span className={styles.emptyDay}>Sin clases</span>
                    ) : (
                      daySchedules.map((schedule, index) => (
                        <article
                          key={schedule.id}
                          className={`${styles.scheduleBlock} ${styles[`tone${index % 5}`]}`}
                        >
                          <strong>{schedule.curso || "Curso asignado"}</strong>
                          <span>
                            {formatTime(schedule.horaInicio)} - {formatTime(schedule.horaFin)}
                          </span>
                          <small>{schedule.aula || "Sin aula"}</small>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>


        <SectionCard
          title={<>Pr&oacute;xima actividad acad&eacute;mica</>}
          description="Detalles de la siguiente sesion programada."
          className={styles.upcomingCard}
        >
          <div className={styles.upcomingContent}>
            {upcoming ? (
              <>
                <article className={styles.upcomingCourse}>
                  <div>
                    <strong>{upcoming.curso || "Curso asignado"}</strong>
                    <span>{upcoming.departamento || "Actividad academica"}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Aula</dt>
                      <dd>{upcoming.aula || "Sin aula"}</dd>
                    </div>
                    <div>
                      <dt>Horario</dt>
                      <dd>
                        {formatTime(upcoming.horaInicio)} - {formatTime(upcoming.horaFin)}
                      </dd>
                    </div>
                    <div>
                      <dt>Dia</dt>
                      <dd>{upcomingDay}</dd>
                    </div>
                  </dl>
                  <span className={styles.timeUntil}>
                    {timeUntilLabel(nextSchedule?.startsAt ?? null)}
                  </span>
                </article>


                <div className={styles.observationBox}>
                  <strong>Recordatorio</strong>
                  <p>
                    Verifique su marcacion de ingreso antes de iniciar la sesion y confirme que el dispositivo movil se encuentre sincronizado.
                  </p>
                </div>


                <Link
                  href="/login/PanelDocente/asistencia/cursos"
                  className={styles.orangeButton}
                >
                  Ver horario y asistencia
                </Link>
              </>
            ) : (
              <div className={styles.emptyUpcoming}>
                <strong>No existe una actividad proxima</strong>
                <p>El docente no tiene horarios activos registrados.</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>


      <div className={styles.bottomGrid}>
        <SectionCard
          title={<>Ultimas marcaciones</>}
          description="Ingreso institucional y asistencias de curso registradas recientemente."
          className={styles.recordsCard}
        >
          <div className={styles.tableWrapper}>
            <table className={styles.recordsTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Tipo de marcacion</th>
                  <th>Detalle</th>
                  <th>Resultado</th>
                  <th>Metodo</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyTable}>
                      No existen marcaciones registradas para mostrar.
                    </td>
                  </tr>
                ) : (
                  recentRecords.map((record) => (
                    <tr key={record.key}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.time}</td>
                      <td>{record.type}</td>
                      <td>{record.detail}</td>
                      <td>
                        <StatusPill status={record.status} />
                      </td>
                      <td>{record.method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>


        <SectionCard
          title="Resumen de la semana"
          description="Indicadores rapidos de cumplimiento y programacion."
          className={styles.summaryCard}
        >
          <div className={styles.summaryContent}>
            <div className={styles.summaryMetrics}>
              <article>
                <span>Clases programadas</span>
                <strong className={styles.summaryBlue}>{schedules.length}</strong>
              </article>
              <article>
                <span>Clases registradas</span>
                <strong className={styles.summaryGreen}>
                  {classesDictatedThisWeek}
                </strong>
              </article>
            </div>


            <div className={styles.reminderCard}>
              <strong>Recordatorio academico</strong>
              <p>
                {upcoming
                  ? `${upcomingDay} tiene ${upcoming.curso || "una sesion"} a las ${formatTime(upcoming.horaInicio)} en ${upcoming.aula || "aula por confirmar"}.`
                  : "No existen clases proximas dentro del horario activo."}
              </p>
              <span>
                Revise sus horarios y mantenga la aplicacion movil sincronizada.
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}