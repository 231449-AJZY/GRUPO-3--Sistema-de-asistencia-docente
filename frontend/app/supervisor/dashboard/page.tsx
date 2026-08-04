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

const REFRESH_INTERVAL_MS = 30_000;
const CHART_HOURS = [
  7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17,
] as const;

interface SessionUser {
  id?: number | string;
  usuario_id?: number | string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  email?: string;
  correo?: string;
  codigo?: string;
  rol?: string;
}

interface SupervisorStats {
  docentesMonitoreados: number | string;
  docentesPresentes?: number | string;
  alertasNuevas: number | string;
  inconsistencias: number | string;
  registrosValidados: number | string;
  puntuales?: number | string;
  tardanzas?: number | string;
  registrosCurso?: number | string;
  ingresosInstitucionales?: number | string;
  duplicadas?: number | string;
  rechazadas?: number | string;
}

interface SupervisorRecord {
  id?: string;
  docente?: string;
  nombres?: string;
  apellidos?: string;
  codigo?: string;
  departamento?: string;
  tipo_objetivo?: string;
  registro?: string;
  curso_codigo?: string | null;
  aula?: string | null;
  hora_registro: string;
  estado: string;
  resultado?: string;
  metodo?: string;
  fuente?: string;
}

interface SupervisorDashboardResponse {
  stats?: SupervisorStats;
  registrosHoy?: SupervisorRecord[];
  error?: string;
}

interface TeacherStatsResponse {
  docentes?: {
    total?: number | string;
    activos?: number | string;
    inactivos?: number | string;
    biometricos?: number | string;
    pendientesBiometricos?: number | string;
  };
  porDepartamento?: Array<{
    departamento?: string;
    total?: number | string;
  }>;
  asistenciaHoy?: {
    puntuales?: number | string;
    tardanzas?: number | string;
    total_registros?: number | string;
  };
  error?: string;
}

interface AttendanceRecord {
  id?: string;
  nombres?: string;
  apellidos?: string;
  codigo?: string;
  departamento?: string;
  docente?: string;
  tipo_objetivo?: string;
  registro?: string;
  curso_codigo?: string | null;
  aula?: string | null;
  hora_registro: string;
  estado: string;
  resultado?: string;
  metodo?: string;
  fuente?: string;
}

interface AttendanceTodayResponse {
  fecha?: string;
  registros?: AttendanceRecord[];
  error?: string;
}

type SourceState =
  | "online"
  | "partial"
  | "offline";

interface SourceStatus {
  key: string;
  label: string;
  description: string;
  state: SourceState;
}

interface DashboardAlert {
  key: string;
  title: string;
  description: string;
  value: number;
  tone:
    | "danger"
    | "warning"
    | "blue"
    | "neutral";
}

interface ChartPoint {
  hour: number;
  label: string;
  count: number;
  x: number;
  y: number;
}

class DashboardRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "DashboardRequestError";
    this.status = status;
  }
}

