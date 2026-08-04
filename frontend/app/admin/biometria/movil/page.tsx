"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import BiometriaSubNavigation from "@/components/admin/biometria/BiometriaSubNavigation";
import MobileLinkQrModal from "@/components/admin/biometria/movil/MobileLinkQrModal";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card, {
  CardContent,
  CardHeader,
} from "@/components/ui/Card";
import Select from "@/components/ui/Select";

import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  cancelMobileLink,
  generateMobileLink,
  getMobileAttendanceDashboard,
  getMobileDevicesDashboard,
  MobileDevicesApiError,
  transitionMobileDevice,
} from "@/lib/services/mobileDevices.service";

import type {
  GeneratedMobileLink,
  MobileAttendanceDashboard,
  MobileAttendanceRecord,
  MobileDevice,
  MobileDevicesDashboard,
  MobileDeviceState,
} from "@/types/mobileDevice";
import type { UsuarioActivo } from "@/types/usuario";

const STATE_TONES: Record<
  MobileDeviceState,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  PENDIENTE: "warning",
  AUTORIZADO: "success",
  SUSPENDIDO: "warning",
  RECHAZADO: "danger",
  REVOCADO: "neutral",
};

function formatDate(
  value: string | null,
  fallback = "Sin registro"
): string {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function deviceName(device: MobileDevice): string {
  return `${device.manufacturer} ${device.model}`.trim();
}

export default function MobileDevicesPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo>(MOCK_ADMIN);

  const [dashboard, setDashboard] =
    useState<MobileDevicesDashboard | null>(null);
  const [attendance, setAttendance] =
    useState<MobileAttendanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [notice, setNotice] =
    useState<string | null>(null);
  const [teacherId, setTeacherId] =
    useState("");
  const [generatedLink, setGeneratedLink] =
    useState<GeneratedMobileLink | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [data, attendanceData] = await Promise.all([
        getMobileDevicesDashboard(),
        getMobileAttendanceDashboard(),
      ]);
      setDashboard(data);
      setAttendance(attendanceData);
      setError(null);
    } catch (loadError) {
      if (
        loadError instanceof MobileDevicesApiError &&
        loadError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el módulo móvil."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();

    if (session?.user) {
      // Sincroniza el encabezado institucional con la sesión activa.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(session.user);
    }

    const initialLoadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void loadData();
    }, 12000);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadData]);

  const availableTeachers = useMemo(
    () => dashboard?.teachers ?? [],
    [dashboard]
  );

  async function handleGenerateQr() {
    const numericTeacherId = Number(teacherId);

    if (!Number.isInteger(numericTeacherId)) {
      setError("Seleccione un docente.");
      return;
    }

    setOperation("generating");
    setError(null);
    setNotice(null);

    try {
      const link = await generateMobileLink(
        numericTeacherId
      );
      setGeneratedLink(link);
      setQrOpen(true);
      setNotice(
        "QR de sincronización y autorización generado correctamente."
      );
      await loadData();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "No se pudo generar el código QR."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleCancelQr() {
    if (!generatedLink) {
      return;
    }

    setOperation("cancelling");

    try {
      const message = await cancelMobileLink(
        generatedLink.id
      );
      setNotice(message);
      setQrOpen(false);
      setGeneratedLink(null);
      await loadData();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "No se pudo cancelar el código."
      );
    } finally {
      setOperation(null);
    }
  }

  async function handleTransition(
    device: MobileDevice,
    action:
      | "aprobar"
      | "rechazar"
      | "suspender"
      | "reactivar"
      | "revocar"
  ) {
    let reason = "";

    if (
      action === "rechazar" ||
      action === "suspender" ||
      action === "revocar"
    ) {
      const entered = window.prompt(
        `Indique el motivo para ${action} ${deviceName(device)}:`
      );

      if (entered === null) {
        return;
      }

      reason = entered.trim();

      if (reason.length < 5) {
        setError(
          "El motivo debe tener al menos cinco caracteres."
        );
        return;
      }
    }

    const confirmed = window.confirm(
      `¿Confirma la operación “${action}” para ${deviceName(device)}?`
    );

    if (!confirmed) {
      return;
    }

    setOperation(`${action}-${device.id}`);
    setError(null);
    setNotice(null);

    try {
      const message = await transitionMobileDevice(
        device.id,
        action,
        reason
      );
      setNotice(message);
      await loadData();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "No se pudo actualizar el dispositivo."
      );
    } finally {
      setOperation(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <LoadingState
          title="Cargando dispositivos móviles"
          description="Consultando vinculaciones, solicitudes y eventos de seguridad."
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (!dashboard && error) {
    return (
      <DashboardLayout user={user}>
        <ErrorState
          title="No se pudo abrir el módulo móvil"
          description={error}
          onRetry={loadData}
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (!dashboard) {
    return (
      <DashboardLayout user={user}>
        <ErrorState
          title="Información móvil no disponible"
          description="El servidor no devolvió información válida del módulo de dispositivos móviles."
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
        eyebrow="Seguridad móvil"
        title="Dispositivos móviles"
        description="Genere un QR para que el docente sincronice y autorice su celular directamente desde la aplicación."
        badge={
          <StatusBadge
            status="operativo"
            label="Sincronización QR"
            tone="success"
            size="md"
          />
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData()}
            loading={operation === "refresh"}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary
          label="Total"
          value={dashboard.summary.total}
        />
        <Summary
          label="Pendientes"
          value={dashboard.summary.pending}
        />
        <Summary
          label="Autorizados"
          value={dashboard.summary.authorized}
        />
        <Summary
          label="Suspendidos"
          value={dashboard.summary.suspended}
        />
        <Summary
          label="Revocados"
          value={dashboard.summary.revoked}
        />
      </section>

      <Card>
        <CardHeader
          title="Marcaciones móviles de hoy"
          description={`Fecha institucional: ${attendance?.date ?? "Sin información"}. Cada registro conserva desafío, firma y evidencia Bluetooth cuando corresponde.`}
          action={
            <StatusBadge
              status="firma-verificada"
              label={`${attendance?.summary.verifiedSignatures ?? 0} firma(s) verificadas`}
              tone="success"
            />
          }
        />
        <CardContent className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <AttendanceSummary
              label="Intentos"
              value={attendance?.summary.total ?? 0}
            />
            <AttendanceSummary
              label="Registradas"
              value={attendance?.summary.registered ?? 0}
            />
            <AttendanceSummary
              label="Duplicadas"
              value={attendance?.summary.duplicate ?? 0}
            />
            <AttendanceSummary
              label="Firmas válidas"
              value={attendance?.summary.verifiedSignatures ?? 0}
            />
            <AttendanceSummary
              label="QR dinámicos"
              value={attendance?.summary.dynamicQr ?? 0}
            />
            <AttendanceSummary
              label="Clases"
              value={attendance?.summary.courses ?? 0}
            />
            <AttendanceSummary
              label="Ingresos"
              value={attendance?.summary.institutionalEntries ?? 0}
            />
          </section>

          {attendance?.records.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">Objetivo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Dispositivo</th>
                    <th className="px-4 py-3">Presencia BLE</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {attendance.records.slice(0, 20).map((record) => (
                    <AttendanceRow key={record.id} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              Todavía no existen marcaciones móviles registradas.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Sincronizar y autorizar móvil"
          description="Seleccione al docente. El QR vincula y autoriza automáticamente el celular que lo escanee desde esa cuenta."
        />
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Select
            label="Docente"
            value={teacherId}
            onChange={(event) =>
              setTeacherId(event.target.value)
            }
            placeholder="Seleccione un docente"
          >
            {availableTeachers.map((teacher) => (
              <option
                key={teacher.teacherId}
                value={String(teacher.teacherId)}
              >
                {teacher.surnames}, {teacher.names} · {teacher.code} · {teacher.deviceState ?? "SIN MÓVIL"}
              </option>
            ))}
          </Select>

          <Button
            type="button"
            variant="primary"
            onClick={() => void handleGenerateQr()}
            loading={operation === "generating"}
            loadingText="Generando QR"
            disabled={availableTeachers.length === 0}
          >
            Generar QR de sincronización
          </Button>

          <p className="text-xs font-semibold leading-5 text-slate-500 lg:col-span-2">
            El docente debe abrir la aplicación, pulsar “Sincronizar con la página” y escanear el QR. Si existe otro celular autorizado o suspendido, revóquelo antes de reemplazarlo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Celulares registrados"
          description="Cada docente puede mantener un solo dispositivo pendiente, autorizado o suspendido."
          action={
            <StatusBadge
              status="registrado"
              label={`${dashboard.devices.length} registro(s)`}
              tone="info"
            />
          }
        />
        <CardContent className="space-y-4">
          {dashboard.devices.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              Todavía no existen celulares registrados.
            </p>
          ) : (
            dashboard.devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                operation={operation}
                onTransition={handleTransition}
              />
            ))
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Solicitudes recientes"
            description="Códigos generados y utilizados."
          />
          <CardContent className="space-y-3">
            {dashboard.requests.slice(0, 10).map(
              (request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-extrabold text-slate-800">
                      {request.names} {request.surnames}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {request.teacherCode} · vence{" "}
                      {formatDate(request.expiresAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={request.state}
                    tone={
                      request.state === "VIGENTE"
                        ? "warning"
                        : request.state === "UTILIZADA"
                          ? "success"
                          : "neutral"
                    }
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Eventos de seguridad"
            description="Últimas acciones relacionadas con dispositivos móviles."
          />
          <CardContent className="space-y-3">
            {dashboard.events.slice(0, 10).map(
              (event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-slate-800">
                      {event.type.replaceAll("_", " ")}
                    </p>
                    <StatusBadge
                      status={event.result}
                      tone={
                        event.result === "EXITO"
                          ? "success"
                          : "warning"
                      }
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {event.teacher || "Sin docente"} ·{" "}
                    {event.actor} ·{" "}
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </section>

      <MobileLinkQrModal
        open={qrOpen}
        link={generatedLink}
        onClose={() => setQrOpen(false)}
        onCancel={handleCancelQr}
        cancelling={operation === "cancelling"}
      />
      </div>
    </DashboardLayout>
  );
}

function AttendanceSummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AttendanceRow({
  record,
}: {
  record: MobileAttendanceRecord;
}) {
  const status = record.courseState ?? record.entryState ?? record.result;
  const objective = record.courseName
    ? `${record.courseCode ?? "Curso"} · ${record.courseName}`
    : "Ingreso institucional";

  return (
    <tr>
      <td className="px-4 py-4">
        <p className="font-extrabold text-slate-800">
          {record.names} {record.surnames}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {record.teacherCode} · {record.department ?? "Sin carrera"}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="font-bold text-slate-700">{objective}</p>
        {record.classroom && (
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Aula {record.classroom}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <StatusBadge
          status={status}
          label={status}
          tone={
            record.result === "DUPLICADA"
              ? "warning"
              : record.result === "REGISTRADA"
                ? "success"
                : "danger"
          }
        />
      </td>
      <td className="px-4 py-4 font-semibold text-slate-600">
        {record.manufacturer} {record.model}
      </td>
      <td className="px-4 py-4">
        {record.bleValidated ? (
          <div className="space-y-1">
            <StatusBadge
              status="ble-validada"
              label="Validada"
              tone="success"
            />
            <p className="text-xs font-bold text-slate-600">
              {record.bleStationCode ?? "Estación"} ·{" "}
              {record.bleStationRssi?.toFixed(1) ?? "—"} dBm
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              {record.bleStationName ?? "Estación institucional"} ·{" "}
              {record.bleStationSamples ?? 0} muestras
            </p>
          </div>
        ) : (
          <StatusBadge
            status={record.bleRequired ? "ble-requerida" : "ble-no-requerida"}
            label={record.bleRequired ? "No validada" : "No requerida"}
            tone={record.bleRequired ? "danger" : "neutral"}
          />
        )}
      </td>
      <td className="px-4 py-4">
        {record.verificationMethod === "QR_DINAMICO" ? (
          <StatusBadge
            status="qr-dinamico"
            label="QR dinámico"
            tone="info"
          />
        ) : (
          <StatusBadge
            status={record.signatureVerified ? "verificada" : "inválida"}
            label={record.signatureVerified ? "Biometría verificada" : "Firma inválida"}
            tone={record.signatureVerified ? "success" : "danger"}
          />
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-500">
        {formatDate(record.createdAt)}
      </td>
    </tr>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-unsaac-text">
        {value}
      </p>
    </div>
  );
}

function DeviceRow({
  device,
  operation,
  onTransition,
}: {
  device: MobileDevice;
  operation: string | null;
  onTransition: (
    device: MobileDevice,
    action:
      | "aprobar"
      | "rechazar"
      | "suspender"
      | "reactivar"
      | "revocar"
  ) => void | Promise<void>;
}) {
  const busy = operation?.endsWith(
    `-${device.id}`
  );

  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-extrabold text-slate-900">
              {deviceName(device)}
            </h3>
            <StatusBadge
              status={device.state}
              tone={STATE_TONES[device.state]}
              size="md"
            />
          </div>

          <p className="mt-2 font-bold text-slate-700">
            {device.names} {device.surnames} ·{" "}
            {device.teacherCode}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Android {device.systemVersion} · SDK{" "}
            {device.sdkInt} · app {device.appVersion}
          </p>

          <p className="mt-1 break-all text-xs font-semibold text-slate-400">
            Clave de vinculación: {device.keyFingerprint}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={
                device.attendanceKeyFingerprint
                  ? "firma-preparada"
                  : "firma-pendiente"
              }
              label={
                device.attendanceKeyFingerprint
                  ? "Firma biométrica preparada"
                  : "Firma biométrica pendiente"
              }
              tone={device.attendanceKeyFingerprint ? "success" : "warning"}
            />
            {device.attendanceKeyRegisteredAt && (
              <span className="text-xs font-semibold text-slate-500">
                {formatDate(device.attendanceKeyRegisteredAt)}
              </span>
            )}
          </div>

          {device.stateReason && (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Motivo: {device.stateReason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {device.state === "PENDIENTE" && (
            <>
              <Button
                type="button"
                size="sm"
                variant="success"
                loading={busy}
                onClick={() =>
                  void onTransition(
                    device,
                    "aprobar"
                  )
                }
              >
                Aprobar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() =>
                  void onTransition(
                    device,
                    "rechazar"
                  )
                }
              >
                Rechazar
              </Button>
            </>
          )}

          {device.state === "AUTORIZADO" && (
            <Button
              type="button"
              size="sm"
              variant="warning"
              loading={busy}
              onClick={() =>
                void onTransition(
                  device,
                  "suspender"
                )
              }
            >
              Suspender
            </Button>
          )}

          {device.state === "SUSPENDIDO" && (
            <Button
              type="button"
              size="sm"
              variant="success"
              loading={busy}
              onClick={() =>
                void onTransition(
                  device,
                  "reactivar"
                )
              }
            >
              Reactivar
            </Button>
          )}

          {device.state !== "REVOCADO" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void onTransition(
                  device,
                  "revocar"
                )
              }
            >
              Revocar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
