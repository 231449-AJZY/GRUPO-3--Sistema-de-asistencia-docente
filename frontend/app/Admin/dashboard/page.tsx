import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import { getAdminDashboardData } from "@/lib/api";
import { MOCK_ADMIN } from "@/lib/constants";
import type {
  BiometricStatus,
  DashboardMetric,
  HourlyActivity,
  RecentAlert,
  RecentAttendance,
} from "@/types/dashboard";

const metricColorClasses: Record<
  DashboardMetric["color"],
  {
    bg: string;
    text: string;
    line: string;
  }
> = {
  blue: {
    bg: "bg-blue-50 text-blue-600 border border-blue-100",
    text: "text-blue-600",
    line: "#2563EB",
  },
  green: {
    bg: "bg-green-50 text-green-600 border border-green-100",
    text: "text-green-600",
    line: "#16A34A",
  },
  yellow: {
    bg: "bg-amber-50 text-amber-500 border border-amber-100",
    text: "text-amber-500",
    line: "#F59E0B",
  },
  red: {
    bg: "bg-red-50 text-red-600 border border-red-100",
    text: "text-red-600",
    line: "#DC2626",
  },
};

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <DashboardLayout user={MOCK_ADMIN} active="dashboard">
      <div className="admin-dashboard-animated space-y-6">
        
        {/* Title Section */}
        <div>
          <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">
            Panel principal del administrador
          </h1>
          <p className="mt-1 text-base font-semibold text-unsaac-muted">
            Resumen general del sistema
          </p>
        </div>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.title} metric={metric} />
          ))}
        </section>

        {/* Second Row: Hourly Activity & Recent Alerts */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <ActivityChart data={data.hourlyActivity} />
          <RecentAlerts alerts={data.recentAlerts} />
        </section>

        {/* Third Row: Recent Attendances & Biometric System Status */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <RecentAttendances attendances={data.recentAttendances} />
          <BiometricSystemStatus status={data.biometricStatus} />
        </section>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const colors = metricColorClasses[metric.color];

  return (
    <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
      <div className="flex items-start gap-4">
        {/* Icon wrapper */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${colors.bg}`}
        >
          <DashboardIcon
            name={metric.icon}
            className="h-6 w-6"
          />
        </div>

        {/* Texts */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
            {metric.title}
          </h3>

          <p className={`mt-1 text-3xl font-black leading-none ${colors.text}`}>
            {metric.value}
          </p>

          <p className="mt-1 text-xs font-bold text-unsaac-muted">
            {metric.description}
          </p>
        </div>
      </div>

      {/* Mini Chart at the bottom of card */}
      <div className="mt-4 -mx-6 -mb-6">
        <MiniTrend values={metric.trend} color={metric.color} />
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
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const colorHex = metricColorClasses[color].line;

  const points = values
    .map((value, index) => {
      const x = index * 40;
      const y = 30 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-10 w-full" viewBox="0 0 280 32" fill="none" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={colorHex}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityChart({ data }: { data: HourlyActivity[] }) {
  const max = 50;

  const points = data
    .map((item, index) => {
      const x = 50 + index * 66;
      const y = 190 - (item.value / max) * 150;
      return `${x},${y}`;
    })
    .join(" ");

  const lastX = 50 + (data.length - 1) * 66;
  const areaPoints = `50,190 ${points} ${lastX},190`;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader
        title="Actividad de asistencia por hora"
        description="Registros"
        action={
          <div className="flex items-center gap-2 border border-unsaac-border rounded-xl px-3 py-1.5 bg-white text-xs font-extrabold text-unsaac-text cursor-pointer hover:bg-slate-50 transition">
            <svg className="h-4 w-4 text-unsaac-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Hoy
            <svg className="h-3.5 w-3.5 text-unsaac-muted ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        }
      />

      <CardContent className="pt-2">
        <svg viewBox="0 0 880 230" className="h-[220px] w-full" preserveAspectRatio="none">
          {/* Horizontal Grid lines */}
          {[0, 10, 20, 30, 40, 50].map((value) => {
            const y = 190 - (value / max) * 150;

            return (
              <g key={value}>
                <line
                  x1="45"
                  y1={y}
                  x2="855"
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="0"
                  strokeWidth="1"
                />
                <text
                  x="30"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-unsaac-muted text-[11px] font-bold"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <polygon points={areaPoints} fill="#2563EB" opacity="0.08" />

          {/* Connection line */}
          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and vertical dotted lines */}
          {data.map((item, index) => {
            const x = 50 + index * 66;
            const y = 190 - (item.value / max) * 150;

            return (
              <g key={item.hour}>
                {/* Point dot */}
                <circle cx={x} cy={y} r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />

                {/* X labels */}
                <text
                  x={x}
                  y="215"
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
    </Card>
  );
}

function RecentAlerts({ alerts }: { alerts: RecentAlert[] }) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader
        title="Alertas recientes"
        action={
          <a href="#" className="text-xs font-bold text-unsaac-blue hover:underline">
            Ver todas
          </a>
        }
      />

      <CardContent className="pt-2 flex-1">
        <div className="divide-y divide-unsaac-border">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: RecentAlert }) {
  const typeStyles: Record<
    RecentAlert["type"],
    {
      bar: string;
      iconBg: string;
      iconText: string;
      iconName: "clock" | "warning" | "calendar" | "user";
    }
  > = {
    tardanza: {
      bar: "bg-amber-500",
      iconBg: "bg-amber-50",
      iconText: "text-amber-500",
      iconName: "clock",
    },
    inasistencia: {
      bar: "bg-red-600",
      iconBg: "bg-red-50",
      iconText: "text-red-600",
      iconName: "warning",
    },
    horario: {
      bar: "bg-blue-600",
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      iconName: "calendar",
    },
    docente: {
      bar: "bg-green-600",
      iconBg: "bg-green-50",
      iconText: "text-green-600",
      iconName: "user",
    },
  };

  const styles = typeStyles[alert.type] || typeStyles.horario;

  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className={`h-9 w-1 rounded-full ${styles.bar}`} />

      {/* Circle Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
        <DashboardIcon
          name={styles.iconName}
          className={`h-5 w-5 ${styles.iconText}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-unsaac-text leading-tight">
          {alert.title}
        </p>
        <p className="truncate text-xs font-semibold text-unsaac-muted mt-0.5">
          {alert.description}
        </p>
      </div>

      <p className="text-xs font-bold text-unsaac-muted whitespace-nowrap">
        {alert.time}
      </p>
    </div>
  );
}

function RecentAttendances({
  attendances,
}: {
  attendances: RecentAttendance[];
}) {
  return (
    <Card>
      <CardHeader
        title="Registros recientes"
      />

      <CardContent className="pt-2">
        <div className="overflow-x-auto rounded-xl border border-unsaac-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-unsaac-border">
                <th className="px-5 py-4 text-xs font-extrabold text-unsaac-text uppercase tracking-wider">Docente</th>
                <th className="px-5 py-4 text-xs font-extrabold text-unsaac-text uppercase tracking-wider">Hora</th>
                <th className="px-5 py-4 text-xs font-extrabold text-unsaac-text uppercase tracking-wider">Estado</th>
                <th className="px-5 py-4 text-xs font-extrabold text-unsaac-text uppercase tracking-wider">Aula</th>
                <th className="px-5 py-4 text-xs font-extrabold text-unsaac-text uppercase tracking-wider">Método</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-unsaac-border">
              {attendances.map((attendance) => (
                <tr
                  key={attendance.id}
                  className="transition hover:bg-unsaac-content-soft"
                >
                  <td className="px-5 py-3.5 text-sm font-semibold text-unsaac-text flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-unsaac-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    {attendance.docente}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-unsaac-muted">
                    {attendance.hora}
                  </td>
                  <td className="px-5 py-3.5">
                    <AttendanceBadge estado={attendance.estado} />
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-unsaac-muted">
                    {attendance.aula}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-unsaac-muted">
                    <div className="flex items-center gap-2">
                      <span>{attendance.metodo}</span>
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Link */}
        <div className="mt-4 text-center">
          <a href="#" className="text-sm font-bold text-unsaac-blue hover:underline">
            Ver todos los registros
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceBadge({ estado }: { estado: RecentAttendance["estado"] }) {
  if (estado === "Presente") {
    return (
      <span className="inline-flex items-center rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 border border-green-100">
        Presente
      </span>
    );
  }

  if (estado === "Tardanza") {
    return (
      <span className="inline-flex items-center rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700 border border-yellow-100">
        Tardanza
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
      Inasistencia
    </span>
  );
}

function BiometricSystemStatus({ status }: { status: BiometricStatus }) {
  const items = [
    ["Dispositivos conectados", status.connectedDevices],
    ["Sincronización", status.syncStatus],
    ["Último registro", status.lastRecord],
    ["Servidor", status.serverStatus],
  ];

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader
        title="Estado del sistema biométrico"
      />

      <CardContent className="pt-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Main Status header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-sm shadow-green-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11a5 5 0 00-10 0c0 1.2.16 2.365.458 3.477m0 0a3 3 0 004.108 4.108m3.44-2.04a5 5 0 0110 0c0 1.2-.16 2.365-.458 3.477m0 0a3 3 0 00-4.1 4.1" />
              </svg>
            </div>

            <div>
              <p className="text-base font-extrabold text-green-600 leading-tight">
                Sistema operativo
              </p>
              <p className="text-xs font-bold text-unsaac-muted mt-0.5">
                Todos los dispositivos funcionan correctamente
              </p>
            </div>
          </div>

          {/* Status rows */}
          <div className="divide-y divide-unsaac-border">
            {items.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-xs font-black text-green-600 border border-green-200">
                    ✓
                  </span>
                  <span className="text-sm font-bold text-unsaac-muted">
                    {label}
                  </span>
                </div>

                <span className={`text-sm font-extrabold ${value === "En línea" ? "text-green-600" : "text-unsaac-text"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4">
          <a href="#" className="inline-flex items-center gap-1 text-sm font-bold text-unsaac-blue hover:underline">
            Ver detalles del sistema
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </CardContent>
    </Card>
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
    | "clock"
    | "fingerprint";
  className?: string;
}) {
  if (name === "users") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="7" r="4" />
        <path
          d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="7" r="4" />
        <path
          d="M5 21v-2a7 7 0 0 1 14 0v2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
        />
        <path
          d="M8 2v4M16 2v4M3 9h18"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path
          d="M10.3 4 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 4a2 2 0 0 0-3.4 0Z"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4M12 17h.01"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path
        d="M7 12c0-3 2.2-5.3 5-5.3s5 2.3 5 5.3"
        strokeLinecap="round"
      />
      <path
        d="M9 17c-1-1.5-1.5-3-1.5-5M15 18c1-1.8 1.5-3.8 1.5-6"
        strokeLinecap="round"
      />
      <path
        d="M10 12c0-1.5.8-2.7 2-2.7s2 1.2 2 2.7c0 2.4-.8 4.7-2 7"
        strokeLinecap="round"
      />
      <path
        d="M12 3c5 0 9 4 9 9M3 12c0-5 4-9 9-9"
        strokeLinecap="round"
      />
    </svg>
  );
}