"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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

import {
  BiometriaApiError,
  createBiometricDevice,
  diagnoseAllBiometricDevices,
  diagnoseBiometricDevice,
  getBiometricBridgeStatus,
  getBiometricDeviceDetail,
  getBiometricDevices,
  runBiometricDeviceAction,
  updateBiometricDevice,
} from "@/lib/services/biometria.service";
import {
  clearSession,
  getCurrentUser,
} from "@/lib/auth";

import type {
  BiometricBridgeStatus,
  BiometricDevice,
  BiometricDeviceAction,
  BiometricDeviceConnectionType,
  BiometricDeviceDetail,
  BiometricDeviceInput,
  BiometricDeviceList,
  BiometricDeviceState,
  BiometricGeneralDiagnosticResponse,
} from "@/types/biometria";
import type { UsuarioActivo } from "@/types/usuario";

type StateFilter = "TODOS" | BiometricDeviceState | "RETIRADO";
type FormMode = "create" | "edit";

interface DeviceFormState {
  codigo: string;
  nombre: string;
  fabricante: string;
  modelo: string;
  numero_serie: string;
  ubicacion: string;
  ip_address: string;
  puerto: string;
  mac_address: string;
  version_firmware: string;
  version_sdk: string;
  agente_id: string;
  tipo_conexion: BiometricDeviceConnectionType;
  sincronizacion_automatica: boolean;
  activo: boolean;
  mensaje: string;
}

const EMPTY_FORM: DeviceFormState = {
  codigo: "",
  nombre: "",
  fabricante: "",
  modelo: "",
  numero_serie: "",
  ubicacion: "",
  ip_address: "",
  puerto: "",
  mac_address: "",
  version_firmware: "",
  version_sdk: "",
  agente_id: "",
  tipo_conexion: "PUENTE_LOCAL",
  sincronizacion_automatica: true,
  activo: true,
  mensaje: "",
};

const STATE_LABELS: Record<BiometricDeviceState, string> = {
  CONECTADO: "Conectado",
  ADVERTENCIA: "Advertencia",
  DESCONECTADO: "Desconectado",
  MANTENIMIENTO: "Mantenimiento",
};

const STATE_CLASSES: Record<BiometricDeviceState, string> = {
  CONECTADO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  ADVERTENCIA:
    "border-amber-200 bg-amber-50 text-amber-700",
  DESCONECTADO:
    "border-red-200 bg-red-50 text-red-700",
  MANTENIMIENTO:
    "border-violet-200 bg-violet-50 text-violet-700",
};

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const textAreaClass =
  "min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const warningButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown): string {
  if (error instanceof BiometriaApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "La operación del lector biométrico no pudo completarse.";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Lima",
  }).format(date);
}

function deviceToForm(device: BiometricDevice): DeviceFormState {
  return {
    codigo: device.codigo,
    nombre: device.nombre,
    fabricante: device.fabricante ?? "",
    modelo: device.modelo ?? "",
    numero_serie: device.numero_serie ?? "",
    ubicacion: device.ubicacion ?? "",
    ip_address: device.ip_address ?? "",
    puerto: device.puerto ? String(device.puerto) : "",
    mac_address: device.mac_address ?? "",
    version_firmware: device.version_firmware ?? "",
    version_sdk: device.version_sdk ?? "",
    agente_id: device.agente_id ?? "",
    tipo_conexion: device.tipo_conexion ?? "PUENTE_LOCAL",
    sincronizacion_automatica:
      device.sincronizacion_automatica,
    activo: device.activo,
    mensaje: device.mensaje ?? "",
  };
}

function formToInput(form: DeviceFormState): BiometricDeviceInput {
  const parsedPort = form.puerto.trim()
    ? Number(form.puerto)
    : null;

  return {
    codigo: form.codigo.trim().toUpperCase(),
    nombre: form.nombre.trim(),
    fabricante: form.fabricante.trim(),
    modelo: form.modelo.trim(),
    numero_serie: form.numero_serie.trim(),
    ubicacion: form.ubicacion.trim(),
    ip_address: form.ip_address.trim(),
    puerto:
      parsedPort !== null && Number.isInteger(parsedPort)
        ? parsedPort
        : null,
    mac_address: form.mac_address.trim().toUpperCase(),
    version_firmware: form.version_firmware.trim(),
    version_sdk: form.version_sdk.trim(),
    agente_id: form.agente_id.trim(),
    tipo_conexion: form.tipo_conexion,
    sincronizacion_automatica:
      form.sincronizacion_automatica,
    activo: form.activo,
    mensaje: form.mensaje.trim(),
  };
}

