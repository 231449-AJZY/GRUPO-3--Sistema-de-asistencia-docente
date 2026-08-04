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
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import {
  BiometriaApiError,
  captureBiometricTemplate,
  getBiometricBridgeStatus,
  getBiometricTeachers,
  getRecentBiometricCaptures,
  saveBiometricEnrollment,
} from "@/lib/services/biometria.service";
import {
  clearSession,
  getCurrentUser,
} from "@/lib/auth";

import type {
  BiometricBridgeCapture,
  BiometricBridgeStatus,
  BiometricRecentCapture,
  BiometricTeacher,
} from "@/types/biometria";
import type {
  UsuarioActivo,
} from "@/types/usuario";

const FINGERS = [
  ["PULGAR_DERECHO", "Pulgar derecho"],
  ["INDICE_DERECHO", "Índice derecho"],
  ["MEDIO_DERECHO", "Medio derecho"],
  ["ANULAR_DERECHO", "Anular derecho"],
  ["MENIQUE_DERECHO", "Meñique derecho"],
  ["PULGAR_IZQUIERDO", "Pulgar izquierdo"],
  ["INDICE_IZQUIERDO", "Índice izquierdo"],
  ["MEDIO_IZQUIERDO", "Medio izquierdo"],
  ["ANULAR_IZQUIERDO", "Anular izquierdo"],
  ["MENIQUE_IZQUIERDO", "Meñique izquierdo"],
] as const;

type Stage =
  | "ready"
  | "capturing"
  | "review"
  | "saving"
  | "completed"
  | "error";

