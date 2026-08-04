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
  getBiometricIntegrity,
  getBiometricReport,
} from "@/lib/services/biometria.service";
import {
  clearSession,
  getCurrentUser,
} from "@/lib/auth";

import type {
  BiometricIntegrityResponse,
  BiometricReportMetric,
  BiometricReportResponse,
} from "@/types/biometria";
import type { UsuarioActivo } from "@/types/usuario";

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
  return "No se pudo generar el reporte biométrico.";
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

function numberValue(
  value: number | string | null | undefined
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function csvEscape(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadReportCsv(
  report: BiometricReportResponse
) {
  const rows: unknown[][] = [
    ["REPORTE BIOMÉTRICO UNSAAC"],
    [
      "Rango",
      report.range.dateFrom,
      report.range.dateTo,
    ],
    ["Generado", report.generatedAt],
    [],
    ["RESUMEN", "VALOR"],
    ...Object.entries(report.summary).map(
      ([key, value]) => [
        humanize(key),
        value,
      ]
    ),
    [],
    ["RESULTADOS", "EVENTOS"],
    ...report.byResult.map((item) => [
      item.label,
      item.value,
    ]),
    [],
    ["TIPOS", "EVENTOS"],
    ...report.byType.map((item) => [
      item.label,
      item.value,
    ]),
    [],
    [
      "LECTOR",
      "CÓDIGO",
      "EVENTOS",
      "FALLIDOS",
    ],
    ...report.byDevice.map((item) => [
      item.label,
      item.code,
      item.value,
      item.failed,
    ]),
    [],
    [
      "DEPARTAMENTO",
      "EVENTOS",
      "DOCENTES",
    ],
    ...report.byDepartment.map((item) => [
      item.label,
      item.value,
      item.teachers,
    ]),
  ];

  const csv = rows
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
    `reporte-biometrico-${report.range.dateFrom}-${report.range.dateTo}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?:
    | "blue"
    | "green"
    | "amber"
    | "red"
    | "violet";
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber:
      "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    violet:
      "border-violet-200 bg-violet-50 text-violet-800",
  };

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.13em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold opacity-75">
        {detail}
      </p>
    </article>
  );
}

function MetricBars({
  items,
  emptyText,
}: {
  items: BiometricReportMetric[];
  emptyText: string;
}) {
  const maximum = Math.max(
    1,
    ...items.map((item) =>
      numberValue(item.value)
    )
  );

  if (items.length === 0) {
    return (
      <div className="p-10 text-center text-sm font-bold text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {items.map((item) => {
        const value = numberValue(
          item.value
        );
        const width = Math.max(
          3,
          (value / maximum) * 100
        );

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <span className="truncate text-xs font-black text-slate-700">
                {humanize(item.label)}
              </span>
              <strong className="text-xs font-black text-blue-700">
                {value}
              </strong>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{
                  width: `${width}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntegrityItem({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        ok
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong
            className={`block text-sm font-black ${
              ok
                ? "text-emerald-800"
                : "text-red-800"
            }`}
          >
            {label}
          </strong>
          <p
            className={`mt-1 text-xs font-semibold leading-5 ${
              ok
                ? "text-emerald-700"
                : "text-red-700"
            }`}
          >
            {detail}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            ok
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {ok ? "OK" : "REVISAR"}
        </span>
      </div>
    </article>
  );
}

export default function BiometricReportsPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo | null>(null);
  const [report, setReport] =
    useState<BiometricReportResponse | null>(
      null
    );
  const [integrity, setIntegrity] =
    useState<BiometricIntegrityResponse | null>(
      null
    );
  const [dateFrom, setDateFrom] =
    useState(daysAgo(30));
  const [dateTo, setDateTo] =
    useState(isoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

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

  const generate = useCallback(
    async (
      start: string,
      end: string,
      initial = false
    ) => {
      if (!start || !end) {
        setError(
          "Seleccione las fechas inicial y final."
        );
        return;
      }

      if (start > end) {
        setError(
          "La fecha inicial no puede ser posterior a la fecha final."
        );
        return;
      }

      if (initial) {
        setLoading(true);
      } else {
        setGenerating(true);
      }

      try {
        setError(null);
        const [nextReport, nextIntegrity] =
          await Promise.all([
            getBiometricReport(start, end),
            getBiometricIntegrity(),
          ]);
        setReport(nextReport);
        setIntegrity(nextIntegrity);
      } catch (requestError) {
        if (handleAuthError(requestError)) {
          return;
        }
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
        setGenerating(false);
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
    void generate(
      daysAgo(30),
      isoDate(new Date()),
      true
    );
  }, [generate, router]);

  const successRate = useMemo(() => {
    const total = numberValue(
      report?.summary.total_events
    );
    const success = numberValue(
      report?.summary.successful_events
    );

    return total > 0
      ? Math.round((success / total) * 100)
      : 0;
  }, [report]);

  const coverage = useMemo(() => {
    const templates = numberValue(
      report?.summary.enrolled_teachers
    );
    const involved = Math.max(
      numberValue(
        report?.summary.involved_teachers
      ),
      templates
    );

    return involved > 0
      ? Math.round(
          (templates / involved) * 100
        )
      : 0;
  }, [report]);

  const integrityOk =
    Boolean(integrity?.devices_table) &&
    Boolean(integrity?.events_table) &&
    Boolean(
      integrity?.synchronization_table
    ) &&
    Boolean(
      integrity?.templateKeyConfigured
    ) &&
    numberValue(
      integrity?.missing_hashes
    ) === 0 &&
    numberValue(
      integrity?.suspicious_raw_metadata
    ) === 0;

  if (!user || loading) {
    return <LoadingState />;
  }

  if (error && !report) {
    return (
      <DashboardLayout user={user}>
        <ErrorState
          title="No se pudo cargar la información biométrica"
          description={error}
          onRetry={() =>
            void generate(
              dateFrom,
              dateTo,
              true
            )
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6 print:space-y-4">
        <PageHeader
          eyebrow="Analítica biométrica real"
          title="Reportes biométricos"
          description="Indicadores de enrolamiento, eventos, lectores, sincronización e integridad sin exponer plantillas ni imágenes."
          actions={
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() =>
                  report &&
                  downloadReportCsv(report)
                }
                disabled={!report}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!report}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              >
                Imprimir / PDF
              </button>
            </div>
          }
        />

        <div className="print:hidden">
          <BiometriaSubNavigation />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <SectionCard
          title="Rango del reporte"
          description="Las fechas se procesan en PostgreSQL con la zona horaria institucional."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1.5">
              <span className="text-xs font-black text-slate-600">
                Fecha inicial
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(
                    event.target.value
                  )
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
                value={dateTo}
                onChange={(event) =>
                  setDateTo(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  void generate(
                    dateFrom,
                    dateTo
                  )
                }
                disabled={generating}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {generating
                  ? "Generando..."
                  : "Generar reporte"}
              </button>
            </div>
          </div>
        </SectionCard>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Eventos"
            value={
              report?.summary.total_events ??
              0
            }
            detail="En el rango seleccionado"
          />
          <SummaryCard
            label="Tasa de éxito"
            value={`${successRate}%`}
            detail={`${report?.summary.successful_events ?? 0} eventos exitosos`}
            tone="green"
          />
          <SummaryCard
            label="Plantillas activas"
            value={
              report?.summary
                .active_templates ?? 0
            }
            detail={`${coverage}% de cobertura observada`}
            tone="violet"
          />
          <SummaryCard
            label="Lectores conectados"
            value={
              report?.summary
                .connected_devices ?? 0
            }
            detail={`${report?.summary.total_devices ?? 0} lector(es) activos`}
            tone={
              (report?.summary
                .disconnected_devices ??
                0) > 0
                ? "amber"
                : "green"
            }
          />
          <SummaryCard
            label="Fallidos"
            value={
              report?.summary
                .failed_events ?? 0
            }
            detail="Eventos que requieren revisión"
            tone={
              (report?.summary
                .failed_events ??
                0) > 0
                ? "red"
                : "green"
            }
          />
          <SummaryCard
            label="Advertencias"
            value={
              report?.summary
                .warning_events ?? 0
            }
            detail="Alertas operativas"
            tone={
              (report?.summary
                .warning_events ??
                0) > 0
                ? "amber"
                : "green"
            }
          />
          <SummaryCard
            label="Sincronizaciones"
            value={
              report?.summary.total_jobs ??
              0
            }
            detail={`${report?.summary.synchronized_jobs ?? 0} verificadas`}
          />
          <SummaryCard
            label="Pendientes"
            value={
              report?.summary
                .pending_records ?? 0
            }
            detail="Reportados por lectores"
            tone={
              (report?.summary
                .pending_records ??
                0) > 0
                ? "amber"
                : "green"
            }
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Distribución por resultado"
            description="Eventos agrupados por resultado persistido."
            contentClassName="p-0"
          >
            <MetricBars
              items={
                report?.byResult ?? []
              }
              emptyText="No existen resultados en el rango."
            />
          </SectionCard>

          <SectionCard
            title="Tipos de evento"
            description="Operaciones biométricas más frecuentes."
            contentClassName="p-0"
          >
            <MetricBars
              items={report?.byType ?? []}
              emptyText="No existen tipos de evento en el rango."
            />
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Actividad por lector"
            description="Cantidad de eventos y fallos por dispositivo."
            contentClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      "Lector",
                      "Código",
                      "Eventos",
                      "Fallidos",
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
                <tbody className="divide-y divide-slate-100">
                  {(report?.byDevice ?? []).map(
                    (item) => (
                      <tr key={item.code}>
                        <td className="px-4 py-4 text-sm font-black text-slate-900">
                          {item.label}
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-blue-700">
                          {item.code}
                        </td>
                        <td className="px-4 py-4 text-center font-black">
                          {item.value}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-red-700">
                          {item.failed}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              {(report?.byDevice.length ??
                0) === 0 && (
                <div className="p-10 text-center text-sm font-bold text-slate-500">
                  No existen eventos asociados a
                  lectores.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Actividad por departamento"
            description="Eventos y docentes involucrados."
            contentClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      "Departamento",
                      "Eventos",
                      "Docentes",
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
                <tbody className="divide-y divide-slate-100">
                  {(
                    report?.byDepartment ??
                    []
                  ).map((item) => (
                    <tr key={item.label}>
                      <td className="px-4 py-4 text-sm font-black text-slate-900">
                        {item.label}
                      </td>
                      <td className="px-4 py-4 text-center font-black">
                        {item.value}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-blue-700">
                        {item.teachers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(report?.byDepartment
                .length ?? 0) === 0 && (
                <div className="p-10 text-center text-sm font-bold text-slate-500">
                  No existen eventos asociados a
                  departamentos.
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        <SectionCard
          title="Calidad de captura"
          description="Estadística calculada únicamente con eventos que informaron calidad."
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              label="Promedio"
              value={
                report?.quality.average ??
                "—"
              }
              detail="Escala 0–100"
              tone="blue"
            />
            <SummaryCard
              label="Mínima"
              value={
                report?.quality.minimum ??
                "—"
              }
              detail="Muestra observada"
              tone="amber"
            />
            <SummaryCard
              label="Máxima"
              value={
                report?.quality.maximum ??
                "—"
              }
              detail="Muestra observada"
              tone="green"
            />
            <SummaryCard
              label="Muestras"
              value={
                report?.quality.samples ??
                0
              }
              detail="Eventos con calidad"
              tone="violet"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Cierre e integridad"
          description="Comprobaciones estructurales y de seguridad del módulo biométrico administrativo."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <IntegrityItem
              label="Tablas biométricas"
              ok={
                Boolean(
                  integrity?.devices_table
                ) &&
                Boolean(
                  integrity?.events_table
                ) &&
                Boolean(
                  integrity?.synchronization_table
                )
              }
              detail="Dispositivos, eventos y sincronizaciones disponibles."
            />
            <IntegrityItem
              label="Clave de cifrado"
              ok={Boolean(
                integrity?.templateKeyConfigured
              )}
              detail="BIOMETRIC_TEMPLATE_KEY configurada para AES-256-GCM."
            />
            <IntegrityItem
              label="Hashes de plantilla"
              ok={
                numberValue(
                  integrity?.missing_hashes
                ) === 0
              }
              detail={`${integrity?.missing_hashes ?? 0} plantilla(s) activa(s) sin hash.`}
            />
            <IntegrityItem
              label="Imágenes crudas"
              ok={
                numberValue(
                  integrity?.suspicious_raw_metadata
                ) === 0 &&
                integrity?.storesRawImages ===
                  false
              }
              detail={`${integrity?.suspicious_raw_metadata ?? 0} metadato(s) sospechoso(s); almacenamiento declarado: bloqueado.`}
            />
            <IntegrityItem
              label="Módulos cerrados"
              ok={
                (integrity?.closedModules
                  .length ?? 0) >= 6
              }
              detail={
                integrity?.closedModules.join(
                  ", "
                ) ?? "Sin información"
              }
            />
            <IntegrityItem
              label="Estado integral"
              ok={integrityOk}
              detail={
                integrityOk
                  ? "El núcleo, captura, dispositivos, sincronización, historial y reportes están disponibles."
                  : "Existe al menos una comprobación que requiere revisión."
              }
            />
          </div>
        </SectionCard>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold leading-6 text-blue-900">
          {report?.methodology}
        </div>
      </div>
    </DashboardLayout>
  );
}
