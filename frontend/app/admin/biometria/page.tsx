"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import BiometriaSubNavigation from "@/components/admin/biometria/BiometriaSubNavigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import {
  clearSession,
  getSession,
} from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  BiometriaApiError,
  getBiometricDashboard,
} from "@/lib/services/biometria.service";

import type {
  BiometricDashboardAlert,
  BiometricDashboardData,
  BiometricRecentCapture,
} from "@/types/biometria";
import type { UsuarioActivo } from "@/types/usuario";

export default function AdminBiometriaPage() {
  const router = useRouter();
  const [user, setUser] =
    useState<UsuarioActivo>(MOCK_ADMIN);
  const [data, setData] =
    useState<BiometricDashboardData | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await getBiometricDashboard();
      setData(response);
    } catch (loadError) {
      if (
        loadError instanceof BiometriaApiError &&
        loadError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el módulo biométrico."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();

    if (session?.user) {
      setUser(session.user);
    }

    void loadDashboard();
  }, [loadDashboard]);

  const summary = data?.summary;

  const systemStatus = useMemo(() => {
    if (!summary) {
      return {
        status: "desconectado",
        label: "Sin información",
      };
    }

    if (
      !data.security.templateKeyConfigured
    ) {
      return {
        status: "advertencia",
        label: "Clave biométrica pendiente",
      };
    }

    if (
      summary.warningDevices > 0 ||
      summary.disconnectedDevices > 0 ||
      summary.maintenanceDevices > 0
    ) {
      return {
        status: "advertencia",
        label: "Requiere atención",
      };
    }

    return {
      status: "operativo",
      label: "Sistema operativo",
    };
  }, [data, summary]);

  return (
    <DashboardLayout user={user}>
      {loading ? (
        <LoadingState
          title="Cargando control biométrico"
          description="Consultando docentes, plantillas y lectores registrados."
          fullHeight
        />
      ) : error || !data || !summary ? (
        <ErrorState
          title="No se pudo cargar Biometría"
          description={
            error ??
            "El servidor no devolvió información válida."
          }
          onRetry={loadDashboard}
          fullHeight
        />
      ) : (
        <div className="admin-dashboard-animated space-y-6">
          <PageHeader
            eyebrow="Administración institucional"
            title="Control biométrico"
            description="Supervise enrolamientos reales, lectores y seguridad de las plantillas biométricas."
            badge={
              <StatusBadge
                status={systemStatus.status}
                label={systemStatus.label}
                size="md"
                showDot
              />
            }
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

                <Button
                  variant="primary"
                  onClick={() =>
                    router.push(
                      "/admin/biometria/captura"
                    )
                  }
                >
                  Nueva captura
                </Button>
              </>
            }
          />

          <BiometriaSubNavigation />

          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Lectores disponibles"
              value={`${summary.connectedDevices}/${summary.totalDevices}`}
              description={
                summary.totalDevices > 0
                  ? "Lectores con heartbeat reciente"
                  : "Puente local aún no registrado"
              }
              tone={
                summary.connectedDevices > 0
                  ? "green"
                  : "orange"
              }
              icon={<DeviceIcon />}
            />

            <SummaryCard
              title="Cobertura completa"
              value={`${summary.completedTeachers}`}
              description={`${summary.coveragePercent}% de docentes con 10 huellas`}
              tone="blue"
              icon={<UsersIcon />}
            />

            <SummaryCard
              title="Registros pendientes"
              value={`${summary.pendingTeachers + summary.inProgressTeachers}`}
              description={`${summary.inProgressTeachers} docente(s) en proceso`}
              tone={
                summary.pendingTeachers > 0
                  ? "orange"
                  : "green"
              }
              icon={<PendingIcon />}
            />

            <SummaryCard
              title="Capturas de hoy"
              value={`${summary.capturesToday}`}
              description={`${summary.activeFingerprints} plantillas activas`}
              tone="purple"
              icon={<FingerprintIcon />}
            />
          </section>

          <SectionCard
            title="Procesos biométricos"
            description="Las tres funciones principales quedan preparadas para trabajar con la API institucional."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ModuleCard
                href="/admin/biometria/captura"
                title="Captura biométrica"
                description="Recibe la plantilla generada por el SDK del lector y la almacena cifrada."
                metric={`${summary.pendingTeachers + summary.inProgressTeachers} pendientes`}
                tone="blue"
                icon={<FingerprintIcon />}
              />

              <ModuleCard
                href="/admin/biometria/dispositivos"
                title="Lectores biométricos"
                description="Administra heartbeat, diagnóstico y disponibilidad de los lectores."
                metric={`${summary.connectedDevices} conectados`}
                tone="green"
                icon={<DeviceIcon />}
              />

              <ModuleCard
                href="/admin/biometria/historial"
                title="Historial y auditoría"
                description="Consulta enrolamientos, revocaciones y eventos técnicos."
                metric={`${data.recentEvents.length} eventos recientes`}
                tone="purple"
                icon={<HistoryIcon />}
              />
            </div>
          </SectionCard>

          <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard
              title="Estado general"
              description="Indicadores calculados directamente desde PostgreSQL."
            >
              <div className="space-y-5">
                <SystemProgress
                  title="Cobertura biométrica docente"
                  description={`${summary.completedTeachers} de ${summary.totalTeachers} docentes completos`}
                  value={summary.coveragePercent}
                  tone="blue"
                />

                <SystemProgress
                  title="Disponibilidad de lectores"
                  description={`${summary.connectedDevices} de ${summary.totalDevices} lectores disponibles`}
                  value={
                    summary.deviceAvailabilityPercent
                  }
                  tone={
                    summary.connectedDevices > 0
                      ? "green"
                      : "orange"
                  }
                />

                <SystemProgress
                  title="Seguridad de plantillas"
                  description={
                    data.security.templateKeyConfigured
                      ? "Plantillas cifradas con AES-256-GCM"
                      : "Falta configurar la clave de cifrado"
                  }
                  value={
                    data.security.templateKeyConfigured
                      ? 100
                      : 0
                  }
                  tone={
                    data.security.templateKeyConfigured
                      ? "green"
                      : "red"
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Alertas y observaciones"
              description="Situaciones reales que requieren intervención."
              action={
                <StatusBadge
                  status={
                    data.alerts.length > 0
                      ? "advertencia"
                      : "operativo"
                  }
                  label={
                    data.alerts.length > 0
                      ? `${data.alerts.length} alerta(s)`
                      : "Sin alertas"
                  }
                  showDot
                />
              }
            >
              {data.alerts.length > 0 ? (
                <div className="space-y-3">
                  {data.alerts.map((alert) => (
                    <AlertCard
                      key={alert.type}
                      alert={alert}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CompletedIcon />
                  </span>
                  <p className="mt-4 font-extrabold text-emerald-700">
                    Sistema sin observaciones
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Las plantillas y lectores no presentan alertas.
                  </p>
                </div>
              )}
            </SectionCard>
          </div>

          <RecentCapturesTable
            captures={data.recentCaptures}
          />

          <SectionCard
            title="Protección de datos biométricos"
            description="Controles activos del nuevo núcleo biométrico."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <SecurityCard
                title="Sin imágenes crudas"
                description="La API rechaza fotografías o imágenes base64 de huellas."
              />
              <SecurityCard
                title="Cifrado de plantillas"
                description="Cada plantilla se cifra con AES-256-GCM antes de llegar a PostgreSQL."
              />
              <SecurityCard
                title="Auditoría administrativa"
                description="Enrolamientos y revocaciones quedan registrados en audit_log."
              />
            </div>
          </SectionCard>
        </div>
      )}
    </DashboardLayout>
  );
}

function RecentCapturesTable({
  captures,
}: {
  captures: BiometricRecentCapture[];
}) {
  return (
    <SectionCard
      title="Enrolamientos recientes"
      description="Últimas plantillas biométricas activas registradas en el backend."
      contentClassName="p-0"
      action={
        <Link
          href="/admin/biometria/historial"
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-extrabold text-unsaac-blue transition hover:border-unsaac-blue hover:bg-blue-50"
        >
          Ver historial
        </Link>
      }
    >
      {captures.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>Docente</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Dedo</TableHead>
                <TableHead>Calidad</TableHead>
                <TableHead>Lector</TableHead>
                <TableHead>Fecha</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {captures.map((capture) => (
                <tr
                  key={capture.id}
                  className="transition hover:bg-slate-50"
                >
                  <TableCell>
                    <p className="font-extrabold text-slate-900">
                      {capture.teacher}
                    </p>
                    <p className="mt-1 text-xs font-bold text-unsaac-blue">
                      {capture.teacher_code}
                    </p>
                  </TableCell>
                  <TableCell>
                    {capture.department ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-unsaac-blue">
                      {fingerLabel(capture.finger)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {capture.quality === null ? (
                      "—"
                    ) : (
                      <span className="font-extrabold text-emerald-700">
                        {capture.quality}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {capture.device_code ??
                      "Puente no identificado"}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(
                      capture.enrolled_at
                    )}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Todavía no existen enrolamientos"
          description="Las capturas reales confirmadas aparecerán en esta tabla."
        />
      )}
    </SectionCard>
  );
}

type Tone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red";

function SummaryCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  tone: Tone;
  icon: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-extrabold text-slate-500">
            {title}
          </p>
          <p
            className={`mt-3 text-4xl font-extrabold tabular-nums ${styles.value}`}
          >
            {value}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
        >
          {icon}
        </span>
      </div>
      <div className={`h-1 ${styles.line}`} />
    </Card>
  );
}

function ModuleCard({
  href,
  title,
  description,
  metric,
  tone,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  metric: string;
  tone: Tone;
  icon: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <Link
      href={href}
      className="group flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles.icon}`}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-extrabold text-slate-900 transition group-hover:text-unsaac-blue">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
      <p
        className={`mt-5 border-t border-slate-100 pt-4 text-sm font-extrabold ${styles.value}`}
      >
        {metric}
      </p>
    </Link>
  );
}

function SystemProgress({
  title,
  description,
  value,
  tone,
}: {
  title: string;
  description: string;
  value: number;
  tone: Tone;
}) {
  const normalized = Math.min(
    Math.max(value, 0),
    100
  );
  const styles = toneStyles[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-extrabold text-slate-900">
            {title}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>
        <p
          className={`text-xl font-extrabold tabular-nums ${styles.value}`}
        >
          {normalized}%
        </p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.line}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function AlertCard({
  alert,
}: {
  alert: BiometricDashboardAlert;
}) {
  const style =
    alert.tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : alert.tone === "warning"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-blue-200 bg-blue-50 text-unsaac-blue";

  return (
    <Link
      href={alert.href}
      className={`block rounded-2xl border p-4 transition hover:shadow-sm ${style}`}
    >
      <p className="font-extrabold">
        {alert.title}
      </p>
      <p className="mt-1 text-sm font-semibold opacity-80">
        {alert.description}
      </p>
    </Link>
  );
}

function SecurityCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <CompletedIcon />
      </div>
      <p className="mt-4 font-extrabold text-emerald-800">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

const toneStyles: Record<
  Tone,
  {
    icon: string;
    value: string;
    line: string;
  }
> = {
  blue: {
    icon: "bg-blue-100 text-unsaac-blue",
    value: "text-unsaac-blue",
    line: "bg-unsaac-blue",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
    line: "bg-emerald-500",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700",
    value: "text-orange-700",
    line: "bg-orange-500",
  },
  purple: {
    icon: "bg-violet-100 text-violet-700",
    value: "text-violet-700",
    line: "bg-violet-600",
  },
  red: {
    icon: "bg-red-100 text-red-700",
    value: "text-red-700",
    line: "bg-red-500",
  },
};

function fingerLabel(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Lima",
    }
  ).format(date);
}

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td className="px-5 py-4 align-middle text-sm font-semibold text-slate-700">
      {children}
    </td>
  );
}

function FingerprintIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 4.5 4.5c0 4.5-1.5 7-3 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M5 11a7 7 0 0 1 14 0c0 4.5-1 7-2.2 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2.5" width="14" height="19" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="6" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