function errorMessage(error: unknown): string {
  if (error instanceof BiometriaApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "La operación biométrica no pudo completarse.";
}

function teacherName(teacher: BiometricTeacher): string {
  return `${teacher.nombres} ${teacher.apellidos}`.trim();
}

function qualityLabel(value: number): string {
  if (value >= 90) return "Excelente";
  if (value >= 75) return "Buena";
  if (value >= 60) return "Aceptable";
  return "Insuficiente";
}

function formatDateTime(value: string): string {
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

export default function BiometriaCapturaPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo | null>(null);
  const [teachers, setTeachers] =
    useState<BiometricTeacher[]>([]);
  const [recent, setRecent] =
    useState<BiometricRecentCapture[]>([]);
  const [bridge, setBridge] =
    useState<BiometricBridgeStatus | null>(
      null
    );
  const [selectedTeacherId, setSelectedTeacherId] =
    useState<number>(0);
  const [selectedFinger, setSelectedFinger] =
    useState<string>("INDICE_DERECHO");
  const [search, setSearch] = useState("");
  const [stage, setStage] =
    useState<Stage>("ready");
  const [pendingCapture, setPendingCapture] =
    useState<BiometricBridgeCapture | null>(
      null
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const loadBridge = useCallback(async () => {
    try {
      const status =
        await getBiometricBridgeStatus();
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [teacherPayload, recentPayload] =
        await Promise.all([
          getBiometricTeachers(),
          getRecentBiometricCaptures(12),
        ]);

      setTeachers(teacherPayload.teachers);
      setRecent(recentPayload.captures);

      setSelectedTeacherId((current) => {
        if (
          current &&
          teacherPayload.teachers.some(
            (teacher) => teacher.id === current
          )
        ) {
          return current;
        }

        return (
          teacherPayload.teachers[0]?.id ?? 0
        );
      });
    } catch (requestError) {
      const message = errorMessage(requestError);

      if (
        requestError instanceof BiometriaApiError &&
        requestError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const current = getCurrentUser();

    if (!current) {
      router.replace("/login");
      return;
    }

    if (current.rol !== "ADMINISTRADOR") {
      router.replace("/login");
      return;
    }

    setUser(current);
    void Promise.all([
      loadData(),
      loadBridge(),
    ]);
  }, [loadBridge, loadData, router]);

  useEffect(() => {
    const interval = window.setInterval(
      () => void loadBridge(),
      8000
    );

    return () =>
      window.clearInterval(interval);
  }, [loadBridge]);

  const selectedTeacher = useMemo(
    () =>
      teachers.find(
        (teacher) =>
          teacher.id === selectedTeacherId
      ) ?? null,
    [teachers, selectedTeacherId]
  );

  const filteredTeachers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return teachers;
    }

    return teachers.filter((teacher) => {
      const combined = [
        teacher.codigo,
        teacher.dni ?? "",
        teacher.nombres,
        teacher.apellidos,
        teacher.departamento ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return combined.includes(term);
    });
  }, [search, teachers]);


  const bridgeReady =
    Boolean(bridge?.online) &&
    Boolean(bridge?.adapterConfigured) &&
    Boolean(bridge?.adapterAvailable);

  function resetCapture() {
    setPendingCapture(null);
    setStage("ready");
    setError(null);
    setSuccess(null);
  }

  async function startCapture() {
    if (!selectedTeacher) {
      setError("Seleccione un docente.");
      return;
    }

    if (!bridgeReady) {
      setError(
        "El puente o el adaptador del lector no está disponible."
      );
      return;
    }

    try {
      setStage("capturing");
      setPendingCapture(null);
      setSuccess(null);
      setError(null);

      const capture =
        await captureBiometricTemplate(
          selectedFinger
        );

      if (capture.quality < 60) {
        setStage("error");
        setError(
          `Calidad insuficiente (${capture.quality}%). Repita la captura.`
        );
        return;
      }

      setPendingCapture(capture);
      setStage("review");
    } catch (requestError) {
      setStage("error");
      setError(errorMessage(requestError));
      await loadBridge();
    }
  }

  async function confirmEnrollment() {
    if (
      !selectedTeacher ||
      !pendingCapture
    ) {
      return;
    }

    try {
      setStage("saving");
      setError(null);

      await saveBiometricEnrollment({
        teacherId: selectedTeacher.id,
        finger: selectedFinger,
        templateBase64:
          pendingCapture.templateBase64,
        quality: pendingCapture.quality,
        sdkVersion:
          pendingCapture.sdkVersion ??
          undefined,
        device: pendingCapture.device,
        metadata: {
          ...pendingCapture.metadata,
          template_bytes:
            pendingCapture.templateBytes,
          bridge_template_sha256:
            pendingCapture.templateSha256,
          browser_storage: false,
        },
      });

      // La plantilla se elimina de la memoria del componente
      // inmediatamente después de guardarla.
      setPendingCapture(null);
      setStage("completed");
      setSuccess(
        `Huella registrada para ${teacherName(
          selectedTeacher
        )}.`
      );

      await loadData();
    } catch (requestError) {
      setStage("review");
      setError(errorMessage(requestError));
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

  return (
    <DashboardLayout user={user}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Control biométrico"
          title="Captura biométrica real"
          description="Capture una plantilla mediante el lector local, revise la calidad y regístrela cifrada en PostgreSQL."
          badge={
            <StatusBadge
              status={
                bridgeReady
                  ? "conectado"
                  : bridge?.online
                    ? "advertencia"
                    : "desconectado"
              }
              label={
                bridgeReady
                  ? "Lector disponible"
                  : bridge?.online
                    ? "SDK no configurado"
                    : "Puente desconectado"
              }
              size="md"
              showDot
            />
          }
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void Promise.all([
                  loadBridge(),
                  loadData(),
                ]);
              }}
            >
              Actualizar estado
            </Button>
          }
        />

        <BiometriaSubNavigation />

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <StatusCard
            title="Puente local"
            value={
              bridge?.online
                ? "Activo"
                : "Detenido"
            }
            description={
              bridge?.message ??
              bridge?.error ??
              "Sin respuesta del proceso local."
            }
            tone={
              bridge?.online
                ? "green"
                : "red"
            }
          />

          <StatusCard
            title="Adaptador SDK"
            value={
              bridge?.adapterConfigured
                ? bridge?.adapterAvailable
                  ? "Disponible"
                  : "No encontrado"
                : "No configurado"
            }
            description={
              bridge?.adapterCommand
                ? `Ejecutable: ${bridge.adapterCommand}`
                : "Configure el ejecutable que usa el SDK del fabricante."
            }
            tone={
              bridgeReady
                ? "green"
                : "orange"
            }
          />

          <StatusCard
            title="Protección"
            value="Solo plantilla"
            description="La imagen de la huella no se guarda ni se envía al sistema."
            tone="blue"
          />
        </section>

        {error && (
          <ErrorState
            title="No se pudo completar la operación"
            description={error}
            onRetry={() => {
              setError(null);
              void loadBridge();
            }}
          />
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
            {success}
          </div>
        )}

        {loading ? (
          <LoadingState
            title="Cargando datos biométricos"
            description="Consultando docentes y capturas reales."
          />
        ) : teachers.length === 0 ? (
          <EmptyState
            title="No existen docentes activos"
            description="Registre docentes antes de comenzar el enrolamiento biométrico."
            size="lg"
          />
        ) : (
          <section className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.25fr_0.85fr]">
            <SectionCard
              title="1. Seleccionar docente"
              description="Busque al docente que será enrolado."
            >
              <div className="space-y-4">
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Código, DNI, nombre o departamento"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                />

                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredTeachers.map(
                    (teacher) => {
                      const active =
                        teacher.id ===
                        selectedTeacherId;

                      return (
                        <button
                          key={teacher.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(
                              teacher.id
                            );
                            resetCapture();
                          }}
                          className={[
                            "w-full rounded-xl border p-4 text-left transition",
                            active
                              ? "border-unsaac-blue bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <p className="font-extrabold text-unsaac-text">
                            {teacherName(teacher)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-unsaac-blue">
                            {teacher.codigo}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span>
                              {teacher.departamento ??
                                "Sin departamento"}
                            </span>
                            <span>•</span>
                            <span>
                              {teacher.fingerprints}/10 huellas
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="2. Capturar plantilla"
              description="El navegador ordena la captura, pero el SDK se ejecuta exclusivamente en el puente local."
            >
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Docente seleccionado
                  </p>

                  <p className="mt-2 text-xl font-extrabold text-unsaac-text">
                    {selectedTeacher
                      ? teacherName(
                          selectedTeacher
                        )
                      : "Sin selección"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-unsaac-blue">
                    {selectedTeacher?.codigo}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-unsaac-text">
                    Dedo
                  </span>

                  <select
                    value={selectedFinger}
                    onChange={(event) => {
                      setSelectedFinger(
                        event.target.value
                      );
                      resetCapture();
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                  >
                    {FINGERS.map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <div
                  className={[
                    "flex min-h-[280px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center",
                    stage === "capturing"
                      ? "border-blue-300 bg-blue-50"
                      : stage === "review"
                        ? "border-emerald-300 bg-emerald-50"
                        : stage === "error"
                          ? "border-red-300 bg-red-50"
                          : "border-slate-300 bg-white",
                  ].join(" ")}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-unsaac-blue">
                    <FingerprintIcon />
                  </div>

                  <p className="mt-5 text-lg font-extrabold text-unsaac-text">
                    {stage === "capturing"
                      ? "Capturando desde el lector…"
                      : stage === "review"
                        ? "Plantilla lista para revisar"
                        : stage === "completed"
                          ? "Enrolamiento completado"
                          : "Coloque el dedo en el lector"}
                  </p>

                  <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-unsaac-muted">
                    {stage === "capturing"
                      ? "No retire el dedo hasta que el SDK termine."
                      : "La aplicación no muestra ni almacena una fotografía de la huella."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    loading={
                      stage === "capturing"
                    }
                    loadingText="Capturando"
                    disabled={
                      !selectedTeacher ||
                      !bridgeReady ||
                      stage === "saving"
                    }
                    onClick={startCapture}
                    className="flex-1"
                  >
                    Capturar huella
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      stage === "capturing" ||
                      stage === "saving"
                    }
                    onClick={resetCapture}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="3. Revisar y guardar"
              description="Confirme únicamente una captura con calidad suficiente."
            >
              {!pendingCapture ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
                    <ShieldIcon />
                  </span>

                  <p className="mt-4 font-extrabold text-unsaac-text">
                    Sin plantilla temporal
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-unsaac-muted">
                    Después de capturar aparecerán aquí la calidad, el lector y la versión del SDK.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <MetricRow
                    label="Calidad"
                    value={`${pendingCapture.quality}%`}
                    helper={qualityLabel(
                      pendingCapture.quality
                    )}
                    tone={
                      pendingCapture.quality >= 75
                        ? "green"
                        : "orange"
                    }
                  />

                  <MetricRow
                    label="Plantilla"
                    value={`${pendingCapture.templateBytes} bytes`}
                    helper="Solo datos matemáticos"
                    tone="blue"
                  />

                  <MetricRow
                    label="SDK"
                    value={
                      pendingCapture.sdkVersion ??
                      "No informado"
                    }
                    helper="Versión reportada"
                    tone="blue"
                  />

                  <MetricRow
                    label="Integridad"
                    value={pendingCapture.templateSha256.slice(
                      0,
                      12
                    )}
                    helper="SHA-256 temporal"
                    tone="green"
                  />

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-900">
                    La plantilla permanece únicamente en memoria hasta que pulse Guardar. Después se elimina del componente.
                  </div>

                  <Button
                    type="button"
                    loading={stage === "saving"}
                    loadingText="Cifrando y guardando"
                    disabled={
                      pendingCapture.quality < 60
                    }
                    onClick={confirmEnrollment}
                    className="w-full"
                  >
                    Guardar huella cifrada
                  </Button>
                </div>
              )}
            </SectionCard>
          </section>
        )}

        <SectionCard
          title="Enrolamientos recientes"
          description="Últimas plantillas guardadas realmente en PostgreSQL."
          contentClassName="p-0"
          action={
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-unsaac-blue">
              {recent.length} registro(s)
            </span>
          }
        >
          {recent.length ? (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      "Docente",
                      "Dedo",
                      "Calidad",
                      "Dispositivo",
                      "SDK",
                      "Fecha",
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {recent.map((capture) => (
                    <tr
                      key={capture.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm">
                        <p className="font-extrabold text-unsaac-text">
                          {capture.teacher}
                        </p>
                        <p className="mt-1 text-xs font-bold text-unsaac-blue">
                          {capture.teacher_code}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-unsaac-text">
                        {capture.finger.replaceAll(
                          "_",
                          " "
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-extrabold text-emerald-700">
                        {capture.quality ?? "—"}
                        {capture.quality !== null
                          ? "%"
                          : ""}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-unsaac-text">
                        {capture.device_code ??
                          "No informado"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-unsaac-text">
                        {capture.sdk_version ??
                          "No informado"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-unsaac-text">
                        {formatDateTime(
                          capture.enrolled_at
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Todavía no existen enrolamientos"
              description="Las huellas registradas mediante el puente aparecerán aquí."
            />
          )}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: "blue" | "green" | "orange" | "red";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    orange:
      "border-orange-200 bg-orange-50 text-orange-800",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <Card
      className={`border p-5 ${tones[tone]}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.1em] opacity-70">
        {title}
      </p>
      <p className="mt-3 text-2xl font-extrabold">
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 opacity-80">
        {description}
      </p>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange";
}) {
  const tones = {
    blue: "text-unsaac-blue",
    green: "text-emerald-700",
    orange: "text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-extrabold ${tones[tone]}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-unsaac-muted">
        {helper}
      </p>
    </div>
  );
}

function FingerprintIcon() {
  return (
    <svg
      width="62"
      height="62"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3a7 7 0 0 0-7 7c0 4.5-1 7-2 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 6a4 4 0 0 0-4 4c0 4-1 7-2 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 9a1 1 0 0 0-1 1c0 4-1 7-2 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 10c0 4-.5 7-1.5 10M18 10c0 4-.5 7-1 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