function readableJson(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) {
    return "Sin detalle adicional";
  }

  return JSON.stringify(value, null, 2);
}

export default function AdminBiometricDevicesPage() {
  const router = useRouter();

  const [user, setUser] = useState<UsuarioActivo | null>(null);
  const [payload, setPayload] = useState<BiometricDeviceList | null>(null);
  const [bridge, setBridge] = useState<BiometricBridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("TODOS");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState<DeviceFormState>(EMPTY_FORM);

  const [detail, setDetail] = useState<BiometricDeviceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generalDiagnostic, setGeneralDiagnostic] =
    useState<BiometricGeneralDiagnosticResponse | null>(null);

  const handleAuthError = useCallback(
    (requestError: unknown): boolean => {
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

  const loadBridge = useCallback(async () => {
    try {
      const status = await getBiometricBridgeStatus();
      setBridge(status);
    } catch (requestError) {
      setBridge({
        online: false,
        adapterConfigured: false,
        adapterAvailable: false,
        storesRawImages: false,
        error: errorMessage(requestError),
      });
    }
  }, []);

  const loadDevices = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);
        const result = await getBiometricDevices();
        setPayload(result);
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

    if (!current || current.rol !== "ADMINISTRADOR") {
      clearSession();
      router.replace("/login");
      return;
    }

    setUser(current);
    void Promise.all([loadDevices(), loadBridge()]);
  }, [loadBridge, loadDevices, router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void Promise.all([
        loadDevices(true),
        loadBridge(),
      ]);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadBridge, loadDevices]);

  const devices = payload?.devices ?? [];

  const filteredDevices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch =
        !term ||
        [
          device.codigo,
          device.nombre,
          device.fabricante ?? "",
          device.modelo ?? "",
          device.numero_serie ?? "",
          device.ubicacion ?? "",
          device.ip_address ?? "",
          device.mac_address ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesState =
        stateFilter === "TODOS" ||
        (stateFilter === "RETIRADO"
          ? !device.activo
          : device.activo &&
            device.estado_actual === stateFilter);

      return matchesSearch && matchesState;
    });
  }, [devices, search, stateFilter]);

  const summary = useMemo(() => {
    const retired = devices.filter((device) => !device.activo).length;

    return {
      total: payload?.summary.total ?? devices.length,
      connected: payload?.summary.connected ?? 0,
      alerts:
        (payload?.summary.warning ?? 0) +
        (payload?.summary.disconnected ?? 0),
      maintenance: payload?.summary.maintenance ?? 0,
      retired,
      pending: payload?.summary.pendingRecords ?? 0,
    };
  }, [devices, payload]);

  function openCreate() {
    setEditingDevice(null);
    setForm({ ...EMPTY_FORM });
    setFormMode("create");
    setError(null);
    setSuccess(null);
  }

  function openEdit(device: BiometricDevice) {
    setEditingDevice(device);
    setForm(deviceToForm(device));
    setFormMode("edit");
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    if (busyKey === "form") return;
    setFormMode(null);
    setEditingDevice(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.codigo.trim() || !form.nombre.trim()) {
      setError("El código y el nombre del lector son obligatorios.");
      return;
    }

    if (form.puerto.trim()) {
      const port = Number(form.puerto);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setError("El puerto debe estar entre 1 y 65535.");
        return;
      }
    }

    setBusyKey("form");
    setError(null);
    setSuccess(null);

    try {
      const input = formToInput(form);
      const response =
        formMode === "edit" && editingDevice
          ? await updateBiometricDevice(editingDevice.id, input)
          : await createBiometricDevice(input);

      setSuccess(response.message);
      setFormMode(null);
      setEditingDevice(null);
      await loadDevices(true);
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  }

  async function openDetail(device: BiometricDevice) {
    setDetailLoading(true);
    setDetail(null);
    setError(null);

    try {
      const response = await getBiometricDeviceDetail(device.id);
      setDetail(response);
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  async function diagnoseDevice(device: BiometricDevice) {
    const key = `diagnose-${device.id}`;
    setBusyKey(key);
    setError(null);
    setSuccess(null);

    try {
      const response = await diagnoseBiometricDevice(device.id);
      setSuccess(response.message);
      await Promise.all([
        loadDevices(true),
        loadBridge(),
      ]);

      if (detail?.device.id === device.id) {
        const refreshed = await getBiometricDeviceDetail(device.id);
        setDetail(refreshed);
      }
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  }

  async function applyAction(
    device: BiometricDevice,
    action: BiometricDeviceAction
  ) {
    const messages: Record<BiometricDeviceAction, string> = {
      ACTIVAR: "activar",
      REACTIVAR: "reactivar",
      MANTENIMIENTO: "colocar en mantenimiento",
      RETIRAR: "retirar del servicio",
    };

    const confirmed = window.confirm(
      `¿Confirma ${messages[action]} el lector ${device.codigo}?`
    );

    if (!confirmed) return;

    const reason =
      action === "RETIRAR" || action === "MANTENIMIENTO"
        ? window.prompt("Indique el motivo administrativo:", "") ?? ""
        : "";

    if (
      (action === "RETIRAR" || action === "MANTENIMIENTO") &&
      !reason.trim()
    ) {
      setError("Debe indicar un motivo para esta acción.");
      return;
    }

    const key = `action-${device.id}`;
    setBusyKey(key);
    setError(null);
    setSuccess(null);

    try {
      const response = await runBiometricDeviceAction(
        device.id,
        action,
        reason
      );
      setSuccess(response.message);
      await loadDevices(true);
      if (detail?.device.id === device.id) {
        const refreshed = await getBiometricDeviceDetail(device.id);
        setDetail(refreshed);
      }
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  }

  async function diagnoseAll() {
    setBusyKey("diagnose-all");
    setGeneralDiagnostic(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await diagnoseAllBiometricDevices();
      setGeneralDiagnostic(response);
      setSuccess(response.message);
      await Promise.all([
        loadDevices(true),
        loadBridge(),
      ]);
    } catch (requestError) {
      if (handleAuthError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState
          title="Validando sesión"
          description="Comprobando permisos de Administrador."
        />
      </div>
    );
  }

  const bridgeReady =
    bridge?.online === true &&
    bridge.adapterConfigured === true &&
    bridge.adapterAvailable === true;

  return (
    <DashboardLayout user={user}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Control biométrico"
          title="Dispositivos biométricos reales"
          description="Registre lectores, supervise heartbeats y ejecute diagnósticos mediante el puente local y el SDK del fabricante."
          badge={
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold ${
                bridgeReady
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : bridge?.online
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {bridgeReady
                ? "Puente y SDK disponibles"
                : bridge?.online
                  ? "Puente activo · SDK pendiente"
                  : "Puente no disponible"}
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={refreshing || busyKey !== null}
                onClick={() =>
                  void Promise.all([
                    loadDevices(true),
                    loadBridge(),
                  ])
                }
              >
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busyKey !== null}
                onClick={() => void diagnoseAll()}
              >
                {busyKey === "diagnose-all"
                  ? "Diagnosticando..."
                  : "Diagnóstico general"}
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={busyKey !== null}
                onClick={openCreate}
              >
                Registrar lector
              </button>
            </div>
          }
        />

        <BiometriaSubNavigation />

        {error && (
          <ErrorState
            title="No se pudo completar la operación"
            description={error}
            retryText="Reintentar carga"
            onRetry={() => void loadDevices()}
          />
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Registrados"
            value={summary.total}
            description="Lectores en PostgreSQL"
            tone="blue"
          />
          <MetricCard
            label="Conectados"
            value={summary.connected}
            description="Actividad menor a 2 min"
            tone="green"
          />
          <MetricCard
            label="Alertas"
            value={summary.alerts}
            description="Advertencia o desconexión"
            tone={summary.alerts ? "amber" : "green"}
          />
          <MetricCard
            label="Mantenimiento"
            value={summary.maintenance}
            description="Bloqueados por revisión"
            tone="violet"
          />
          <MetricCard
            label="Retirados"
            value={summary.retired}
            description="Fuera de servicio"
            tone="slate"
          />
          <MetricCard
            label="Pendientes"
            value={summary.pending}
            description="Registros por sincronizar"
            tone={summary.pending ? "amber" : "green"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <SectionCard
            title="Lectores institucionales"
            description="Los estados se calculan con actividad real. No se generan respuestas simuladas."
            contentClassName="p-0"
          >
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_230px]">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar código, modelo, serie, ubicación o IP"
                className={fieldClass}
              />
              <select
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(event.target.value as StateFilter)
                }
                className={fieldClass}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="CONECTADO">Conectados</option>
                <option value="ADVERTENCIA">Advertencias</option>
                <option value="DESCONECTADO">Desconectados</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="RETIRADO">Retirados</option>
              </select>
            </div>

            {loading ? (
              <div className="p-8">
                <LoadingState
                  title="Consultando lectores"
                  description="Recuperando dispositivos y diagnósticos desde PostgreSQL."
                />
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No hay lectores para mostrar"
                  description="Registre el primer lector o cambie los filtros de búsqueda."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Lector</th>
                      <th className="px-4 py-3">Ubicación / red</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">SDK / firmware</th>
                      <th className="px-4 py-3">Última actividad</th>
                      <th className="px-4 py-3">Diagnóstico</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((device) => {
                      const rowBusy =
                        busyKey === `diagnose-${device.id}` ||
                        busyKey === `action-${device.id}`;

                      return (
                        <tr
                          key={device.id}
                          className="border-b border-slate-100 align-top transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4">
                            <strong className="block text-sm font-extrabold text-slate-900">
                              {device.nombre}
                            </strong>
                            <span className="mt-1 block text-xs font-bold text-blue-700">
                              {device.codigo}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-slate-500">
                              {[device.fabricante, device.modelo]
                                .filter(Boolean)
                                .join(" · ") || "Fabricante no informado"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            <strong className="block text-slate-800">
                              {device.ubicacion ?? "Sin ubicación"}
                            </strong>
                            <span className="mt-1 block">
                              {device.ip_address
                                ? `${device.ip_address}${
                                    device.puerto ? `:${device.puerto}` : ""
                                  }`
                                : "Sin dirección de red"}
                            </span>
                            <span className="mt-1 block text-slate-400">
                              {device.tipo_conexion.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <StateBadge
                              state={device.estado_actual}
                              active={device.activo}
                            />
                            <span className="mt-2 block text-xs font-semibold text-slate-500">
                              Señal: {device.porcentaje_senal}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            <span className="block">
                              SDK: {device.version_sdk ?? "—"}
                            </span>
                            <span className="mt-1 block">
                              Firmware: {device.version_firmware ?? "—"}
                            </span>
                            <span className="mt-1 block text-slate-400">
                              Serie: {device.numero_serie ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            <span className="block">
                              {formatDateTime(device.ultima_actividad_en)}
                            </span>
                            <span className="mt-1 block text-slate-400">
                              {device.mensaje ?? "Sin mensaje técnico"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                            <span className="block">
                              {formatDateTime(device.ultimo_diagnostico_en)}
                            </span>
                            <span className="mt-1 block">
                              Latencia: {device.ultima_latencia_ms ?? "—"} ms
                            </span>
                            {device.ultimo_error_codigo && (
                              <span className="mt-1 block font-bold text-red-600">
                                {device.ultimo_error_codigo}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                disabled={rowBusy || busyKey !== null}
                                onClick={() => void openDetail(device)}
                              >
                                Ver
                              </button>
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                disabled={rowBusy || busyKey !== null}
                                onClick={() => openEdit(device)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={warningButtonClass}
                                disabled={
                                  rowBusy || busyKey !== null || !device.activo
                                }
                                onClick={() => void diagnoseDevice(device)}
                              >
                                {busyKey === `diagnose-${device.id}`
                                  ? "Probando..."
                                  : "Diagnosticar"}
                              </button>
                              {device.activo ? (
                                device.estado_actual === "MANTENIMIENTO" ? (
                                  <button
                                    type="button"
                                    className={secondaryButtonClass}
                                    disabled={rowBusy || busyKey !== null}
                                    onClick={() =>
                                      void applyAction(device, "REACTIVAR")
                                    }
                                  >
                                    Reactivar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={warningButtonClass}
                                    disabled={rowBusy || busyKey !== null}
                                    onClick={() =>
                                      void applyAction(device, "MANTENIMIENTO")
                                    }
                                  >
                                    Mantenimiento
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  disabled={rowBusy || busyKey !== null}
                                  onClick={() =>
                                    void applyAction(device, "REACTIVAR")
                                  }
                                >
                                  Reactivar
                                </button>
                              )}
                              {device.activo && (
                                <button
                                  type="button"
                                  className={dangerButtonClass}
                                  disabled={rowBusy || busyKey !== null}
                                  onClick={() =>
                                    void applyAction(device, "RETIRAR")
                                  }
                                >
                                  Retirar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Puente biométrico"
              description="Estado real del servicio localhost y del adaptador SDK."
            >
              <InfoRow
                label="Puente"
                value={bridge?.online ? "Activo" : "No disponible"}
                tone={bridge?.online ? "green" : "red"}
              />
              <InfoRow
                label="Adaptador"
                value={
                  bridge?.adapterConfigured
                    ? bridge.adapterAvailable
                      ? "Configurado y disponible"
                      : "Configurado, archivo no disponible"
                    : "No configurado"
                }
                tone={bridgeReady ? "green" : "amber"}
              />
              <InfoRow
                label="Versión del puente"
                value={bridge?.bridgeVersion ?? "—"}
              />
              <InfoRow
                label="Lector configurado"
                value={
                  typeof bridge?.device?.codigo === "string"
                    ? bridge.device.codigo
                    : typeof bridge?.device?.code === "string"
                      ? bridge.device.code
                      : "—"
                }
              />
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                {bridge?.message ??
                  bridge?.error ??
                  "Inicie el puente local para consultar el SDK."}
              </p>
            </SectionCard>

            <SectionCard
              title="Método de diagnóstico"
              description="Alcance técnico de la prueba general."
            >
              <div className="space-y-3 text-xs font-semibold leading-5 text-slate-600">
                <p>
                  El lector conectado al puente local se prueba directamente mediante el SDK del fabricante.
                </p>
                <p>
                  Los lectores remotos se evalúan por heartbeat y última actividad real. No se inventan respuestas ni cambios de estado.
                </p>
                <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-800">
                  Las imágenes crudas permanecen bloqueadas. El diagnóstico solo registra metadatos técnicos y auditoría.
                </p>
              </div>
            </SectionCard>

            {generalDiagnostic && (
              <SectionCard
                title="Último diagnóstico general"
                description={generalDiagnostic.message}
              >
                <div className="grid grid-cols-2 gap-3 text-center">
                  <MiniMetric
                    label="Conectados"
                    value={generalDiagnostic.summary.connected}
                  />
                  <MiniMetric
                    label="Alertas"
                    value={generalDiagnostic.summary.warning}
                  />
                  <MiniMetric
                    label="Desconectados"
                    value={generalDiagnostic.summary.disconnected}
                  />
                  <MiniMetric
                    label="Mantenimiento"
                    value={generalDiagnostic.summary.maintenance}
                  />
                </div>
                {generalDiagnostic.warning && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                    {generalDiagnostic.warning}
                  </p>
                )}
                <p className="mt-4 text-[11px] font-semibold leading-5 text-slate-500">
                  {generalDiagnostic.methodology}
                </p>
              </SectionCard>
            )}
          </div>
        </section>
      </div>

      {formMode && (
        <DeviceFormModal
          mode={formMode}
          form={form}
          busy={busyKey === "form"}
          onChange={setForm}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      )}

      {(detail || detailLoading) && (
        <DeviceDetailModal
          detail={detail}
          loading={detailLoading}
          busyKey={busyKey}
          onClose={() => {
            if (!busyKey) setDetail(null);
          }}
          onDiagnose={(device) => void diagnoseDevice(device)}
          onEdit={(device) => {
            setDetail(null);
            openEdit(device);
          }}
        />
      )}
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "blue" | "green" | "amber" | "violet" | "slate";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <article className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <strong className="mt-2 block text-3xl font-black">
        {value}
      </strong>
      <span className="mt-1 block text-[11px] font-semibold opacity-75">
        {description}
      </span>
    </article>
  );
}

function StateBadge({
  state,
  active,
}: {
  state: BiometricDeviceState;
  active: boolean;
}) {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
        <span className="h-2 w-2 rounded-full bg-current" />
        Retirado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${STATE_CLASSES[state]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {STATE_LABELS[state]}
    </span>
  );
}

function InfoRow({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  tone?: "green" | "amber" | "red" | "slate";
}) {
  const valueClass = {
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    slate: "text-slate-800",
  }[tone];

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <strong className={`text-right text-xs font-extrabold ${valueClass}`}>
        {value}
      </strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <strong className="block text-xl font-black text-slate-900">
        {value}
      </strong>
      <span className="mt-1 block text-[10px] font-bold text-slate-500">
        {label}
      </span>
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-4xl",
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className={`max-h-[94vh] w-full ${width} overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-black text-slate-500 transition hover:bg-slate-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="max-h-[calc(94vh-160px)] overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

function DeviceFormModal({
  mode,
  form,
  busy,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: FormMode;
  form: DeviceFormState;
  busy: boolean;
  onChange: (next: DeviceFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function setField<K extends keyof DeviceFormState>(
    key: K,
    value: DeviceFormState[K]
  ) {
    onChange({
      ...form,
      [key]: value,
    });
  }

  return (
    <ModalShell
      title={mode === "create" ? "Registrar lector" : "Editar lector"}
      description="Los datos se guardan en PostgreSQL y quedan registrados en auditoría."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="device-form-8j3"
            className={primaryButtonClass}
            disabled={busy}
          >
            {busy
              ? "Guardando..."
              : mode === "create"
                ? "Registrar lector"
                : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form
        id="device-form-8j3"
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <FormField label="Código institucional *">
          <input
            value={form.codigo}
            onChange={(event) => setField("codigo", event.target.value)}
            className={fieldClass}
            maxLength={80}
            required
          />
        </FormField>
        <FormField label="Nombre del lector *">
          <input
            value={form.nombre}
            onChange={(event) => setField("nombre", event.target.value)}
            className={fieldClass}
            maxLength={160}
            required
          />
        </FormField>
        <FormField label="Fabricante">
          <input
            value={form.fabricante}
            onChange={(event) => setField("fabricante", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Modelo">
          <input
            value={form.modelo}
            onChange={(event) => setField("modelo", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Número de serie">
          <input
            value={form.numero_serie}
            onChange={(event) => setField("numero_serie", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Ubicación">
          <input
            value={form.ubicacion}
            onChange={(event) => setField("ubicacion", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Dirección IP">
          <input
            value={form.ip_address}
            onChange={(event) => setField("ip_address", event.target.value)}
            className={fieldClass}
            placeholder="192.168.1.20"
          />
        </FormField>
        <FormField label="Puerto">
          <input
            type="number"
            min={1}
            max={65535}
            value={form.puerto}
            onChange={(event) => setField("puerto", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Dirección MAC">
          <input
            value={form.mac_address}
            onChange={(event) => setField("mac_address", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Tipo de conexión">
          <select
            value={form.tipo_conexion}
            onChange={(event) =>
              setField(
                "tipo_conexion",
                event.target.value as BiometricDeviceConnectionType
              )
            }
            className={fieldClass}
          >
            <option value="PUENTE_LOCAL">Puente local</option>
            <option value="AGENTE_REMOTO">Agente remoto</option>
            <option value="RED">Red institucional</option>
          </select>
        </FormField>
        <FormField label="Versión SDK">
          <input
            value={form.version_sdk}
            onChange={(event) => setField("version_sdk", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="Versión firmware">
          <input
            value={form.version_firmware}
            onChange={(event) =>
              setField("version_firmware", event.target.value)
            }
            className={fieldClass}
          />
        </FormField>
        <FormField label="Identificador del agente">
          <input
            value={form.agente_id}
            onChange={(event) => setField("agente_id", event.target.value)}
            className={fieldClass}
          />
        </FormField>
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={form.sincronizacion_automatica}
              onChange={(event) =>
                setField(
                  "sincronizacion_automatica",
                  event.target.checked
                )
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Sincronización automática
          </label>
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(event) => setField("activo", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Lector activo
          </label>
        </div>
        <FormField label="Mensaje u observación" wide>
          <textarea
            value={form.mensaje}
            onChange={(event) => setField("mensaje", event.target.value)}
            className={textAreaClass}
            maxLength={500}
          />
        </FormField>
      </form>
    </ModalShell>
  );
}

function FormField({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-2 block text-xs font-extrabold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function DeviceDetailModal({
  detail,
  loading,
  busyKey,
  onClose,
  onDiagnose,
  onEdit,
}: {
  detail: BiometricDeviceDetail | null;
  loading: boolean;
  busyKey: string | null;
  onClose: () => void;
  onDiagnose: (device: BiometricDevice) => void;
  onEdit: (device: BiometricDevice) => void;
}) {
  const device = detail?.device ?? null;

  return (
    <ModalShell
      title={device ? device.nombre : "Detalle del lector"}
      description={
        device
          ? `${device.codigo} · información técnica y auditoría`
          : "Consultando información técnica"
      }
      onClose={onClose}
      width="max-w-5xl"
      footer={
        device ? (
          <>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={busyKey !== null}
              onClick={() => onEdit(device)}
            >
              Editar
            </button>
            <button
              type="button"
              className={primaryButtonClass}
              disabled={busyKey !== null || !device.activo}
              onClick={() => onDiagnose(device)}
            >
              {busyKey === `diagnose-${device.id}`
                ? "Diagnosticando..."
                : "Diagnóstico real"}
            </button>
          </>
        ) : null
      }
    >
      {loading || !detail || !device ? (
        <LoadingState
          title="Consultando lector"
          description="Recuperando metadatos y eventos técnicos."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="Estado">
              <StateBadge state={device.estado_actual} active={device.activo} />
            </DetailItem>
            <DetailItem label="Fabricante y modelo">
              {[device.fabricante, device.modelo].filter(Boolean).join(" · ") || "—"}
            </DetailItem>
            <DetailItem label="Número de serie">
              {device.numero_serie ?? "—"}
            </DetailItem>
            <DetailItem label="Ubicación">
              {device.ubicacion ?? "—"}
            </DetailItem>
            <DetailItem label="Red">
              {device.ip_address
                ? `${device.ip_address}${device.puerto ? `:${device.puerto}` : ""}`
                : "—"}
            </DetailItem>
            <DetailItem label="Tipo de conexión">
              {device.tipo_conexion.replaceAll("_", " ")}
            </DetailItem>
            <DetailItem label="SDK / firmware">
              {device.version_sdk ?? "—"} / {device.version_firmware ?? "—"}
            </DetailItem>
            <DetailItem label="Última actividad">
              {formatDateTime(device.ultima_actividad_en)}
            </DetailItem>
            <DetailItem label="Último diagnóstico">
              {formatDateTime(device.ultimo_diagnostico_en)}
            </DetailItem>
            <DetailItem label="Latencia">
              {device.ultima_latencia_ms ?? "—"} ms
            </DetailItem>
            <DetailItem label="Último error">
              {device.ultimo_error_codigo ?? "Sin error registrado"}
            </DetailItem>
            <DetailItem label="Plantillas / pendientes">
              {device.plantillas_registradas} / {device.registros_pendientes}
            </DetailItem>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Detalle del último diagnóstico
            </h3>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">
              {readableJson(device.diagnostico_detalle)}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Historial técnico
            </h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              {detail.events.length ? (
                detail.events.map((event) => (
                  <article
                    key={event.id}
                    className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[180px_1fr_130px]"
                  >
                    <div>
                      <strong className="block text-xs font-extrabold text-slate-900">
                        {event.type.replaceAll("_", " ")}
                      </strong>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                        {formatDateTime(event.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-5 text-slate-600">
                      {event.detail
                        ? JSON.stringify(event.detail)
                        : "Sin detalle adicional"}
                    </p>
                    <div className="text-right">
                      <span className="block text-xs font-extrabold text-slate-700">
                        {event.result}
                      </span>
                      <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                        {event.performed_by ?? "Sistema"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-6 text-center text-sm font-semibold text-slate-500">
                  No existen eventos técnicos registrados.
                </div>
              )}
            </div>
          </div>

          <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">
            Seguridad: el diagnóstico usa el puente local y solo registra metadatos. No se almacenan imágenes crudas de huellas.
          </p>
        </div>
      )}
    </ModalShell>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="mt-2 text-sm font-bold text-slate-800">
        {children}
      </div>
    </div>
  );
}
