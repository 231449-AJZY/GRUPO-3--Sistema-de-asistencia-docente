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
  getBiometricDevices,
  getBiometricHistory,
  getBiometricTeachers,
} from "@/lib/services/biometria.service";
import {
  clearSession,
  getCurrentUser,
} from "@/lib/auth";

import type {
  BiometricDevice,
  BiometricHistoryFilters,
  BiometricHistoryRecord,
  BiometricHistoryResponse,
  BiometricTeacher,
} from "@/types/biometria";
import type { UsuarioActivo } from "@/types/usuario";

const RESULT_LABELS = {
  TODOS: "Todos los resultados",
  EXITOSO: "Exitoso",
  FALLIDO: "Fallido",
  ADVERTENCIA: "Advertencia",
  REVOCADO: "Revocado",
} as const;

type ResultFilter = keyof typeof RESULT_LABELS;

const DEFAULT_HISTORY_FILTERS: BiometricHistoryFilters = {
  search: "",
  result: "",
  type: "",
  deviceId: null,
  teacherId: null,
  dateFrom: daysAgo(30),
  dateTo: isoDate(new Date()),
  page: 1,
  limit: 25,
};

const RESULT_CLASSES: Record<
  Exclude<ResultFilter, "TODOS">,
  string
> = {
  EXITOSO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  FALLIDO:
    "border-red-200 bg-red-50 text-red-700",
  ADVERTENCIA:
    "border-amber-200 bg-amber-50 text-amber-700",
  REVOCADO:
    "border-slate-300 bg-slate-100 text-slate-700",
};

