"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
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

const REFRESH_INTERVAL_MS = 60_000;
const HISTORY_CONCURRENCY = 6;
const LIMA_TIME_ZONE =
  "America/Lima";

type AlertKind =
  | "TARDANZA"
  | "INASISTENCIA"
  | "INCOMPLETO";

type AlertSeverity =
  | "Alta"
  | "Media";

type AlertScope =
  | "Ingreso institucional"
  | "Asistencia a curso";

type AlertTab =
  | "TODAS"
  | "HOY"
  | "TARDANZA"
  | "INASISTENCIA"
  | "INCOMPLETO";

interface SessionUser {
  rol?: string;
}

interface SupervisorDashboardResponse {
  stats?: {
    docentesMonitoreados?: number | string;
    alertasNuevas?: number | string;
    inconsistencias?: number | string;
    registrosValidados?: number | string;
  };
  error?: string;
}

interface TeacherRecord {
  id: number | string;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  departamento?: string;
}

interface TeachersResponse {
  docentes?: TeacherRecord[];
  error?: string;
}

interface InstitutionalRecord {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface CourseRecord
  extends InstitutionalRecord {
  curso?: string;
  aula?: string;
}

interface TeacherHistoryResponse {
  docente_id?: number | string;
  ingresos?: InstitutionalRecord[];
  cursos?: CourseRecord[];
  error?: string;
}

interface TeacherHistory {
  teacher: TeacherRecord;
  history: TeacherHistoryResponse;
}

interface OperationalAlert {
  id: string;
  kind: AlertKind;
  title: string;
  teacher: string;
  teacherCode: string;
  department: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  severity: AlertSeverity;
  scope: AlertScope;
  course: string;
  room: string;
  description: string;
  source: string;
}

interface DayBucket {
  key: string;
  label: string;
}

interface DataSource {
  key: string;
  label: string;
  ok: boolean;
  description: string;
}

class AlertsRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "AlertsRequestError";
    this.status = status;
  }
}

