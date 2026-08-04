"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import BiometriaSubNavigation from "@/components/admin/biometria/BiometriaSubNavigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";

import {
  BiometriaApiError,
  executeBiometricSynchronization,
  getBiometricSynchronization,
} from "@/lib/services/biometria.service";
import {
  clearSession,
  getCurrentUser,
} from "@/lib/auth";

import type {
  BiometricSynchronizationDashboard,
  BiometricSynchronizationDevice,
  BiometricSynchronizationState,
} from "@/types/biometria";
import type { UsuarioActivo } from "@/types/usuario";

const STATE_LABELS: Record<
  BiometricSynchronizationState,
  string
> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  SINCRONIZADO: "Sincronizado",
  FALLIDO: "Fallido",
  CANCELADO: "Cancelado",
};

const STATE_CLASSES: Record<
  BiometricSynchronizationState,
  string
> = {
  PENDIENTE:
    "border-blue-200 bg-blue-50 text-blue-700",
  EN_PROCESO:
    "border-violet-200 bg-violet-50 text-violet-700",
  SINCRONIZADO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  FALLIDO:
    "border-red-200 bg-red-50 text-red-700",
  CANCELADO:
    "border-slate-200 bg-slate-50 text-slate-600",
};

function errorMessage(error: unknown): string {
  if (error instanceof BiometriaApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "La operación de sincronización no pudo completarse.";
}

function formatDateTime(
  value: string | null | undefined
): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Lima",
  }).format(date);
}

function SummaryCard({
  label,
  value,
  description,
  tone = "blue",
}: {
  label: string;
  value: number;
  description: string;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold opacity-75">
        {description}
      </p>
    </article>
  );
}