function toNumber(
  value: number | string | null | undefined
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeStatus(
  value: string
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function formatTime(
  value: string
): string {
  return (
    String(value ?? "").slice(0, 8) ||
    "--:--:--"
  );
}

function formatRefreshTime(
  date: Date | null
): string {
  if (!date) {
    return "Sin actualizar";
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Lima",
    }
  ).format(date);
}

function getUserName(
  user: SessionUser | null
): string {
  if (!user) {
    return "Supervisor";
  }

  const splitName =
    `${user.nombres ?? ""} ${
      user.apellidos ?? ""
    }`.trim();

  return (
    splitName ||
    String(user.nombre ?? "").trim() ||
    "Supervisor"
  );
}

function teacherName(
  record: AttendanceRecord
): string {
  const splitName =
    `${record.nombres ?? ""} ${
      record.apellidos ?? ""
    }`.trim();

  return (
    splitName ||
    String(record.docente ?? "").trim() ||
    "Docente"
  );
}

function statusLabel(
  value: string
): string {
  const status =
    normalizeStatus(value);

  if (
    status === "PUNTUAL" ||
    status === "PRESENTE"
  ) {
    return "Presente";
  }

  if (status === "TARDANZA") {
    return "Tardanza";
  }

  if (status === "AUSENTE") {
    return "Ausente";
  }

  return status
    ? status.toLowerCase()
    : "Sin estado";
}

function statusTone(
  value: string
):
  | "success"
  | "warning"
  | "danger"
  | "neutral" {
  const status =
    normalizeStatus(value);

  if (
    status === "PUNTUAL" ||
    status === "PRESENTE"
  ) {
    return "success";
  }

  if (status === "TARDANZA") {
    return "warning";
  }

  if (status === "AUSENTE") {
    return "danger";
  }

  return "neutral";
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
    throw new DashboardRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar una fuente del dashboard.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

function MetricIcon({
  type,
}: {
  type:
    | "activity"
    | "present"
    | "absent"
    | "late"
    | "alerts";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "activity") {
    return (
      <svg {...common}>
        <path d="M3 12h4l2-7 4 14 3-7h5" />
      </svg>
    );
  }

  if (type === "present") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="7"
          r="4"
        />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        <path d="m9 14 2 2 4-5" />
      </svg>
    );
  }

  if (type === "absent") {
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

  if (type === "late") {
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
      <path d="M19 14c0 6-7 9-7 9s-7-3-7-9V8l7-4 7 4v6Z" />
      <path d="M12 9v4M12 17h.01" />
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
  value: number;
  description: string;
  tone:
    | "blue"
    | "green"
    | "red"
    | "amber";
  icon:
    | "activity"
    | "present"
    | "absent"
    | "late"
    | "alerts";
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

      <div
        className={
          styles.metricContent
        }
      >
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

        <svg
          className={
            styles.sparkline
          }
          viewBox="0 0 130 22"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="1,18 16,16 31,17 46,12 61,14 76,8 91,11 106,6 121,9 129,5"
          />
        </svg>
      </div>
    </article>
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


function methodLabel(
  value: string | undefined
): string {
  const method = normalizeStatus(value ?? "");

  if (method === "QR_DINAMICO") {
    return "QR dinámico";
  }

  if (method === "BIOMETRIA_MOVIL_BLE") {
    return "Biometría + BLE";
  }

  if (method === "BIOMETRIA_MOVIL") {
    return "Biometría móvil";
  }

  if (method === "OFFLINE_SINCRONIZADO") {
    return "Offline sincronizado";
  }

  if (method === "LECTOR_BIOMETRICO") {
    return "Lector biométrico";
  }

  return value || "Manual";
}

function typeLabel(
  value: string | undefined
): string {
  return normalizeStatus(value ?? "") === "CURSO"
    ? "Curso"
    : "Ingreso";
}

function ResultBadge({
  result,
}: {
  result: string;
}) {
  const normalized =
    normalizeStatus(result);

  const tone =
    normalized === "REGISTRADA"
      ? "success"
      : normalized === "DUPLICADA"
        ? "warning"
        : normalized === "RECHAZADA"
          ? "danger"
          : "neutral";

  return (
    <span
      className={`${styles.resultBadge} ${styles[`result${tone}`]}`}
    >
      {normalized || "—"}
    </span>
  );
}

export default function SupervisorDashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<SessionUser | null>(
      null
    );
  const [
    dashboard,
    setDashboard,
  ] =
    useState<SupervisorDashboardResponse | null>(
      null
    );
  const [
    teacherStats,
    setTeacherStats,
  ] =
    useState<TeacherStatsResponse | null>(
      null
    );
  const [
    attendanceToday,
    setAttendanceToday,
  ] =
    useState<AttendanceTodayResponse | null>(
      null
    );
  const [
    sources,
    setSources,
  ] = useState<SourceStatus[]>(
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

  const loadDashboard =
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
          String(
            storedUser.rol ?? ""
          ).toUpperCase() !==
            "SUPERVISOR"
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        setUser(storedUser);

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const results =
          await Promise.allSettled([
            requestJson<SupervisorDashboardResponse>(
              "/dashboard/supervisor",
              token
            ),
            requestJson<TeacherStatsResponse>(
              "/docentes/stats",
              token
            ),
            requestJson<AttendanceTodayResponse>(
              "/asistencia/hoy",
              token
            ),
          ]);

        const rejected =
          results.filter(
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
                DashboardRequestError &&
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
          results[0];
        const teacherStatsResult =
          results[1];
        const attendanceResult =
          results[2];

        if (
          dashboardResult.status ===
          "fulfilled"
        ) {
          setDashboard(
            dashboardResult.value
          );
        }

        if (
          teacherStatsResult.status ===
          "fulfilled"
        ) {
          setTeacherStats(
            teacherStatsResult.value
          );
        }

        if (
          attendanceResult.status ===
          "fulfilled"
        ) {
          setAttendanceToday(
            attendanceResult.value
          );
        }

        setSources([
          {
            key: "dashboard",
            label:
              "Resumen del supervisor",
            description:
              dashboardResult.status ===
              "fulfilled"
                ? "Metricas y alertas disponibles"
                : "No respondio en esta actualizacion",
            state:
              dashboardResult.status ===
              "fulfilled"
                ? "online"
                : "offline",
          },
          {
            key: "teachers",
            label:
              "Estadisticas docentes",
            description:
              teacherStatsResult.status ===
              "fulfilled"
                ? "Docentes activos y asistencia disponibles"
                : "Fuente temporalmente no disponible",
            state:
              teacherStatsResult.status ===
              "fulfilled"
                ? "online"
                : "offline",
          },
          {
            key: "attendance",
            label:
              "Marcaciones institucionales",
            description:
              attendanceResult.status ===
              "fulfilled"
                ? "Registros de hoy sincronizados"
                : "No se pudieron recuperar los registros",
            state:
              attendanceResult.status ===
              "fulfilled"
                ? "online"
                : "offline",
          },
        ]);

        if (
          results.every(
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
              : "No se pudo cargar el dashboard del supervisor."
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
    void loadDashboard();

    const timer =
      window.setInterval(() => {
        void loadDashboard(true);
      }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [loadDashboard]);

  const records =
    useMemo<AttendanceRecord[]>(
      () => {
        if (
          dashboard?.registrosHoy
            ?.length
        ) {
          return dashboard.registrosHoy.map(
            (record) => ({
              id: record.id,
              docente:
                record.docente ??
                `${record.nombres ?? ""} ${
                  record.apellidos ?? ""
                }`.trim(),
              codigo:
                record.codigo ?? "",
              departamento:
                record.departamento ??
                "",
              tipo_objetivo:
                record.tipo_objetivo ??
                "",
              registro:
                record.registro ??
                (normalizeStatus(
                  record.tipo_objetivo ??
                    ""
                ) === "CURSO"
                  ? "Clase programada"
                  : "Ingreso institucional"),
              curso_codigo:
                record.curso_codigo ??
                null,
              aula:
                record.aula ?? null,
              hora_registro:
                record.hora_registro,
              estado: record.estado,
              resultado:
                record.resultado ??
                "REGISTRADA",
              metodo:
                record.metodo ?? "",
              fuente:
                record.fuente ?? "",
            })
          );
        }

        return (
          attendanceToday?.registros ??
          []
        ).map((record) => ({
          ...record,
          tipo_objetivo:
            "INGRESO_INSTITUCIONAL",
          registro:
            "Ingreso institucional",
          resultado: "REGISTRADA",
          metodo: "LECTOR_BIOMETRICO",
          aula: null,
        }));
      },
      [
        attendanceToday,
        dashboard,
      ]
    );

  const activeTeachers =
    toNumber(
      teacherStats?.docentes
        ?.activos
    ) ||
    toNumber(
      dashboard?.stats
        ?.docentesMonitoreados
    );

  const registeredRecords =
    records.filter(
      (record) =>
        normalizeStatus(
          record.resultado ??
            "REGISTRADA"
        ) === "REGISTRADA"
    );

  const attendanceCount =
    toNumber(
      dashboard?.stats
        ?.registrosValidados
    ) ||
    registeredRecords.length;

  const presentTeachers =
    toNumber(
      dashboard?.stats
        ?.docentesPresentes
    ) ||
    new Set(
      registeredRecords.map(
        (record) =>
          record.codigo ||
          record.docente ||
          record.id
      )
    ).size;

  const punctualCount =
    toNumber(
      dashboard?.stats
        ?.puntuales
    ) ||
    registeredRecords.filter(
      (record) =>
        ["PUNTUAL", "PRESENTE"].includes(
          normalizeStatus(
            record.estado
          )
        )
    ).length;

  const lateCount =
    toNumber(
      dashboard?.stats
        ?.tardanzas
    ) ||
    registeredRecords.filter(
      (record) =>
        normalizeStatus(
          record.estado
        ) === "TARDANZA"
    ).length;

  const absentCount = Math.max(
    toNumber(
      dashboard?.stats
        ?.inconsistencias
    ),
    activeTeachers -
      presentTeachers,
    0
  );

  const alertsCount =
    toNumber(
      dashboard?.stats
        ?.alertasNuevas
    );

  const attendancePercent =
    activeTeachers > 0
      ? Math.round(
          (presentTeachers /
            activeTeachers) *
            100
        )
      : 0;

  const chartData =
    useMemo(() => {
      const counts =
        CHART_HOURS.map(
          (hour) =>
            records.filter(
              (record) =>
                Number(
                  String(
                    record.hora_registro
                  ).slice(0, 2)
                ) === hour
            ).length
        );

      const maxCount =
        Math.max(
          1,
          ...counts
        );
      const width = 760;
      const height = 220;
      const left = 24;
      const right = 18;
      const top = 18;
      const bottom = 32;
      const usableWidth =
        width - left - right;
      const usableHeight =
        height - top - bottom;

      const points: ChartPoint[] =
        CHART_HOURS.map(
          (hour, index) => ({
            hour,
            label: `${String(
              hour
            ).padStart(2, "0")}:00`,
            count: counts[index],
            x:
              left +
              (index /
                (CHART_HOURS.length -
                  1)) *
                usableWidth,
            y:
              top +
              usableHeight -
              (counts[index] /
                maxCount) *
                usableHeight,
          })
        );

      const linePath =
        points.length > 0
          ? points
              .map(
                (point, index) =>
                  `${
                    index === 0
                      ? "M"
                      : "L"
                  } ${point.x} ${point.y}`
              )
              .join(" ")
          : "";

      const areaPath =
        points.length > 0
          ? `${linePath} L ${
              points[
                points.length - 1
              ].x
            } ${
              top + usableHeight
            } L ${points[0].x} ${
              top + usableHeight
            } Z`
          : "";

      return {
        points,
        linePath,
        areaPath,
        maxCount,
        width,
        height,
        top,
        bottom,
        left,
        right,
        usableHeight,
      };
    }, [records]);

  const alerts =
    useMemo<DashboardAlert[]>(
      () => {
        const items: DashboardAlert[] =
          [];

        if (alertsCount > 0) {
          items.push({
            key: "alerts",
            title:
              "Alertas pendientes de revision",
            description:
              "Alertas no leidas registradas en el sistema.",
            value: alertsCount,
            tone: "danger",
          });
        }

        if (lateCount > 0) {
          items.push({
            key: "late",
            title:
              "Tardanzas detectadas hoy",
            description:
              "Asistencias de curso e ingresos clasificados como tardanza.",
            value: lateCount,
            tone: "warning",
          });
        }

        if (absentCount > 0) {
          items.push({
            key: "absent",
            title:
              "Docentes activos sin registro",
            description:
              "Diferencia entre docentes activos y marcaciones recibidas.",
            value: absentCount,
            tone: "danger",
          });
        }

        const unavailable =
          sources.filter(
            (source) =>
              source.state ===
              "offline"
          ).length;

        if (unavailable > 0) {
          items.push({
            key: "sources",
            title:
              "Fuentes sin respuesta",
            description:
              "La pantalla conserva los datos de las fuentes disponibles.",
            value: unavailable,
            tone: "neutral",
          });
        }

        if (items.length === 0) {
          items.push({
            key: "clear",
            title:
              "Sin alertas operativas",
            description:
              "No se detectan incumplimientos con la informacion disponible.",
            value: 0,
            tone: "blue",
          });
        }

        return items.slice(0, 4);
      },
      [
        alertsCount,
        lateCount,
        absentCount,
        sources,
      ]
    );

  if (loading) {
    return (
      <LoadingState
        title="Cargando dashboard del supervisor"
        description="Consultando docentes activos, marcaciones institucionales y alertas reales."
        fullHeight
      />
    );
  }

  if (
    error &&
    !dashboard &&
    !teacherStats &&
    !attendanceToday
  ) {
    return (
      <ErrorState
        title="No se pudo cargar el dashboard"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          void loadDashboard()
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
        eyebrow="Supervision academica"
        title="Dashboard del supervisor"
        description={`Monitoreo general de asistencia, alertas e incidencias para ${getUserName(
          user
        )}.`}
        badge={
          <span
            className={
              styles.liveBadge
            }
          >
            <span />
            Actualizacion automatica
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
                styles.lastUpdated
              }
            >
              Ultima actualizacion:{" "}
              <strong>
                {formatRefreshTime(
                  lastUpdated
                )}
              </strong>
            </span>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadDashboard(
                  true
                )
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Actualizando..."
                : "Actualizar"}
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
          title="Asistencias en tiempo real"
          value={attendanceCount}
          description={`${punctualCount} puntuales dentro de los registros de hoy`}
          tone="blue"
          icon="activity"
        />

        <MetricCard
          title="Docentes presentes"
          value={presentTeachers}
          description={`${attendancePercent}% de ${activeTeachers} docentes activos`}
          tone="green"
          icon="present"
        />

        <MetricCard
          title="Docentes ausentes"
          value={absentCount}
          description="Docentes activos sin registro institucional hoy"
          tone="red"
          icon="absent"
        />

        <MetricCard
          title="Tardanzas del dia"
          value={lateCount}
          description="Registros recibidos con estado TARDANZA"
          tone="amber"
          icon="late"
        />

        <MetricCard
          title="Alertas por incumplimiento"
          value={alertsCount}
          description="Alertas no leidas pendientes de supervision"
          tone="red"
          icon="alerts"
        />
      </section>

      <section
        className={
          styles.middleGrid
        }
      >
        <article
          className={
            styles.chartCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Actividad diaria de
                marcaciones
              </h2>
              <p>
                Asistencias de curso e ingresos
                institucionales agrupados por hora.
              </p>
            </div>

            <span
              className={
                styles.liveIndicator
              }
            >
              <span />
              En vivo
            </span>
          </header>

          <div
            className={
              styles.chartWrap
            }
          >
            <svg
              className={
                styles.activityChart
              }
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              role="img"
              aria-label="Actividad de marcaciones por hora"
            >
              <defs>
                <linearGradient
                  id="supervisorArea"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity="0.24"
                  />
                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map(
                (step) => {
                  const y =
                    chartData.top +
                    (step / 4) *
                      chartData.usableHeight;
                  const label =
                    Math.round(
                      chartData.maxCount *
                        (1 -
                          step / 4)
                    );

                  return (
                    <g key={step}>
                      <line
                        x1={
                          chartData.left
                        }
                        x2={
                          chartData.width -
                          chartData.right
                        }
                        y1={y}
                        y2={y}
                        className={
                          styles.gridLine
                        }
                      />
                      <text
                        x="4"
                        y={y + 4}
                        className={
                          styles.axisLabel
                        }
                      >
                        {label}
                      </text>
                    </g>
                  );
                }
              )}

              <path
                d={
                  chartData.areaPath
                }
                fill="url(#supervisorArea)"
              />

              <path
                d={
                  chartData.linePath
                }
                className={
                  styles.chartLine
                }
              />

              {chartData.points.map(
                (point) => (
                  <g
                    key={
                      point.hour
                    }
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4.5"
                      className={
                        styles.chartPoint
                      }
                    />
                    <text
                      x={point.x}
                      y={
                        chartData.height -
                        8
                      }
                      textAnchor="middle"
                      className={
                        styles.hourLabel
                      }
                    >
                      {point.label}
                    </text>
                    <title>
                      {point.label}:{" "}
                      {point.count} registro(s)
                    </title>
                  </g>
                )
              )}
            </svg>
          </div>

          <footer
            className={
              styles.chartFooter
            }
          >
            <span>
              Total del dia:{" "}
              <strong>
                {attendanceCount}
              </strong>
            </span>
            <span>
              Pico registrado:{" "}
              <strong>
                {chartData.maxCount}
              </strong>
            </span>
            <span>
              Intervalo de actualizacion:{" "}
              <strong>30 s</strong>
            </span>
          </footer>
        </article>

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
                Alertas recientes
              </h2>
              <p>
                Resumen generado con datos
                reales disponibles.
              </p>
            </div>

            <span
              className={
                styles.alertCount
              }
            >
              {alertsCount}
            </span>
          </header>

          <div
            className={
              styles.alertList
            }
          >
            {alerts.map(
              (alert) => (
                <article
                  key={alert.key}
                  className={`${styles.alertItem} ${
                    styles[
                      `alert${alert.tone}`
                    ]
                  }`}
                >
                  <span
                    className={
                      styles.alertAccent
                    }
                  />

                  <div>
                    <h3>
                      {alert.title}
                    </h3>
                    <p>
                      {
                        alert.description
                      }
                    </p>
                  </div>

                  <strong>
                    {alert.value}
                  </strong>
                </article>
              )
            )}
          </div>

          <footer
            className={
              styles.alertsFooter
            }
          >
            Los detalles nominales se
            implementaran en el modulo
            oficial de Alertas.
          </footer>
        </article>
      </section>

      <section
        className={
          styles.bottomGrid
        }
      >
        <article
          className={
            styles.activityCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Resumen de actividad en
                tiempo real
              </h2>
              <p>
                Últimas asistencias de curso e
                ingresos institucionales recibidos.
              </p>
            </div>

            <span
              className={
                styles.recordsCount
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
                styles.activityTable
              }
            >
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Registro</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Resultado</th>
                  <th>Aula</th>
                  <th>Método</th>
                </tr>
              </thead>

              <tbody>
                {records.length > 0 ? (
                  records
                    .slice()
                    .sort(
                      (
                        first,
                        second
                      ) =>
                        second.hora_registro.localeCompare(
                          first.hora_registro
                        )
                    )
                    .slice(0, 12)
                    .map(
                      (
                        record,
                        index
                      ) => (
                        <tr
                          key={`${record.id ?? record.codigo ?? "registro"}-${record.hora_registro}-${index}`}
                        >
                          <td>
                            <strong>
                              {teacherName(
                                record
                              )}
                            </strong>
                            <small>
                              {record.codigo ||
                                "Sin código"}
                              {" · "}
                              {record.departamento ||
                                "Sin departamento"}
                            </small>
                          </td>
                          <td>
                            <strong
                              className={
                                styles.recordTitle
                              }
                            >
                              {record.registro ||
                                "Ingreso institucional"}
                            </strong>
                            <span
                              className={
                                styles.typeBadge
                              }
                            >
                              {typeLabel(
                                record.tipo_objetivo
                              )}
                              {record.curso_codigo
                                ? ` · ${record.curso_codigo}`
                                : ""}
                            </span>
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
                            <ResultBadge
                              result={
                                record.resultado ??
                                "REGISTRADA"
                              }
                            />
                          </td>
                          <td>
                            {record.aula ||
                              "—"}
                          </td>
                          <td>
                            <span
                              className={
                                styles.methodText
                              }
                            >
                              {methodLabel(
                                record.metodo
                              )}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className={
                        styles.emptyCell
                      }
                    >
                      No existen asistencias de curso ni ingresos institucionales para mostrar hoy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article
          className={
            styles.sourcesCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Estado de fuentes de
                monitoreo
              </h2>
              <p>
                Disponibilidad de las API
                utilizadas en esta vista.
              </p>
            </div>
          </header>

          <div
            className={
              styles.sourcesList
            }
          >
            {sources.map(
              (source) => (
                <article
                  key={
                    source.key
                  }
                  className={
                    styles.sourceItem
                  }
                >
                  <span
                    className={`${styles.sourceIcon} ${
                      styles[
                        `source${source.state}`
                      ]
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      {source.state ===
                      "online" ? (
                        <>
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                          />
                          <path d="m8 12 3 3 5-6" />
                        </>
                      ) : (
                        <>
                          <path d="M12 3 2.5 20h19L12 3Z" />
                          <path d="M12 9v4M12 17h.01" />
                        </>
                      )}
                    </svg>
                  </span>

                  <div>
                    <h3>
                      {source.label}
                    </h3>
                    <p>
                      {
                        source.description
                      }
                    </p>
                  </div>

                  <span
                    className={`${styles.sourceStatus} ${
                      styles[
                        `sourceStatus${source.state}`
                      ]
                    }`}
                  >
                    <span />
                    {source.state ===
                    "online"
                      ? "En linea"
                      : source.state ===
                          "partial"
                        ? "Parcial"
                        : "Atencion"}
                  </span>
                </article>
              )
            )}
          </div>

          <footer
            className={
              styles.sourcesFooter
            }
          >
            Esta tarjeta no simula lectores
            biometricos; refleja unicamente
            el estado de las fuentes
            consultadas.
          </footer>
        </article>
      </section>
    </div>
  );
}
