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

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <DashboardLayout user={MOCK_ADMIN} active="dashboard">
      <div className="admin-dashboard-animated">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">
              Panel principal del administrador
            </h1>
            <p className="mt-2 text-base font-semibold text-unsaac-muted">
              Resumen general del sistema de asistencia biométrica docente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">Ver detalles</Button>
            <Button variant="secondary">Generar reporte</Button>
            <Button variant="primary">Nuevo registro</Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant="info">Tiempo real</Badge>
          <Badge variant="success">Sistema operativo</Badge>
          <Badge variant="warning">11 tardanzas</Badge>
          <Badge variant="danger">16 inasistencias</Badge>
        </div>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.title} metric={metric} />
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
          <ActivityChart data={data.hourlyActivity} />
          <RecentAlerts alerts={data.recentAlerts} />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
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
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  const points = values
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
  const max = 50;

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
    <Card>
      <CardHeader
        title="Actividad de asistencia por hora"
        description="Registros capturados durante la jornada académica."
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
      />

      <CardContent>
        <svg viewBox="0 0 920 230" className="h-[220px] w-full">
          {[0, 10, 20, 30, 40, 50].map((value) => {
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
    </Card>
  );
}

function RecentAlerts({ alerts }: { alerts: RecentAlert[] }) {
  return (
    <Card>
      <CardHeader
        title="Alertas recientes"
        description="Últimos eventos generados por el sistema."
        action={
          <Button variant="ghost" size="sm">
            Ver todas
          </Button>
        }
      />

      <CardContent className="pt-2">
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

function RecentAttendances({
  attendances,
}: {
  attendances: RecentAttendance[];
}) {
  return (
    <Card>
      <CardHeader
        title="Registros recientes"
        description="Últimas marcaciones registradas por dispositivo biométrico."
        action={
          <Button variant="ghost" size="sm">
            Ver todos
          </Button>
        }
      />

      <CardContent>
        <div className="overflow-hidden rounded-xl border border-unsaac-border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-100">
              <tr>
                <TableHead>Docente</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Aula</TableHead>
                <TableHead>Método</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-unsaac-border">
              {attendances.map((attendance) => (
                <tr
                  key={attendance.id}
                  className="transition hover:bg-unsaac-content-soft"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">
                    {attendance.docente}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-unsaac-muted">
                    {attendance.hora}
                  </td>
                  <td className="px-4 py-3">
                    <AttendanceBadge estado={attendance.estado} />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-unsaac-muted">
                    {attendance.aula}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-unsaac-muted">
                    {attendance.metodo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">
      {children}
    </th>
  );
}

function AttendanceBadge({ estado }: { estado: RecentAttendance["estado"] }) {
  if (estado === "Presente") {
    return <Badge variant="success">Presente</Badge>;
  }

  if (estado === "Tardanza") {
    return <Badge variant="warning">Tardanza</Badge>;
  }

  return <Badge variant="danger">Inasistencia</Badge>;
}

function BiometricSystemStatus({ status }: { status: BiometricStatus }) {
  const items = [
    ["Dispositivos conectados", status.connectedDevices],
    ["Sincronización", status.syncStatus],
    ["Último registro", status.lastRecord],
    ["Servidor", status.serverStatus],
  ];

  return (
    <Card>
      <CardHeader
        title="Estado del sistema biométrico"
        description="Monitoreo general del servicio y dispositivos."
      />

      <CardContent>
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-unsaac-green text-white">
            <DashboardIcon name="fingerprint" className="h-9 w-9" />
          </div>

          <div>
            <p className="text-lg font-extrabold text-unsaac-green">
              Sistema operativo
            </p>
            <p className="text-sm font-semibold text-unsaac-muted">
              Todos los dispositivos funcionan correctamente
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