function StatePill({
  state,
}: {
  state: BiometricSynchronizationState;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${STATE_CLASSES[state]}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

function DeviceState({
  device,
}: {
  device: BiometricSynchronizationDevice;
}) {
  const classes =
    device.estado_actual === "CONECTADO"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : device.estado_actual === "ADVERTENCIA"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : device.estado_actual === "MANTENIMIENTO"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes}`}
    >
      {device.activo
        ? device.estado_actual
        : "RETIRADO"}
    </span>
  );
}

export default function BiometricSynchronizationPage() {
  const router = useRouter();
  const [user, setUser] =
    useState<UsuarioActivo | null>(null);
  const [payload, setPayload] =
    useState<BiometricSynchronizationDashboard | null>(
      null
    );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);
  const [busyId, setBusyId] =
    useState<number | null>(null);
  const [deviceFilter, setDeviceFilter] =
    useState("TODOS");
  const [stateFilter, setStateFilter] =
    useState<
      "TODOS" | BiometricSynchronizationState
    >("TODOS");

  const handleAuthError = useCallback(
    (requestError: unknown) => {
      if (
        requestError instanceof BiometriaApiError &&
        [401, 403].includes(requestError.status)
      ) {
        clearSession();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const loadData = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);
        const next =
          await getBiometricSynchronization();
        setPayload(next);
      } catch (requestError) {
        if (handleAuthError(requestError)) return;
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleAuthError]
  );

  useEffect(() => {
    const current = getCurrentUser();

    if (
      !current ||
      current.rol !== "ADMINISTRADOR"
    ) {
      clearSession();
      router.replace("/login");
      return;
    }

    setUser(current);
    void loadData();
  }, [loadData, router]);

  const jobs = useMemo(() => {
    const source = payload?.jobs ?? [];

    return source.filter((job) => {
      const matchesDevice =
        deviceFilter === "TODOS" ||
        String(job.dispositivo_id ?? "") ===
          deviceFilter;
      const matchesState =
        stateFilter === "TODOS" ||
        job.estado === stateFilter;

      return matchesDevice && matchesState;
    });
  }, [deviceFilter, payload, stateFilter]);

  async function runSynchronization(
    device: BiometricSynchronizationDevice
  ) {
    const accepted = window.confirm(
      device.registros_pendientes > 0
        ? `El lector ${device.codigo} reporta ${device.registros_pendientes} registro(s) pendiente(s). El sistema verificará la capacidad real del adaptador y no modificará contadores si la transferencia no está disponible. ¿Continuar?`
        : `Se verificará el estado de sincronización de ${device.codigo}. ¿Continuar?`
    );

    if (!accepted) return;

    setBusyId(device.id);
    setError(null);
    setSuccess(null);

    try {
      const result =
        await executeBiometricSynchronization(
          device.id
        );
      setSuccess(result.message);
      await loadData(true);
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  if (!user || loading) {
    return <LoadingState />;
  }

  if (error && !payload) {
    return (
      <DashboardLayout user={user}>
        <ErrorState
          title="No se pudo cargar la información biométrica"
          description={error}
          onRetry={() => void loadData()}
        />
      </DashboardLayout>
    );
  }

  const summary = payload?.summary;

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Control biométrico real"
          title="Sincronización de lectores"
          description="Verifique registros pendientes y documente cada intento sin simular transferencias ni alterar contadores cuando el SDK no ofrece sincronización."
          actions={
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
            >
              {refreshing
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          }
        />

        <BiometriaSubNavigation />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Lectores"
            value={summary?.total ?? 0}
            description={`${summary?.connected ?? 0} conectado(s)`}
          />
          <SummaryCard
            label="Registros pendientes"
            value={summary?.pendingRecords ?? 0}
            description="Reportados por lectores"
            tone={
              (summary?.pendingRecords ?? 0) > 0
                ? "amber"
                : "green"
            }
          />
          <SummaryCard
            label="Verificaciones correctas"
            value={summary?.synchronized_jobs ?? 0}
            description="Sin pendientes o completadas"
            tone="green"
          />
          <SummaryCard
            label="Observaciones"
            value={summary?.failed_jobs ?? 0}
            description="Requieren SDK o revisión"
            tone={
              (summary?.failed_jobs ?? 0) > 0
                ? "red"
                : "blue"
            }
          />
        </section>

        <SectionCard
          title="Lectores registrados"
          description="La acción verifica el estado real. Solo se declara una sincronización completa cuando existe evidencia suficiente."
          contentClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full border-collapse text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
                    "Lector",
                    "Ubicación",
                    "Estado",
                    "Conexión",
                    "Pendientes",
                    "Última sincronización",
                    "Acción",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(payload?.devices ?? []).map(
                  (device) => (
                    <tr
                      key={device.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <strong className="block text-sm font-black text-slate-900">
                          {device.nombre}
                        </strong>
                        <span className="text-xs font-bold text-blue-700">
                          {device.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        {device.ubicacion ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <DeviceState
                          device={device}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs font-black text-slate-600">
                        {device.tipo_conexion}
                      </td>
                      <td className="px-4 py-4 text-center text-lg font-black text-slate-900">
                        {device.registros_pendientes}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                        {formatDateTime(
                          device.ultima_sincronizacion_en
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={
                            busyId === device.id ||
                            !device.activo
                          }
                          onClick={() =>
                            void runSynchronization(
                              device
                            )
                          }
                          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busyId === device.id
                            ? "Verificando..."
                            : "Verificar sincronización"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Historial de verificaciones"
          description="Trazabilidad persistente en PostgreSQL con resultado, contadores y motivo técnico."
          contentClassName="p-0"
          action={
            <div className="flex flex-wrap gap-2">
              <select
                value={deviceFilter}
                onChange={(event) =>
                  setDeviceFilter(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
              >
                <option value="TODOS">
                  Todos los lectores
                </option>
                {(payload?.devices ?? []).map(
                  (device) => (
                    <option
                      key={device.id}
                      value={String(device.id)}
                    >
                      {device.codigo}
                    </option>
                  )
                )}
              </select>
              <select
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(
                    event.target.value as
                      | "TODOS"
                      | BiometricSynchronizationState
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
              >
                <option value="TODOS">
                  Todos los estados
                </option>
                {Object.entries(
                  STATE_LABELS
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[1150px] w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      "Fecha",
                      "Lector",
                      "Estado",
                      "Detectados",
                      "Procesados",
                      "Fallidos",
                      "Código",
                      "Mensaje",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                        {formatDateTime(
                          job.solicitado_en
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block text-sm font-black text-slate-900">
                          {job.device_name}
                        </strong>
                        <span className="text-xs font-bold text-blue-700">
                          {job.device_code}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatePill
                          state={job.estado}
                        />
                      </td>
                      <td className="px-4 py-4 text-center font-black">
                        {job.registros_detectados}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-emerald-700">
                        {job.registros_procesados}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-red-700">
                        {job.registros_fallidos}
                      </td>
                      <td className="px-4 py-4 text-xs font-black text-slate-600">
                        {job.codigo_resultado ??
                          "—"}
                      </td>
                      <td className="max-w-[360px] px-4 py-4 text-xs font-semibold leading-5 text-slate-600">
                        {job.mensaje ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-sm font-bold text-slate-500">
              No existen verificaciones que
              coincidan con los filtros.
            </div>
          )}
        </SectionCard>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          <strong className="block font-black">
            Ejecución honesta
          </strong>
          <span className="font-semibold">
            No se inventan transferencias.{" "}
            {payload?.methodology}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
