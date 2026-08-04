"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import BiometriaSubNavigation from "@/components/admin/biometria/BiometriaSubNavigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import ModalShell from "@/components/shared/ModalShell";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card, {
  CardContent,
  CardHeader,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  BleStationsApiError,
  createBleStation,
  generateBleProvisioning,
  getBleStationsDashboard,
  transitionBleStation,
} from "@/lib/services/bleStations.service";

import type {
  BleStation,
  BleStationsDashboard,
  BleStationType,
  CreateBleStationInput,
  GeneratedBleProvisioning,
} from "@/types/bleStation";
import type { UsuarioActivo } from "@/types/usuario";

const EMPTY_FORM: CreateBleStationInput = {
  code: "",
  name: "",
  type: "AULA",
  departmentId: null,
  classroom: "",
  minimumRssi: -75,
  minimumSamples: 3,
  rotationSeconds: 15,
};

const STATE_TONES = {
  PENDIENTE: "warning",
  ACTIVA: "success",
  SUSPENDIDA: "warning",
  REVOCADA: "neutral",
} as const;

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanType(type: BleStationType): string {
  if (type === "AULA") {
    return "Aula";
  }
  if (type === "INGRESO") {
    return "Ingreso";
  }
  return "Prueba";
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="text-3xl font-black text-unsaac-text">{value}</p>
        <p className="text-sm font-semibold text-unsaac-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function BleStationsPage() {
  const router = useRouter();
  const [user] = useState<UsuarioActivo>(
    () => getSession()?.user ?? MOCK_ADMIN
  );
  const [dashboard, setDashboard] =
    useState<BleStationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBleStationInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [provisioning, setProvisioning] =
    useState<GeneratedBleProvisioning | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getBleStationsDashboard();
      setDashboard(data);
      setError(null);
    } catch (loadError) {
      if (
        loadError instanceof BleStationsApiError &&
        loadError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el módulo Bluetooth."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void loadData();
    }, 15000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(refreshTimer);
    };
  }, [loadData]);

  const stations = useMemo(
    () => dashboard?.stations ?? [],
    [dashboard]
  );

  function updateForm<K extends keyof CreateBleStationInput>(
    key: K,
    value: CreateBleStationInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperation("create");
    setError(null);
    setNotice(null);
    setFieldErrors({});

    try {
      const message = await createBleStation(form);
      setNotice(message);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (operationError) {
      if (operationError instanceof BleStationsApiError) {
        setFieldErrors(operationError.fields ?? {});
        setError(operationError.message);
      } else {
        setError("No se pudo crear la estación Bluetooth.");
      }
    } finally {
      setOperation(null);
    }
  }

  async function handleProvision(station: BleStation) {
    setOperation(`provision-${station.id}`);
    setError(null);
    setNotice(null);

    try {
      const generated = await generateBleProvisioning(station.id);
      setProvisioning(generated);
      setNotice(
        "QR generado. Escanéelo desde un segundo teléfono Android con una cuenta Administrador."
      );
      await loadData();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "No se pudo generar el QR de la estación."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleTransition(
    station: BleStation,
    action: "suspender" | "reactivar" | "revocar"
  ) {
    let reason = "";

    if (action !== "reactivar") {
      const entered = window.prompt(
        `Indique el motivo para ${action} ${station.name}:`
      );
      if (entered === null) {
        return;
      }
      reason = entered.trim();
      if (reason.length < 5) {
        setError("El motivo debe tener al menos cinco caracteres.");
        return;
      }
    }

    if (
      !window.confirm(
        `¿Confirma ${action} la estación ${station.code}?`
      )
    ) {
      return;
    }

    setOperation(`${action}-${station.id}`);
    setError(null);
    setNotice(null);

    try {
      const message = await transitionBleStation(
        station.id,
        action,
        reason
      );
      setNotice(message);
      await loadData();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "No se pudo actualizar la estación."
      );
    } finally {
      setOperation(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <LoadingState
          title="Cargando estaciones Bluetooth"
          description="Consultando estaciones, detecciones y configuración de proximidad."
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (!dashboard) {
    return (
      <DashboardLayout user={user}>
        <ErrorState
          title="No se pudo abrir Estaciones BLE"
          description={error ?? "El servidor no devolvió información válida."}
          onRetry={loadData}
          fullHeight
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Presencia institucional"
          title="Estaciones Bluetooth BLE"
          description="Registre puntos de proximidad por aula, provisione un teléfono emisor y supervise las detecciones usadas para la asistencia."
          badge={
            <StatusBadge
              status="operativo"
              label="Proximidad BLE"
              tone="success"
              size="md"
            />
          }
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadData()}
            >
              Actualizar
            </Button>
          }
        />

        <BiometriaSubNavigation />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            label="Total"
            value={dashboard.summary.total}
            detail="Estaciones registradas"
          />
          <SummaryCard
            label="Activas"
            value={dashboard.summary.active}
            detail="Listas para emitir"
          />
          <SummaryCard
            label="Pendientes"
            value={dashboard.summary.pending}
            detail="Esperan provisionamiento"
          />
          <SummaryCard
            label="Suspendidas"
            value={dashboard.summary.suspended}
            detail="Bloqueadas temporalmente"
          />
          <SummaryCard
            label="Revocadas"
            value={dashboard.summary.revoked}
            detail="Credenciales invalidadas"
          />
          <SummaryCard
            label="Detecciones hoy"
            value={dashboard.summary.detectionsToday}
            detail="Pruebas de proximidad"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <Card>
            <CardHeader
              title="Nueva estación"
              description="Asigne el emisor a una carrera y un aula. Para pruebas puede usar el tipo PRUEBA."
            />
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Código"
                    value={form.code}
                    onChange={(event) =>
                      updateForm("code", event.target.value.toUpperCase())
                    }
                    placeholder="BLE-SIS-LAB01"
                    error={fieldErrors.codigo}
                    required
                  />
                  <Select
                    label="Tipo"
                    value={form.type}
                    onChange={(event) =>
                      updateForm(
                        "type",
                        event.target.value as BleStationType
                      )
                    }
                    required
                  >
                    <option value="AULA">Aula</option>
                    <option value="INGRESO">Ingreso institucional</option>
                    <option value="PRUEBA">Prueba general</option>
                  </Select>
                </div>

                <Input
                  label="Nombre"
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  placeholder="Laboratorio de Sistemas 01"
                  error={fieldErrors.nombre}
                  required
                />

                <Select
                  label="Carrera o departamento"
                  value={form.departmentId?.toString() ?? ""}
                  onChange={(event) =>
                    updateForm(
                      "departmentId",
                      event.target.value
                        ? Number(event.target.value)
                        : null
                    )
                  }
                >
                  <option value="">Todas las carreras</option>
                  {dashboard.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Aula o ubicación"
                  value={form.classroom}
                  onChange={(event) =>
                    updateForm("classroom", event.target.value)
                  }
                  placeholder="LAB-01"
                  error={fieldErrors.aula}
                  required={form.type === "AULA"}
                  helperText="Debe coincidir con el aula registrada en Horarios para que la validación sea automática."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    type="number"
                    label="RSSI mínimo"
                    value={form.minimumRssi}
                    min={-110}
                    max={-20}
                    onChange={(event) =>
                      updateForm("minimumRssi", Number(event.target.value))
                    }
                    error={fieldErrors.rssi_minimo}
                  />
                  <Input
                    type="number"
                    label="Muestras"
                    value={form.minimumSamples}
                    min={1}
                    max={30}
                    onChange={(event) =>
                      updateForm(
                        "minimumSamples",
                        Number(event.target.value)
                      )
                    }
                    error={fieldErrors.muestras_minimas}
                  />
                  <Input
                    type="number"
                    label="Rotación (s)"
                    value={form.rotationSeconds}
                    min={5}
                    max={120}
                    onChange={(event) =>
                      updateForm(
                        "rotationSeconds",
                        Number(event.target.value)
                      )
                    }
                    error={fieldErrors.intervalo_rotacion_seg}
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={operation === "create"}
                  loadingText="Creando estación"
                >
                  Registrar estación BLE
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Estaciones registradas"
              description="Genere el QR, escanéelo desde otro Android y mantenga el modo estación abierto durante las pruebas."
              action={
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {stations.length} registros
                </span>
              }
            />
            <CardContent className="space-y-4">
              {stations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                  Todavía no existen estaciones Bluetooth.
                </div>
              ) : (
                stations.map((station) => (
                  <article
                    key={station.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-unsaac-text">
                            {station.name}
                          </h3>
                          <StatusBadge
                            status={station.state.toLowerCase()}
                            label={station.state}
                            tone={STATE_TONES[station.state]}
                          />
                        </div>
                        <p className="mt-1 text-sm font-bold text-unsaac-blue">
                          {station.code} · {humanType(station.type)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {station.department ?? "Todas las carreras"}
                          {station.classroom
                            ? ` · ${station.classroom}`
                            : ""}
                        </p>
                        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                          <span>RSSI mínimo: {station.minimumRssi} dBm</span>
                          <span>Muestras: {station.minimumSamples}</span>
                          <span>Rotación: {station.rotationSeconds} s</span>
                          <span>
                            Detecciones hoy: {station.detectionsToday}
                          </span>
                          <span>
                            Última detección: {formatDate(station.lastDetectionAt)}
                          </span>
                          <span>
                            Último RSSI: {station.lastDetectionRssi ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-[310px] lg:justify-end">
                        {station.state !== "REVOCADA" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={operation === `provision-${station.id}`}
                            onClick={() => void handleProvision(station)}
                          >
                            Generar QR
                          </Button>
                        )}
                        {station.state === "ACTIVA" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="warning"
                            loading={operation === `suspender-${station.id}`}
                            onClick={() =>
                              void handleTransition(station, "suspender")
                            }
                          >
                            Suspender
                          </Button>
                        )}
                        {station.state === "SUSPENDIDA" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="success"
                            loading={operation === `reactivar-${station.id}`}
                            onClick={() =>
                              void handleTransition(station, "reactivar")
                            }
                          >
                            Reactivar
                          </Button>
                        )}
                        {station.state !== "REVOCADA" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            loading={operation === `revocar-${station.id}`}
                            onClick={() =>
                              void handleTransition(station, "revocar")
                            }
                          >
                            Revocar
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader
            title="Configuración aplicada"
            description="Estos valores controlan la vigencia y exigencia de presencia Bluetooth."
          />
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Rotación
              </p>
              <p className="mt-2 text-xl font-black">
                {dashboard.configuration.rotationSeconds} segundos
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Margen temporal
              </p>
              <p className="mt-2 text-xl font-black">
                ±{dashboard.configuration.slotMargin} intervalo
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Asistencia de curso
              </p>
              <p className="mt-2 text-xl font-black">
                {dashboard.configuration.requiredForCourse
                  ? "BLE obligatorio"
                  : "BLE opcional"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Ingreso institucional
              </p>
              <p className="mt-2 text-xl font-black">
                {dashboard.configuration.requiredForEntry
                  ? "BLE obligatorio"
                  : "BLE opcional"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Eventos BLE recientes"
            description="Provisionamientos, cambios de estado y validaciones de proximidad."
          />
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Estación</th>
                    <th className="px-3 py-3">Evento</th>
                    <th className="px-3 py-3">Resultado</th>
                    <th className="px-3 py-3">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.events.map((event) => (
                    <tr key={event.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-600">
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {event.stationCode ?? "Sistema"}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {event.type.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={event.result.toLowerCase()}
                          label={event.result}
                          tone={
                            event.result === "EXITO" ? "success" : "warning"
                          }
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-600">
                        {event.actor ?? "Sistema"}
                      </td>
                    </tr>
                  ))}
                  {dashboard.events.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center font-semibold text-slate-500"
                      >
                        No existen eventos Bluetooth todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ModalShell
        open={provisioning !== null}
        onClose={() => setProvisioning(null)}
        title="Provisionar estación BLE"
        description="Use un segundo teléfono Android, inicie sesión como Administrador y abra Modo estación BLE."
        size="sm"
        closeOnBackdrop={false}
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setProvisioning(null)}
          >
            Cerrar
          </Button>
        }
      >
        {provisioning && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
              Estación <strong>{provisioning.stationName}</strong> (
              {provisioning.stationCode}). El código vence el{" "}
              {formatDate(provisioning.expiresAt)}.
            </div>
            <div className="mx-auto w-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <Image
                src={provisioning.qrImage}
                alt={`QR para ${provisioning.stationName}`}
                width={360}
                height={360}
                unoptimized
                priority
                className="h-auto w-full max-w-[320px]"
              />
            </div>
            <ol className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
              <li>1. Instale la APK 8D en un segundo Android.</li>
              <li>2. Inicie sesión como Administrador.</li>
              <li>3. Abra “Modo estación BLE”.</li>
              <li>4. Escanee este QR y autorice Bluetooth.</li>
              <li>5. Mantenga esa pantalla abierta durante la prueba.</li>
            </ol>
          </div>
        )}
      </ModalShell>
    </DashboardLayout>
  );
}
