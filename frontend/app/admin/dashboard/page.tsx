"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardContent } from "@/components/ui/Card";
import {
  ApiDashboardError,
  getAdminDashboardData,
} from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import type {
  AdminDashboardData,
  BiometricStatus,
  DashboardMetric,
  HourlyActivity,
  RecentAlert,
  RecentAttendance,
  VerificationSummary,
} from "@/types/dashboard";
import type { UsuarioActivo } from "@/types/usuario";

const metricColorClasses: Record<
  DashboardMetric["color"],
  {
    bg: string;
    text: string;
    line: string;
  }
> = {
  blue: {
    bg: "bg-blue-100",
    text: "text-unsaac-blue",
    line: "text-unsaac-blue",
  },
  green: {
    bg: "bg-green-100",
    text: "text-unsaac-green",
    line: "text-unsaac-green",
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-unsaac-yellow",
    line: "text-unsaac-yellow",
  },
  red: {
    bg: "bg-red-100",
    text: "text-unsaac-red",
    line: "text-unsaac-red",
  },
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo>(MOCK_ADMIN);
  const [data, setData] =
    useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await getAdminDashboardData();
      setData(response);
    } catch (loadError) {
      if (
        loadError instanceof ApiDashboardError &&
        loadError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (
        loadError instanceof ApiDashboardError &&
        loadError.status === 403
      ) {
        setError(
          "La cuenta autenticada no tiene permiso para consultar el dashboard administrativo."
        );
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();

    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(session.user);
    }

    void loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardLayout user={user}>
      {loading ? (
        <LoadingState
          title="Cargando dashboard"
          description="Consultando información institucional actualizada."
          fullHeight
        />
      ) : error || !data ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          description={
            error ??
            "El servidor no devolvió información válida."
          }
          onRetry={loadDashboard}
          fullHeight
        />
      ) : (
        <div className="admin-dashboard-animated">
          <PageHeader
            eyebrow="Administración"
            title="Panel principal del administrador"
            description="Resumen actualizado del sistema de asistencia docente."
            className="mb-6"
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    void loadDashboard()
                  }
                >
                  Actualizar
                </Button>

                <Button variant="secondary">
                  Generar reporte
                </Button>

                <Button
                  variant="primary"
                  onClick={() =>
                    router.push(
                      "/admin/docentes"
                    )
                  }
                >
                  Nuevo docente
                </Button>
              </>
            }
          />

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge variant="info">
              Información actualizada
            </Badge>
            <Badge variant="success">
              Sistema en línea
            </Badge>
            <Badge variant="warning">
              {data.summary.tardanzasHoy} tardanzas
            </Badge>
            <Badge variant="danger">
              {data.summary.inasistenciasHoy} inasistencias
            </Badge>
          </div>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <MetricCard
                key={metric.title}
                metric={metric}
              />
            ))}
          </section>

          <VerificationMethodSummary
            summary={data.verificationSummary}
          />

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
            <ActivityChart
              data={data.hourlyActivity}
            />
            <RecentAlerts
              alerts={data.recentAlerts}
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
            <RecentAttendances
              attendances={data.recentAttendances}
              onViewAll={() =>
                router.push("/admin/biometria/historial")
              }
            />
            <BiometricSystemStatus
              status={data.biometricStatus}
            />
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const colors = metricColorClasses[metric.color];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-5">
        <div
          className={`flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full ${colors.bg}`}
        >
          <DashboardIcon
            name={metric.icon}
            className={`h-9 w-9 ${colors.text}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-unsaac-text">
            {metric.title}
          </h2>

          <p className={`mt-3 text-[34px] font-extrabold ${colors.text}`}>
            {metric.value}
          </p>

          <p className="mt-1 text-sm font-semibold text-unsaac-muted">
            {metric.description}
          </p>

          <MiniTrend values={metric.trend} color={metric.color} />
        </div>
      </div>
    </Card>
  );
}

function MiniTrend({
  values,
  color,
}: {
  values: number[];
  color: DashboardMetric["color"];
}) {
  const safeValues =
    values.length > 0 ? values : [0, 0];

  const max = Math.max(...safeValues);
  const min = Math.min(...safeValues);
  const range = Math.max(max - min, 1);

  const points = safeValues
    .map((value, index) => {
      const x = index * 22;
      const y = 34 - ((value - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mt-4 h-10 w-full" viewBox="0 0 160 40" fill="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={metricColorClasses[color].line}
      />
    </svg>
  );
}

function ActivityChart({ data }: { data: HourlyActivity[] }) {
  const highestValue = Math.max(
    ...data.map((item) => item.value),
    0
  );
  const max = Math.max(
    10,
    Math.ceil(highestValue / 10) * 10
  );

  const points = data
    .map((item, index) => {
      const x = 40 + index * 70;
      const y = 190 - (item.value / max) * 150;
      return `${x},${y}`;
    })
    .join(" ");

  const lastX = 40 + (data.length - 1) * 70;
  const areaPoints = `40,190 ${points} ${lastX},190`;

  return (
    <SectionCard
      title="Actividad de asistencia por hora"
      description="Registros capturados durante la jornada académica."
      contentClassName="p-0"
      action={
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-extrabold text-unsaac-green">
            <span className="h-2 w-2 rounded-full bg-unsaac-green" />
            En vivo
          </span>

          <Button variant="outline" size="sm">
            Hoy
          </Button>
        </div>
      }
    >

      <CardContent>
        <svg viewBox="0 0 920 230" className="h-[220px] w-full">
          {Array.from(
            { length: 6 },
            (_, index) =>
              Math.round((max / 5) * index)
          ).map((value) => {
            const y = 190 - (value / max) * 150;

            return (
              <g key={value}>
                <line
                  x1="40"
                  y1={y}
                  x2="890"
                  y2={y}
                  stroke="#DCE4EF"
                  strokeDasharray="4 4"
                />
                <text
                  x="25"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-unsaac-muted text-[11px] font-bold"
                >
                  {value}
                </text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill="#2563EB" opacity="0.12" />

          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((item, index) => {
            const x = 40 + index * 70;
            const y = 190 - (item.value / max) * 150;

            return (
              <g key={item.hour}>
                <line
                  x1={x}
                  y1="40"
                  x2={x}
                  y2="190"
                  stroke="#E6EDF5"
                  strokeDasharray="4 4"
                />

                <circle cx={x} cy={y} r="4" fill="#2563EB" />

                <text
                  x={x}
                  y="218"
                  textAnchor="middle"
                  className="fill-unsaac-muted text-[11px] font-bold"
                >
                  {item.hour}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </SectionCard>
  );
}

function RecentAlerts({ alerts }: { alerts: RecentAlert[] }) {
  return (
    <SectionCard
      title="Alertas recientes"
      description="Últimos eventos generados por el sistema."
      contentClassName="p-0"
      action={
        <Button variant="ghost" size="sm">
          Ver todas
        </Button>
      }
    >

      <CardContent className="pt-2">
        {alerts.length > 0 ? (
          <div className="divide-y divide-unsaac-border">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
              />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm font-semibold text-unsaac-muted">
            No existen alertas registradas en el sistema.
          </p>
        )}
      </CardContent>
    </SectionCard>
  );
}

function AlertRow({ alert }: { alert: RecentAlert }) {
  const typeStyles: Record<
    RecentAlert["type"],
    {
      bar: string;
      icon: string;
      iconName: "calendar" | "warning" | "user";
    }
  > = {
    tardanza: {
      bar: "bg-unsaac-yellow",
      icon: "text-unsaac-yellow",
      iconName: "calendar",
    },
    inasistencia: {
      bar: "bg-unsaac-red",
      icon: "text-unsaac-red",
      iconName: "warning",
    },
    horario: {
      bar: "bg-unsaac-blue",
      icon: "text-unsaac-blue",
      iconName: "calendar",
    },
    docente: {
      bar: "bg-unsaac-green",
      icon: "text-unsaac-green",
      iconName: "user",
    },
  };

  const styles = typeStyles[alert.type];

  return (
    <div className="flex items-center gap-4 py-4">
      <div className={`h-11 w-1 rounded-full ${styles.bar}`} />

      <DashboardIcon
        name={styles.iconName}
        className={`h-6 w-6 ${styles.icon}`}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-unsaac-text">
          {alert.title}
        </p>
        <p className="truncate text-xs font-semibold text-unsaac-muted">
          {alert.description}
        </p>
      </div>

      <p className="text-sm font-bold text-unsaac-muted">{alert.time}</p>
    </div>
  );
}


function VerificationMethodSummary({
  summary,
}: {
  summary: VerificationSummary;
}) {
  const items = [
    { label: "Intentos", value: summary.totalAttempts, tone: "bg-slate-100 text-slate-700" },
    { label: "Registradas", value: summary.registered, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Duplicadas", value: summary.duplicate, tone: "bg-amber-100 text-amber-700" },
    { label: "Rechazadas", value: summary.rejected, tone: "bg-red-100 text-red-700" },
    { label: "QR dinámico", value: summary.dynamicQr, tone: "bg-blue-100 text-blue-700" },
    { label: "Biometría", value: summary.mobileBiometric, tone: "bg-indigo-100 text-indigo-700" },
    { label: "Offline", value: summary.offline, tone: "bg-violet-100 text-violet-700" },
    { label: "Manual / lector", value: summary.other, tone: "bg-orange-100 text-orange-700" },
  ];

  return (
    <SectionCard
      title="Métodos de verificación de hoy"
      description="Intentos reales obtenidos de PostgreSQL, incluidos duplicados y rechazos."
      className="mt-6"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl px-4 py-4 ${item.tone}`}
          >
            <p className="text-xs font-extrabold uppercase tracking-wide opacity-75">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black">{item.value}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ResultPill({
  result,
}: {
  result: RecentAttendance["resultado"];
}) {
  const classes =
    result === "REGISTRADA"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : result === "DUPLICADA"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : result === "RECHAZADA"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${classes}`}
    >
      {result.replace(/_/g, " ")}
    </span>
  );
}

function RecentAttendances({
  attendances,
  onViewAll,
}: {
  attendances: RecentAttendance[];
  onViewAll: () => void;
}) {
  return (
    <SectionCard
      title="Registros recientes"
      description="Últimas asistencias de curso e ingresos institucionales."
      contentClassName="p-0"
      action={
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
        </Button>
      }
    >
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-unsaac-border">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-slate-100">
              <tr>
                <TableHead>Docente</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Aula</TableHead>
                <TableHead>Método</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-unsaac-border">
              {attendances.length > 0 ? (
                attendances.map((attendance) => (
                  <tr
                    key={attendance.id}
                    className="transition hover:bg-unsaac-content-soft"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">
                      {attendance.docente}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-sm font-semibold text-unsaac-text">
                      {attendance.registro ?? "Ingreso institucional"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-unsaac-muted">
                      {attendance.hora}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={attendance.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <ResultPill result={attendance.resultado} />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-unsaac-muted">
                      {attendance.aula}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-unsaac-muted">
                      {attendance.metodo}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm font-semibold text-unsaac-muted"
                  >
                    No existen asistencias registradas hoy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </SectionCard>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">
      {children}
    </th>
  );
}

function BiometricSystemStatus({ status }: { status: BiometricStatus }) {
  const items = [
    ["Dispositivos con actividad hoy", status.connectedDevices],
    ["Sincronización", status.syncStatus],
    ["Último registro", status.lastRecord],
    ["Servidor", status.serverStatus],
  ];

  return (
    <SectionCard
      title="Estado del sistema biométrico"
      description="Monitoreo general del servicio y dispositivos."
      contentClassName="p-0"
    >

      <CardContent>
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-unsaac-green text-white">
            <DashboardIcon name="fingerprint" className="h-9 w-9" />
          </div>

          <div>
            <StatusBadge
              status="operativo"
              label="Sistema operativo"
              size="md"
            />
            <p className="text-sm font-semibold text-unsaac-muted">
              Información obtenida del backend y de los registros del día
            </p>
          </div>
        </div>

        <div className="mt-8 divide-y divide-unsaac-border">
          {items.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-xs font-extrabold text-unsaac-green">
                  ✓
                </span>
                <span className="text-sm font-bold text-unsaac-muted">
                  {label}
                </span>
              </div>

              <span className="text-sm font-extrabold text-unsaac-text">
                {value}
              </span>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="mt-4">
          Ver detalles del sistema →
        </Button>
      </CardContent>
    </SectionCard>
  );
}

function DashboardIcon({
  name,
  className,
}: {
  name:
    | "users"
    | "user"
    | "calendar"
    | "warning"
    | "fingerprint";
  className?: string;
}) {
  if (name === "users") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M5 21v-2a7 7 0 0 1 14 0v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8 2v4M16 2v4M3 9h18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M10.3 4 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 4a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4M12 17h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 12c0-3 2.2-5.3 5-5.3s5 2.3 5 5.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 17c-1-1.5-1.5-3-1.5-5M15 18c1-1.8 1.5-3.8 1.5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 12c0-1.5.8-2.7 2-2.7s2 1.2 2 2.7c0 2.4-.8 4.7-2 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 3c5 0 9 4 9 9M3 12c0-5 4-9 9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}