function cleanText(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizeText(
  value: unknown
): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function normalizeStatus(
  value: unknown
): string {
  return cleanText(value).toUpperCase();
}

function toNumber(
  value: number | string | null | undefined
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function teacherName(
  teacher: TeacherRecord
): string {
  return (
    `${teacher.nombres ?? ""} ${
      teacher.apellidos ?? ""
    }`.trim() ||
    "Docente no informado"
  );
}

function dateKey(
  value: string | undefined
): string {
  return cleanText(value).slice(
    0,
    10
  );
}

function formatDate(
  value: string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value || "—";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatTime(
  value: string | undefined
): string {
  return (
    cleanText(value).slice(0, 8) ||
    "—"
  );
}

function getLimaDateKey(
  date = new Date()
): string {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: LIMA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "0000";
  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "00";
  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function lastSevenDays(
  today: string
): DayBucket[] {
  const base = new Date(
    `${today}T12:00:00Z`
  );

  return Array.from(
    { length: 7 },
    (_, index) => {
      const current =
        new Date(base);

      current.setUTCDate(
        base.getUTCDate() -
          (6 - index)
      );

      const key =
        current
          .toISOString()
          .slice(0, 10);

      const label =
        new Intl.DateTimeFormat(
          "es-PE",
          {
            weekday: "short",
            timeZone: "UTC",
          }
        )
          .format(current)
          .replace(".", "")
          .slice(0, 2)
          .toUpperCase();

      return { key, label };
    }
  );
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

async function requestJson<T>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | T
      | { error?: string }
      | null;

  if (!response.ok) {
    throw new AlertsRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar una fuente de alertas.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

async function mapWithConcurrency<
  T,
  R,
>(
  items: T[],
  concurrency: number,
  mapper: (
    item: T,
    index: number
  ) => Promise<R>
): Promise<R[]> {
  const results =
    new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] =
        await mapper(
          items[index],
          index
        );
    }
  }

  const workerCount =
    Math.min(
      Math.max(concurrency, 1),
      Math.max(items.length, 1)
    );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );

  return results;
}

function AlertIcon({
  kind,
}: {
  kind: AlertKind;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (kind === "TARDANZA") {
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

  if (kind === "INASISTENCIA") {
    return (
      <svg {...common}>
        <circle
          cx="9"
          cy="7"
          r="4"
        />
        <path d="M3 21v-2a6 6 0 0 1 9-5.2" />
        <path d="m17 14 4 4M21 14l-4 4" />
      </svg>
    );
  }

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
      <path d="M18 17h.01" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone,
  kind,
}: {
  title: string;
  value: number;
  description: string;
  tone:
    | "amber"
    | "red"
    | "blue"
    | "purple";
  kind: AlertKind;
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
        <AlertIcon kind={kind} />
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
          {String(value).padStart(
            2,
            "0"
          )}
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

function SeverityBadge({
  severity,
}: {
  severity: AlertSeverity;
}) {
  return (
    <span
      className={`${styles.severityBadge} ${
        severity === "Alta"
          ? styles.severityHigh
          : styles.severityMedium
      }`}
    >
      {severity === "Alta"
        ? "Gravedad alta"
        : "Gravedad media"}
    </span>
  );
}

export default function SupervisorAlertsPage() {
  const router = useRouter();

  const [
    dashboard,
    setDashboard,
  ] =
    useState<SupervisorDashboardResponse | null>(
      null
    );
  const [
    teachers,
    setTeachers,
  ] = useState<TeacherRecord[]>(
    []
  );
  const [
    histories,
    setHistories,
  ] = useState<TeacherHistory[]>(
    []
  );
  const [
    historyFailures,
    setHistoryFailures,
  ] = useState(0);
  const [
    sources,
    setSources,
  ] = useState<DataSource[]>(
    []
  );
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(
    null
  );
  const [tab, setTab] =
    useState<AlertTab>("TODAS");
  const [search, setSearch] =
    useState("");
  const [
    department,
    setDepartment,
  ] = useState("TODOS");
  const [
    selectedId,
    setSelectedId,
  ] = useState("");
  const [notice, setNotice] =
    useState("");

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {
        const storedUser =
          getLegacyUser() as
            | SessionUser
            | null;
        const token =
          getToken();

        if (
          !storedUser ||
          !token ||
          normalizeStatus(
            storedUser.rol
          ) !== "SUPERVISOR"
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const baseResults =
          await Promise.allSettled([
            requestJson<SupervisorDashboardResponse>(
              "/dashboard/supervisor",
              token
            ),
            requestJson<TeachersResponse>(
              "/docentes",
              token
            ),
          ]);

        const rejected =
          baseResults.filter(
            (
              result
            ): result is PromiseRejectedResult =>
              result.status ===
              "rejected"
          );

        const unauthorized =
          rejected.find((result) => {
            const reason =
              result.reason;

            return (
              reason instanceof
                AlertsRequestError &&
              [401, 403].includes(
                reason.status
              )
            );
          });

        if (unauthorized) {
          clearSession();
          router.replace("/login");
          return;
        }

        const dashboardResult =
          baseResults[0];
        const teachersResult =
          baseResults[1];

        if (
          dashboardResult.status ===
          "fulfilled"
        ) {
          setDashboard(
            dashboardResult.value
          );
        }

        let activeTeachers:
          TeacherRecord[] = [];

        if (
          teachersResult.status ===
          "fulfilled"
        ) {
          activeTeachers =
            (
              teachersResult.value
                .docentes ?? []
            ).filter(
              (teacher) =>
                teacher.activo !==
                false
            );

          setTeachers(
            activeTeachers
          );
        }

        let failedHistories = 0;
        let loadedHistories:
          TeacherHistory[] = [];

        if (
          activeTeachers.length > 0
        ) {
          try {
            const historyResults =
              await mapWithConcurrency(
                activeTeachers,
                HISTORY_CONCURRENCY,
                async (
                  teacher
                ): Promise<TeacherHistory | null> => {
                  try {
                    const history =
                      await requestJson<TeacherHistoryResponse>(
                        `/asistencia/docente/${teacher.id}`,
                        token
                      );

                    return {
                      teacher,
                      history,
                    };
                  } catch (
                    historyError
                  ) {
                    if (
                      historyError instanceof
                        AlertsRequestError &&
                      [401, 403].includes(
                        historyError.status
                      )
                    ) {
                      throw historyError;
                    }

                    failedHistories += 1;
                    return null;
                  }
                }
              );

            loadedHistories =
              historyResults.filter(
                (
                  item
                ): item is TeacherHistory =>
                  item !== null
              );
          } catch (
            historyError
          ) {
            if (
              historyError instanceof
                AlertsRequestError &&
              [401, 403].includes(
                historyError.status
              )
            ) {
              clearSession();
              router.replace(
                "/login"
              );
              return;
            }

            failedHistories =
              activeTeachers.length;
          }
        }

        setHistories(
          loadedHistories
        );
        setHistoryFailures(
          failedHistories
        );

        setSources([
          {
            key: "dashboard",
            label:
              "Conteo de alertas en PostgreSQL",
            ok:
              dashboardResult.status ===
              "fulfilled",
            description:
              dashboardResult.status ===
              "fulfilled"
                ? "Conteo no leido disponible"
                : "Resumen no disponible",
          },
          {
            key: "teachers",
            label:
              "Directorio docente",
            ok:
              teachersResult.status ===
              "fulfilled",
            description:
              teachersResult.status ===
              "fulfilled"
                ? `${activeTeachers.length} docentes activos`
                : "No se pudo consultar",
          },
          {
            key: "histories",
            label:
              "Historiales personales",
            ok:
              loadedHistories.length >
                0 ||
              activeTeachers.length ===
                0,
            description:
              failedHistories > 0
                ? `${failedHistories} historial(es) sin respuesta`
                : "Consulta completada",
          },
        ]);

        if (
          baseResults.every(
            (result) =>
              result.status ===
              "rejected"
          )
        ) {
          const firstReason =
            rejected[0]?.reason;

          setError(
            firstReason instanceof Error
              ? firstReason.message
              : "No se pudo cargar la bandeja de alertas."
          );
        } else {
          setLastUpdated(
            new Date()
          );
        }

        setLoading(false);
        setRefreshing(false);
      },
      [router]
    );

  useEffect(() => {
    void loadData();

    const timer =
      window.setInterval(() => {
        void loadData(true);
      }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [loadData]);

  const today =
    useMemo(
      () => getLimaDateKey(),
      [lastUpdated]
    );

  const days =
    useMemo(
      () => lastSevenDays(today),
      [today]
    );

  const dayKeys =
    useMemo(
      () =>
        new Set(
          days.map(
            (day) => day.key
          )
        ),
      [days]
    );

  const alerts =
    useMemo<OperationalAlert[]>(
      () => {
        const result:
          OperationalAlert[] = [];

        histories.forEach(
          ({ teacher, history }) => {
            const common = {
              teacher:
                teacherName(
                  teacher
                ),
              teacherCode:
                cleanText(
                  teacher.codigo
                ) || "—",
              department:
                cleanText(
                  teacher.departamento
                ) ||
                "No informado",
            };

            (
              history.ingresos ?? []
            ).forEach(
              (record, index) => {
                const date =
                  dateKey(
                    record.fecha
                  );

                if (
                  !dayKeys.has(date)
                ) {
                  return;
                }

                const status =
                  normalizeStatus(
                    record.estado
                  );

                if (
                  status ===
                  "TARDANZA"
                ) {
                  result.push({
                    id: `ingreso-tardanza-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "TARDANZA",
                    title:
                      "Tardanza registrada",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity:
                      "Media",
                    scope:
                      "Ingreso institucional",
                    course:
                      "No aplica",
                    room: "—",
                    description:
                      "El historial institucional devuelve expresamente el estado TARDANZA.",
                    source:
                      "Historial institucional del docente",
                  });
                }

                if (
                  status ===
                  "AUSENTE"
                ) {
                  result.push({
                    id: `ingreso-ausencia-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "INASISTENCIA",
                    title:
                      "Inasistencia registrada",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity: "Alta",
                    scope:
                      "Ingreso institucional",
                    course:
                      "No aplica",
                    room: "—",
                    description:
                      "El historial institucional devuelve expresamente el estado AUSENTE.",
                    source:
                      "Historial institucional del docente",
                  });
                }

                if (!status) {
                  result.push({
                    id: `ingreso-incompleto-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "INCOMPLETO",
                    title:
                      "Registro institucional incompleto",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity:
                      "Media",
                    scope:
                      "Ingreso institucional",
                    course:
                      "No aplica",
                    room: "—",
                    description:
                      "La marcacion institucional no contiene un estado valido.",
                    source:
                      "Historial institucional del docente",
                  });
                }
              }
            );

            (
              history.cursos ?? []
            ).forEach(
              (record, index) => {
                const date =
                  dateKey(
                    record.fecha
                  );

                if (
                  !dayKeys.has(date)
                ) {
                  return;
                }

                const status =
                  normalizeStatus(
                    record.estado
                  );
                const course =
                  cleanText(
                    record.curso
                  );
                const room =
                  cleanText(
                    record.aula
                  );

                if (
                  status ===
                  "TARDANZA"
                ) {
                  result.push({
                    id: `curso-tardanza-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "TARDANZA",
                    title:
                      "Tardanza en curso",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity:
                      "Media",
                    scope:
                      "Asistencia a curso",
                    course:
                      course ||
                      "Curso no informado",
                    room:
                      room || "—",
                    description:
                      "El historial del curso devuelve expresamente el estado TARDANZA.",
                    source:
                      "Historial academico del docente",
                  });
                }

                if (
                  status ===
                  "AUSENTE"
                ) {
                  result.push({
                    id: `curso-ausencia-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "INASISTENCIA",
                    title:
                      "Inasistencia a curso",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity: "Alta",
                    scope:
                      "Asistencia a curso",
                    course:
                      course ||
                      "Curso no informado",
                    room:
                      room || "—",
                    description:
                      "El historial del curso devuelve expresamente el estado AUSENTE.",
                    source:
                      "Historial academico del docente",
                  });
                }

                if (
                  !status ||
                  !course ||
                  !room
                ) {
                  result.push({
                    id: `curso-incompleto-${teacher.id}-${date}-${record.hora_registro}-${index}`,
                    kind:
                      "INCOMPLETO",
                    title:
                      "Registro academico incompleto",
                    ...common,
                    dateKey: date,
                    dateLabel:
                      formatDate(
                        date
                      ),
                    time:
                      formatTime(
                        record.hora_registro
                      ),
                    severity:
                      !course && !room
                        ? "Alta"
                        : "Media",
                    scope:
                      "Asistencia a curso",
                    course:
                      course ||
                      "Curso no informado",
                    room:
                      room || "—",
                    description:
                      "La marcacion academica carece de estado, curso o aula completos.",
                    source:
                      "Historial academico del docente",
                  });
                }
              }
            );
          }
        );

        return result.sort(
          (first, second) => {
            if (
              first.severity !==
              second.severity
            ) {
              return first.severity ===
                "Alta"
                ? -1
                : 1;
            }

            const dateOrder =
              second.dateKey.localeCompare(
                first.dateKey
              );

            if (dateOrder) {
              return dateOrder;
            }

            return second.time.localeCompare(
              first.time
            );
          }
        );
      },
      [histories, dayKeys]
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            alerts
              .map(
                (alert) =>
                  alert.department
              )
              .filter(
                (value) =>
                  value &&
                  value !==
                    "No informado"
              )
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "es-PE"
          )
        ),
      [alerts]
    );

  const filteredAlerts =
    useMemo(
      () => {
        const normalizedSearch =
          normalizeText(search);

        return alerts.filter(
          (alert) => {
            const matchesTab =
              tab === "TODAS" ||
              (tab === "HOY" &&
                alert.dateKey ===
                  today) ||
              alert.kind === tab;

            const matchesSearch =
              !normalizedSearch ||
              [
                alert.title,
                alert.teacher,
                alert.teacherCode,
                alert.department,
                alert.course,
                alert.room,
                alert.scope,
              ].some((value) =>
                normalizeText(
                  value
                ).includes(
                  normalizedSearch
                )
              );

            const matchesDepartment =
              department ===
                "TODOS" ||
              alert.department ===
                department;

            return (
              matchesTab &&
              matchesSearch &&
              matchesDepartment
            );
          }
        );
      },
      [
        alerts,
        tab,
        search,
        department,
        today,
      ]
    );

  const selectedAlert =
    alerts.find(
      (alert) =>
        alert.id === selectedId
    ) ??
    filteredAlerts[0] ??
    alerts[0] ??
    null;

  useEffect(() => {
    if (
      selectedAlert &&
      selectedAlert.id !==
        selectedId
    ) {
      setSelectedId(
        selectedAlert.id
      );
    }
  }, [
    selectedAlert,
    selectedId,
  ]);

  const tardinessToday =
    alerts.filter(
      (alert) =>
        alert.kind ===
          "TARDANZA" &&
        alert.dateKey === today
    ).length;

  const absencesToday =
    alerts.filter(
      (alert) =>
        alert.kind ===
          "INASISTENCIA" &&
        alert.dateKey === today
    ).length;

  const incompleteWeek =
    alerts.filter(
      (alert) =>
        alert.kind ===
        "INCOMPLETO"
    ).length;

  const databaseUnread =
    toNumber(
      dashboard?.stats
        ?.alertasNuevas
    );

  const dayCounts =
    useMemo(
      () =>
        days.map((day) => ({
          ...day,
          total: alerts.filter(
            (alert) =>
              alert.dateKey ===
              day.key
          ).length,
        })),
      [days, alerts]
    );

  const chartMax =
    Math.max(
      1,
      ...dayCounts.map(
        (day) => day.total
      )
    );

  const kindCounts =
    {
      tardiness: alerts.filter(
        (alert) =>
          alert.kind ===
          "TARDANZA"
      ).length,
      absences: alerts.filter(
        (alert) =>
          alert.kind ===
          "INASISTENCIA"
      ).length,
      incomplete: alerts.filter(
        (alert) =>
          alert.kind ===
          "INCOMPLETO"
      ).length,
  };

  const maxKind =
    Math.max(
      1,
      kindCounts.tardiness,
      kindCounts.absences,
      kindCounts.incomplete
    );

  function exportCsv() {
    const rows = [
      [
        "Tipo",
        "Titulo",
        "Docente",
        "Codigo",
        "Departamento",
        "Fecha",
        "Hora",
        "Gravedad",
        "Ambito",
        "Curso",
        "Aula",
        "Descripcion",
        "Fuente",
      ],
      ...filteredAlerts.map(
        (alert) => [
          alert.kind,
          alert.title,
          alert.teacher,
          alert.teacherCode,
          alert.department,
          alert.dateLabel,
          alert.time,
          alert.severity,
          alert.scope,
          alert.course,
          alert.room,
          alert.description,
          alert.source,
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            csvCell(value)
          )
          .join(";")
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
      `alertas-operativas-${today}.csv`;
    document.body.appendChild(
      anchor
    );
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyEvidence() {
    if (!selectedAlert) {
      return;
    }

    const text = [
      `Tipo: ${selectedAlert.title}`,
      `Docente: ${selectedAlert.teacher}`,
      `Codigo: ${selectedAlert.teacherCode}`,
      `Departamento: ${selectedAlert.department}`,
      `Fecha: ${selectedAlert.dateLabel}`,
      `Hora: ${selectedAlert.time}`,
      `Gravedad: ${selectedAlert.severity}`,
      `Ambito: ${selectedAlert.scope}`,
      `Curso: ${selectedAlert.course}`,
      `Aula: ${selectedAlert.room}`,
      `Descripcion: ${selectedAlert.description}`,
      `Fuente: ${selectedAlert.source}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        text
      );
      setNotice(
        "Evidencia copiada al portapapeles."
      );
      window.setTimeout(
        () => setNotice(""),
        2200
      );
    } catch {
      setNotice(
        "No se pudo copiar la evidencia."
      );
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Cargando alertas por incumplimiento"
        description="Consultando docentes activos y sus historiales institucionales y academicos."
        fullHeight
      />
    );
  }

  if (
    error &&
    !dashboard &&
    teachers.length === 0 &&
    histories.length === 0
  ) {
    return (
      <ErrorState
        title="No se pudo cargar la bandeja de alertas"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          void loadData()
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
        eyebrow="Seguimiento operativo"
        title="Alertas por incumplimiento"
        description="Bandeja de tardanzas, inasistencias y registros incompletos respaldados por los historiales reales."
        badge={
          <span
            className={
              styles.activeBadge
            }
          >
            <span />
            Alertas activas
          </span>
        }
        actions={
          <div
            className={
              styles.headerActions
            }
          >
            <span
              className={
                styles.updateLabel
              }
            >
              Actualizado:{" "}
              <strong>
                {lastUpdated
                  ? new Intl.DateTimeFormat(
                      "es-PE",
                      {
                        timeZone:
                          LIMA_TIME_ZONE,
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                        second:
                          "2-digit",
                        hour12: false,
                      }
                    ).format(
                      lastUpdated
                    )
                  : "—"}
              </strong>
            </span>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadData(
                  true
                )
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Actualizando..."
                : "Actualizar"}
            </Button>

            <Button
              type="button"
              onClick={exportCsv}
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
          title="Tardanzas hoy"
          value={tardinessToday}
          description="Estados TARDANZA explicitos en la fecha actual"
          tone="amber"
          kind="TARDANZA"
        />

        <MetricCard
          title="Inasistencias hoy"
          value={absencesToday}
          description="Solo registros que el backend devuelve como AUSENTE"
          tone="red"
          kind="INASISTENCIA"
        />

        <MetricCard
          title="Registros incompletos"
          value={incompleteWeek}
          description="Estados, cursos o aulas incompletos en siete dias"
          tone="blue"
          kind="INCOMPLETO"
        />

        <MetricCard
          title="No leidas en PostgreSQL"
          value={databaseUnread}
          description="Conteo global; el backend aun no expone su detalle"
          tone="purple"
          kind="INCOMPLETO"
        />

        <article
          className={
            styles.trendCard
          }
        >
          <header>
            <div>
              <h2>
                Alertas por dia
              </h2>
              <p>
                Ultimos siete dias
              </p>
            </div>
            <strong>
              {alerts.length}
            </strong>
          </header>

          <div
            className={
              styles.miniChart
            }
            aria-label="Alertas operativas de los ultimos siete dias"
          >
            {dayCounts.map(
              (day) => (
                <div
                  key={day.key}
                  className={
                    styles.miniColumn
                  }
                >
                  <span
                    className={
                      styles.barValue
                    }
                  >
                    {day.total}
                  </span>
                  <span
                    className={
                      styles.barTrack
                    }
                  >
                    <span
                      className={
                        styles.barFill
                      }
                      style={{
                        height: `${Math.max(
                          8,
                          (day.total /
                            chartMax) *
                            100
                        )}%`,
                      }}
                    />
                  </span>
                  <small>
                    {day.label}
                  </small>
                </div>
              )
            )}
          </div>
        </article>
      </section>

      <section
        className={
          styles.sourceNotice
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 11v5M12 8h.01" />
        </svg>

        <div>
          <strong>
            Alcance actual de la bandeja
          </strong>
          <p>
            PostgreSQL informa{" "}
            <b>
              {databaseUnread}
            </b>{" "}
            alerta(s) no leida(s), pero la
            API del Supervisor no devuelve
            sus mensajes ni permite
            atenderlas. El listado inferior
            se construye con estados
            explicitos de asistencia y
            permanece en modo consulta.
          </p>
        </div>

        <div
          className={
            styles.sourcePills
          }
        >
          {sources.map(
            (source) => (
              <span
                key={source.key}
                className={
                  source.ok
                    ? styles.sourceOk
                    : styles.sourceWarning
                }
                title={
                  source.description
                }
              >
                <span />
                {source.label}
              </span>
            )
          )}
        </div>
      </section>

      <section
        className={
          styles.toolbarCard
        }
      >
        <div
          className={
            styles.tabs
          }
          role="tablist"
          aria-label="Filtros de alertas"
        >
          {[
            ["TODAS", "Todas"],
            ["HOY", "Hoy"],
            [
              "TARDANZA",
              "Tardanzas",
            ],
            [
              "INASISTENCIA",
              "Inasistencias",
            ],
            [
              "INCOMPLETO",
              "Incompletos",
            ],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={
                  tab === value
                }
                className={
                  tab === value
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  setTab(
                    value as AlertTab
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        <label
          className={
            styles.searchField
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="search"
            placeholder="Buscar docente, curso o tipo de alerta"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </label>

        <label
          className={
            styles.departmentField
          }
        >
          <span>Departamento</span>
          <select
            value={department}
            onChange={(event) =>
              setDepartment(
                event.target.value
              )
            }
          >
            <option value="TODOS">
              Todos
            </option>
            {departments.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </label>
      </section>

      <section
        className={
          styles.contentGrid
        }
      >
        <article
          className={
            styles.alertsCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Alertas registradas
              </h2>
              <p>
                Priorice las alertas de
                gravedad alta respaldadas
                por estados explicitos.
              </p>
            </div>

            <span
              className={
                styles.resultBadge
              }
            >
              {
                filteredAlerts.length
              }{" "}
              resultado(s)
            </span>
          </header>

          <div
            className={
              styles.alertList
            }
          >
            {filteredAlerts.length >
            0 ? (
              filteredAlerts.map(
                (alert) => (
                  <article
                    key={alert.id}
                    className={`${styles.alertItem} ${
                      styles[
                        `alert${alert.kind.toLowerCase()}`
                      ]
                    } ${
                      selectedAlert?.id ===
                      alert.id
                        ? styles.selectedAlert
                        : ""
                    }`}
                  >
                    <span
                      className={
                        styles.alertAccent
                      }
                    />

                    <span
                      className={
                        styles.alertIcon
                      }
                    >
                      <AlertIcon
                        kind={
                          alert.kind
                        }
                      />
                    </span>

                    <div
                      className={
                        styles.alertMain
                      }
                    >
                      <div
                        className={
                          styles.alertTitleRow
                        }
                      >
                        <h3>
                          {
                            alert.title
                          }
                        </h3>
                        <SeverityBadge
                          severity={
                            alert.severity
                          }
                        />
                      </div>

                      <p
                        className={
                          styles.alertIdentity
                        }
                      >
                        {alert.teacher} ·{" "}
                        {alert.course} ·{" "}
                        {alert.room}
                      </p>

                      <p
                        className={
                          styles.alertDescription
                        }
                      >
                        Fecha:{" "}
                        {alert.dateLabel} ·
                        Hora: {alert.time} ·{" "}
                        {
                          alert.description
                        }
                      </p>

                      <div
                        className={
                          styles.alertMeta
                        }
                      >
                        <span>
                          {
                            alert.scope
                          }
                        </span>
                        <span>
                          {
                            alert.department
                          }
                        </span>
                        <span>
                          {
                            alert.teacherCode
                          }
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.evidenceButton
                      }
                      onClick={() =>
                        setSelectedId(
                          alert.id
                        )
                      }
                    >
                      Ver evidencia
                    </button>
                  </article>
                )
              )
            ) : (
              <p
                className={
                  styles.emptyState
                }
              >
                No existen alertas
                operativas que coincidan
                con los filtros
                seleccionados.
              </p>
            )}
          </div>
        </article>

        <aside
          className={
            styles.summaryCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Resumen y seguimiento
              </h2>
              <p>
                Distribucion y prioridad de
                revision.
              </p>
            </div>
          </header>

          <div
            className={
              styles.summaryBody
            }
          >
            <section
              className={
                styles.distribution
              }
            >
              <h3>
                Distribucion de alertas
              </h3>

              {[
                {
                  label:
                    "Tardanzas",
                  value:
                    kindCounts.tardiness,
                  className:
                    styles.progressAmber,
                },
                {
                  label:
                    "Inasistencias",
                  value:
                    kindCounts.absences,
                  className:
                    styles.progressRed,
                },
                {
                  label:
                    "Incompletos",
                  value:
                    kindCounts.incomplete,
                  className:
                    styles.progressBlue,
                },
              ].map(
                (item) => (
                  <div
                    key={item.label}
                    className={
                      styles.progressRow
                    }
                  >
                    <div>
                      <span>
                        {
                          item.label
                        }
                      </span>
                      <strong>
                        {
                          item.value
                        }
                      </strong>
                    </div>

                    <span
                      className={
                        styles.progressTrack
                      }
                    >
                      <span
                        className={
                          item.className
                        }
                        style={{
                          width: `${Math.max(
                            3,
                            (item.value /
                              maxKind) *
                              100
                          )}%`,
                        }}
                      />
                    </span>
                  </div>
                )
              )}
            </section>

            <section
              className={
                styles.prioritySection
              }
            >
              <h3>
                Prioridad de revision
              </h3>

              {selectedAlert ? (
                <article
                  className={
                    styles.priorityCard
                  }
                >
                  <span
                    className={
                      styles.priorityIcon
                    }
                  >
                    <AlertIcon
                      kind={
                        selectedAlert.kind
                      }
                    />
                  </span>

                  <div>
                    <strong>
                      {
                        selectedAlert.title
                      }
                    </strong>
                    <p>
                      {
                        selectedAlert.teacher
                      }
                    </p>
                    <span>
                      {
                        selectedAlert.course
                      }{" "}
                      ·{" "}
                      {
                        selectedAlert.room
                      }
                    </span>
                  </div>
                </article>
              ) : (
                <p
                  className={
                    styles.noPriority
                  }
                >
                  No hay una alerta
                  seleccionada.
                </p>
              )}
            </section>

            {selectedAlert && (
              <section
                className={
                  styles.evidenceBox
                }
              >
                <h3>
                  Evidencia seleccionada
                </h3>

                <dl>
                  <div>
                    <dt>Fecha</dt>
                    <dd>
                      {
                        selectedAlert.dateLabel
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Hora</dt>
                    <dd>
                      {
                        selectedAlert.time
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Ambito</dt>
                    <dd>
                      {
                        selectedAlert.scope
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Fuente</dt>
                    <dd>
                      {
                        selectedAlert.source
                      }
                    </dd>
                  </div>
                </dl>

                <p>
                  {
                    selectedAlert.description
                  }
                </p>
              </section>
            )}

            <section
              className={
                styles.indicators
              }
            >
              <h3>
                Indicadores de consulta
              </h3>

              <div>
                <article>
                  <span>Hoy</span>
                  <strong>
                    {
                      alerts.filter(
                        (alert) =>
                          alert.dateKey ===
                          today
                      ).length
                    }
                  </strong>
                </article>

                <article>
                  <span>
                    Siete dias
                  </span>
                  <strong>
                    {alerts.length}
                  </strong>
                </article>

                <article>
                  <span>
                    Docentes
                  </span>
                  <strong>
                    {
                      histories.length
                    }
                  </strong>
                </article>
              </div>
            </section>

            {historyFailures > 0 && (
              <p
                className={
                  styles.partialWarning
                }
              >
                {historyFailures} historial(es)
                no respondieron. La bandeja
                puede estar incompleta.
              </p>
            )}

            {notice && (
              <p
                className={
                  styles.copyNotice
                }
              >
                {notice}
              </p>
            )}

            <div
              className={
                styles.summaryActions
              }
            >
              <Button
                type="button"
                onClick={() =>
                  void copyEvidence()
                }
                disabled={
                  !selectedAlert
                }
              >
                Copiar evidencia
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={exportCsv}
              >
                Exportar listado
              </Button>
            </div>

            <p
              className={
                styles.readOnlyNote
              }
            >
              Vista de solo lectura. No se
              modifica el estado “leida” de
              la tabla alertas ni se
              registran atenciones
              simuladas.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