function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    value.getDate()
  ).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return isoDate(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof BiometriaApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "No se pudo consultar el historial biométrico.";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Lima",
  }).format(date);
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function csvEscape(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(
  records: BiometricHistoryRecord[]
) {
  const headers = [
    "Fecha",
    "Tipo",
    "Resultado",
    "Docente",
    "Código docente",
    "Departamento",
    "Lector",
    "Código lector",
    "Calidad",
    "Ejecutado por",
    "Detalle",
  ];

  const rows = records.map((record) => [
    formatDateTime(record.creado_en),
    record.tipo,
    record.resultado,
    record.teacher ?? "",
    record.teacher_code ?? "",
    record.department ?? "",
    record.device_name ?? "",
    record.device_code ?? "",
    record.calidad ?? "",
    record.performed_by ?? "",
    record.detalle
      ? JSON.stringify(record.detalle)
      : "",
  ]);

  const csv = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row.map(csvEscape).join(",")
    )
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF", csv],
    {
      type: "text/csv;charset=utf-8",
    }
  );
  const url = URL.createObjectURL(blob);
  const anchor =
    document.createElement("a");
  anchor.href = url;
  anchor.download =
    `historial-biometrico-${isoDate(
      new Date()
    )}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "blue"
    | "green"
    | "amber"
    | "red"
    | "slate";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    slate:
      "border-slate-200 bg-slate-50 text-slate-800",
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
    </article>
  );
}

export default function BiometricHistoryPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo | null>(null);
  const [payload, setPayload] =
    useState<BiometricHistoryResponse | null>(
      null
    );
  const [devices, setDevices] =
    useState<BiometricDevice[]>([]);
  const [teachers, setTeachers] =
    useState<BiometricTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [consulting, setConsulting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const [draft, setDraft] =
    useState<BiometricHistoryFilters>({
      ...DEFAULT_HISTORY_FILTERS,
    });
  const [applied, setApplied] =
    useState<BiometricHistoryFilters>({
      ...DEFAULT_HISTORY_FILTERS,
    });

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

  const runQuery = useCallback(
    async (
      filters: BiometricHistoryFilters,
      initial = false
    ) => {
      if (
        filters.dateFrom &&
        filters.dateTo &&
        filters.dateFrom > filters.dateTo
      ) {
        setError(
          "La fecha inicial no puede ser posterior a la fecha final."
        );
        return;
      }

      if (initial) {
        setLoading(true);
      } else {
        setConsulting(true);
      }

      try {
        setError(null);
        const result =
          await getBiometricHistory(filters);
        setPayload(result);
        setApplied({ ...filters });
      } catch (requestError) {
        if (handleAuthError(requestError)) return;
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
        setConsulting(false);
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

    void Promise.all([
      getBiometricDevices(),
      getBiometricTeachers(),
    ])
      .then(
        ([
          deviceResult,
          teacherResult,
        ]) => {
          setDevices(deviceResult.devices);
          setTeachers(teacherResult.teachers);
        }
      )
      .catch((requestError) => {
        if (handleAuthError(requestError)) return;
        setError(errorMessage(requestError));
      });

    void runQuery(
      { ...DEFAULT_HISTORY_FILTERS },
      true
    );
  }, [
    handleAuthError,
    router,
    runQuery,
  ]);

  const types = useMemo(
    () =>
      Array.from(
        new Set(
          (payload?.records ?? []).map(
            (record) => record.tipo
          )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "es-PE")
      ),
    [payload]
  );

  async function changePage(page: number) {
    const next = {
      ...applied,
      page,
    };
    setDraft(next);
    await runQuery(next);
  }

  function clearFilters() {
    const next: BiometricHistoryFilters = {
      ...DEFAULT_HISTORY_FILTERS,
    };
    setDraft(next);
    void runQuery(next);
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
          onRetry={() =>
            void runQuery(draft, true)
          }
        />
      </DashboardLayout>
    );
  }

  const summary = payload?.summary;
  const pagination = payload?.pagination;

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Trazabilidad biométrica"
          title="Historial de eventos"
          description="Consulte capturas, diagnósticos, revocaciones y verificaciones de sincronización registradas realmente en PostgreSQL."
          actions={
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  payload?.records ?? []
                )
              }
              disabled={
                (payload?.records.length ?? 0) ===
                0
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
            >
              Exportar página CSV
            </button>
          }
        />

        <BiometriaSubNavigation />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryCard
            label="Total"
            value={summary?.total ?? 0}
            tone="blue"
          />
          <SummaryCard
            label="Exitosos"
            value={summary?.successful ?? 0}
            tone="green"
          />
          <SummaryCard
            label="Fallidos"
            value={summary?.failed ?? 0}
            tone="red"
          />
          <SummaryCard
            label="Advertencias"
            value={summary?.warnings ?? 0}
            tone="amber"
          />
          <SummaryCard
            label="Revocados"
            value={summary?.revoked ?? 0}
            tone="slate"
          />
          <SummaryCard
            label="Docentes"
            value={summary?.teachers ?? 0}
            tone="blue"
          />
          <SummaryCard
            label="Lectores"
            value={summary?.devices ?? 0}
            tone="blue"
          />
        </section>

        <SectionCard
          title="Filtros"
          description="Los filtros se aplican en el backend y conservan paginación real."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Búsqueda
              </span>
              <input
                type="search"
                value={draft.search ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    search:
                      event.target.value,
                    page: 1,
                  }))
                }
                placeholder="Docente, lector o tipo"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Resultado
              </span>
              <select
                value={draft.result ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    result:
                      event.target.value,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                {Object.entries(
                  RESULT_LABELS
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={
                      value === "TODOS"
                        ? ""
                        : value
                    }
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Tipo
              </span>
              <select
                value={draft.type ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type:
                      event.target.value,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                <option value="">
                  Todos los tipos
                </option>
                {types.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {humanize(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Lector
              </span>
              <select
                value={
                  draft.deviceId
                    ? String(draft.deviceId)
                    : ""
                }
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    deviceId:
                      event.target.value
                        ? Number(
                            event.target.value
                          )
                        : null,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                <option value="">
                  Todos los lectores
                </option>
                {devices.map((device) => (
                  <option
                    key={device.id}
                    value={device.id}
                  >
                    {device.codigo} ·{" "}
                    {device.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Docente
              </span>
              <select
                value={
                  draft.teacherId
                    ? String(draft.teacherId)
                    : ""
                }
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    teacherId:
                      event.target.value
                        ? Number(
                            event.target.value
                          )
                        : null,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                <option value="">
                  Todos los docentes
                </option>
                {teachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={teacher.id}
                  >
                    {teacher.codigo} ·{" "}
                    {teacher.nombres}{" "}
                    {teacher.apellidos}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Fecha inicial
              </span>
              <input
                type="date"
                value={draft.dateFrom ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateFrom:
                      event.target.value,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Fecha final
              </span>
              <input
                type="date"
                value={draft.dateTo ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateTo:
                      event.target.value,
                    page: 1,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={consulting}
                onClick={() =>
                  void runQuery({
                    ...draft,
                    page: 1,
                  })
                }
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {consulting
                  ? "Consultando..."
                  : "Consultar"}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Eventos biométricos"
          description="No contiene plantillas ni imágenes; únicamente trazabilidad operativa y administrativa."
          contentClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full border-collapse text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Tipo",
                    "Resultado",
                    "Docente",
                    "Lector",
                    "Calidad",
                    "Ejecutado por",
                    "Detalle",
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
                {(payload?.records ?? []).map(
                  (record) => (
                    <tr
                      key={record.id}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                        {formatDateTime(
                          record.creado_en
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-black text-slate-700">
                        {humanize(record.tipo)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${RESULT_CLASSES[record.resultado]}`}
                        >
                          {
                            RESULT_LABELS[
                              record.resultado
                            ]
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block text-sm font-black text-slate-900">
                          {record.teacher ??
                            "Sin docente"}
                        </strong>
                        <span className="text-xs font-bold text-blue-700">
                          {record.teacher_code ??
                            "—"}
                        </span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {record.department ??
                            "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block text-sm font-black text-slate-900">
                          {record.device_name ??
                            "Sin lector"}
                        </strong>
                        <span className="text-xs font-bold text-blue-700">
                          {record.device_code ??
                            "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-black text-slate-700">
                        {record.calidad ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                        {record.performed_by ??
                          "Sistema"}
                      </td>
                      <td className="max-w-[360px] px-4 py-4">
                        <details>
                          <summary className="cursor-pointer text-xs font-black text-blue-700">
                            Ver detalle
                          </summary>
                          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-[10px] leading-5 text-slate-100">
                            {record.detalle
                              ? JSON.stringify(
                                  record.detalle,
                                  null,
                                  2
                                )
                              : "Sin detalle adicional"}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {(payload?.records.length ?? 0) ===
            0 && (
            <div className="p-12 text-center text-sm font-bold text-slate-500">
              No existen eventos para los
              filtros seleccionados.
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <span className="text-xs font-bold text-slate-600">
              Página{" "}
              <strong>
                {pagination?.page ?? 1}
              </strong>{" "}
              de{" "}
              <strong>
                {pagination?.totalPages ?? 1}
              </strong>{" "}
              ·{" "}
              {pagination?.total ?? 0} evento(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  (pagination?.page ?? 1) <= 1 ||
                  consulting
                }
                onClick={() =>
                  void changePage(
                    (pagination?.page ?? 1) -
                      1
                  )
                }
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={
                  (pagination?.page ?? 1) >=
                    (pagination?.totalPages ??
                      1) ||
                  consulting
                }
                onClick={() =>
                  void changePage(
                    (pagination?.page ?? 1) +
                      1
                  )
                }
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </footer>
        </SectionCard>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-900">
          Seguridad confirmada: este historial
          no devuelve plantillas cifradas ni
          imágenes crudas.
        </div>
      </div>
    </DashboardLayout>
  );
}
