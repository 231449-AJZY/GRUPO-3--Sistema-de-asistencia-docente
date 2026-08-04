"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import {
  fetchDateRangeExport,
  fetchReportCatalogs,
  ReportApiError,
} from "@/lib/supervisor/reportes/api";
import {
  clearSession,
  getToken,
} from "@/lib/auth";
import type {
  DateRangeExportResponse,
  DateRangeReportFilters,
  ReportCatalogsResponse,
  ReportRecentRecord,
} from "@/types/supervisor-reportes";

import styles from "./page.module.css";

type ReportType =
  | "asistencia"
  | "inasistencias"
  | "docente"
  | "curso"
  | "departamento"
  | "rango";

type OutputFormat = "pdf" | "excel" | "csv";

type PeriodPreset = "hoy" | "7dias" | "mes" | "personalizado";

interface ExportSummary {
  total: number;
  registered: number;
  duplicated: number;
  rejected: number;
  punctual: number;
  present: number;
  late: number;
  absent: number;
  attendance: number;
  complianceRate: number;
  punctualityRate: number;
  teachers: number;
  courses: number;
}

const REPORT_LABELS: Record<ReportType, string> = {
  asistencia: "Reporte de asistencia",
  inasistencias: "Reporte de inasistencias",
  docente: "Reporte por docente",
  curso: "Reporte por curso",
  departamento: "Reporte por departamento",
  rango: "Reporte por rango de fechas",
};

const FORMAT_LABELS: Record<OutputFormat, string> = {
  pdf: "PDF institucional",
  excel: "Excel compatible",
  csv: "CSV UTF-8",
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthStart(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function formatDate(value?: string | null): string {
  const clean = String(value ?? "").slice(0, 10);
  const [year, month, day] = clean.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function formatTime(value?: string | null): string {
  return String(value ?? "").slice(0, 5) || "—";
}

function normalize(value?: string | null): string {
  return String(value ?? "").trim().toUpperCase();
}

function statusLabel(value?: string | null): string {
  const status = normalize(value);

  if (status === "PUNTUAL") return "Puntual";
  if (status === "PRESENTE") return "Presente";
  if (status === "TARDANZA") return "Tardanza";
  if (["AUSENTE", "INASISTENCIA", "FALTA"].includes(status)) {
    return "Inasistencia";
  }

  return value || "Sin estado";
}

function methodLabel(value?: string | null, bleValidated = false): string {
  const method = normalize(value);

  if (method === "QR_DINAMICO") return "QR dinámico";
  if (method === "BIOMETRIA_MOVIL") {
    return bleValidated ? "Biometría + BLE" : "Biometría móvil";
  }
  if (method === "OFFLINE_SINCRONIZADO") return "Offline sincronizado";
  if (method === "LECTOR_BIOMETRICO") return "Lector biométrico";
  if (method === "MANUAL") return "Manual";

  return value || "No informado";
}

function resultLabel(value?: string | null): string {
  const result = normalize(value);
  if (result === "REGISTRADA") return "Registrada";
  if (result === "DUPLICADA") return "Duplicada";
  if (result === "RECHAZADA") return "Rechazada";
  return value || "Sin resultado";
}

function csvCell(value: unknown): string {
  const clean = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${clean.replace(/"/g, '""')}"`;
}

function htmlCell(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSummary(payload: DateRangeExportResponse | null): ExportSummary {
  const raw = payload?.summary ?? {};
  const numberValue = (key: string) => Number(raw[key] ?? 0) || 0;
  const punctual = numberValue("punctual");
  const present = numberValue("present");
  const late = numberValue("late");
  const absent = numberValue("absent");
  const attendance = punctual + present + late;
  const evaluated = attendance + absent;
  const records = payload?.records ?? [];

  return {
    total: numberValue("total") || records.length,
    registered: numberValue("registered"),
    duplicated: numberValue("duplicated"),
    rejected: numberValue("rejected"),
    punctual,
    present,
    late,
    absent,
    attendance,
    complianceRate:
      evaluated > 0 ? Math.round((attendance / evaluated) * 1000) / 10 : 0,
    punctualityRate:
      attendance > 0
        ? Math.round(((punctual + present) / attendance) * 1000) / 10
        : 0,
    teachers: new Set(records.map((record) => record.teacherId)).size,
    courses: new Set(
      records.map((record) => record.courseCode).filter(Boolean)
    ).size,
  };
}

function defaultFilters(): DateRangeReportFilters {
  const now = new Date();
  return {
    dateFrom: monthStart(now),
    dateTo: toIsoDate(now),
    teacherId: "",
    courseCode: "",
    department: "",
    status: "",
    method: "",
    type: "",
    result: "",
  };
}

export default function ExportCenterPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const initialLoadRef = useRef(false);

  const [reportType, setReportType] =
    useState<ReportType>("asistencia");
  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("pdf");
  const [periodPreset, setPeriodPreset] =
    useState<PeriodPreset>("mes");
  const [filters, setFilters] =
    useState<DateRangeReportFilters>(defaultFilters);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [observations, setObservations] = useState(
    "Documento emitido desde el Sistema de Control de Asistencia Docente UNSAAC."
  );

  const [catalogs, setCatalogs] =
    useState<ReportCatalogsResponse | null>(null);
  const [payload, setPayload] =
    useState<DateRangeExportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [exporting, setExporting] = useState(false);

  const onUnauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!token) {
      setCatalogsLoading(false);
      return;
    }

    const controller = new AbortController();

    void fetchReportCatalogs(token, controller.signal)
      .then(setCatalogs)
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;

        if (caught instanceof ReportApiError && caught.status === 401) {
          onUnauthorized();
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudieron cargar los catálogos del centro de exportación."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogsLoading(false);
      });

    return () => controller.abort();
  }, [onUnauthorized, token]);

  const effectiveFilters = useCallback((): DateRangeReportFilters => {
    const next = { ...filters };

    if (reportType === "inasistencias") {
      next.status = "AUSENTE";
    }

    return next;
  }, [filters, reportType]);

  const validateConfiguration = useCallback((): string | null => {
    if (!filters.dateFrom || !filters.dateTo) {
      return "Selecciona la fecha inicial y final.";
    }

    if (filters.dateFrom > filters.dateTo) {
      return "La fecha inicial no puede ser posterior a la fecha final.";
    }

    if (reportType === "docente" && !filters.teacherId) {
      return "Selecciona un docente para preparar este reporte.";
    }

    if (reportType === "curso" && !filters.courseCode) {
      return "Selecciona un curso para preparar este reporte.";
    }

    if (reportType === "departamento" && !filters.department) {
      return "Selecciona un departamento para preparar este reporte.";
    }

    return null;
  }, [filters, reportType]);

  const generatePreview = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const validation = validateConfiguration();
    if (validation) {
      setError(validation);
      setLoading(false);
      return;
    }

    if (payload) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const queryFilters = effectiveFilters();
      const data = await fetchDateRangeExport(token, queryFilters);
      setPayload(data);
      setPreviewKey(JSON.stringify(queryFilters));
      setLastGenerated(new Date());
    }
    catch (caught: unknown) {
      if (caught instanceof ReportApiError && caught.status === 401) {
        onUnauthorized();
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo preparar la vista previa del reporte."
      );
    }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveFilters, onUnauthorized, payload, token, validateConfiguration]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void generatePreview();
  }, [generatePreview]);

  const summary = useMemo(() => buildSummary(payload), [payload]);
  const records = payload?.records ?? [];
  const previewRecords = records.slice(0, 8);
  const printRecords = records.slice(0, 50);

  const selectedTeacher = catalogs?.teachers.find(
    (teacher) => String(teacher.id) === filters.teacherId
  );
  const selectedCourse = catalogs?.courses.find(
    (course) => course.codigo === filters.courseCode
  );
  const selectedDepartment = catalogs?.departments.find(
    (department) => department.nombre === filters.department
  );

  const reportSubtitle = useMemo(() => {
    if (reportType === "docente") {
      return selectedTeacher?.nombre ?? "Docente pendiente de selección";
    }
    if (reportType === "curso") {
      return selectedCourse
        ? `${selectedCourse.codigo} · ${selectedCourse.nombre}`
        : "Curso pendiente de selección";
    }
    if (reportType === "departamento") {
      return selectedDepartment?.nombre ?? "Departamento pendiente de selección";
    }

    return `${formatDate(filters.dateFrom)} al ${formatDate(filters.dateTo)}`;
  }, [
    filters.dateFrom,
    filters.dateTo,
    reportType,
    selectedCourse,
    selectedDepartment,
    selectedTeacher,
  ]);

  function applyPreset(preset: PeriodPreset) {
    const now = new Date();
    setPeriodPreset(preset);

    if (preset === "hoy") {
      const today = toIsoDate(now);
      setFilters((current) => ({
        ...current,
        dateFrom: today,
        dateTo: today,
      }));
    }
    else if (preset === "7dias") {
      setFilters((current) => ({
        ...current,
        dateFrom: toIsoDate(shiftDays(now, -6)),
        dateTo: toIsoDate(now),
      }));
    }
    else if (preset === "mes") {
      setFilters((current) => ({
        ...current,
        dateFrom: monthStart(now),
        dateTo: toIsoDate(now),
      }));
    }
  }

  function buildFilename(extension: string): string {
    const safeType = reportType.replace(/[^a-z0-9-]/gi, "-");
    return `UNSAAC-${safeType}-${filters.dateFrom}-${filters.dateTo}.${extension}`;
  }

  function buildCsv(source: DateRangeExportResponse): string {
    const sourceSummary = buildSummary(source);
    const sourceRecords = source.records ?? [];
    const metadata = [
      ["Universidad", "Universidad Nacional de San Antonio Abad del Cusco"],
      ["Reporte", REPORT_LABELS[reportType]],
      ["Detalle", reportSubtitle],
      ["Periodo", `${formatDate(filters.dateFrom)} al ${formatDate(filters.dateTo)}`],
      ["Generado", new Date().toLocaleString("es-PE")],
      ["Registros", sourceSummary.total],
      [],
    ];

    const header = [
      "Código docente",
      "Docente",
      "Departamento",
      "Tipo",
      "Curso",
      "Aula",
      "Fecha",
      "Hora",
      "Estado",
      "Resultado",
      "Método",
      "Firma verificada",
      "BLE validado",
    ];

    const rows = sourceRecords.map((record) => [
      record.teacherCode,
      record.teacher,
      record.department,
      record.type,
      record.courseCode
        ? `${record.courseCode} · ${record.course ?? ""}`
        : record.course,
      record.classroom,
      formatDate(record.date),
      formatTime(record.time),
      statusLabel(record.status),
      resultLabel(record.result),
      methodLabel(record.method, Boolean(record.bleValidated)),
      record.signatureVerified ? "Sí" : "No",
      record.bleValidated ? "Sí" : "No",
    ]);

    return [
      ...metadata.map((row) => row.map(csvCell).join(";")),
      header.map(csvCell).join(";"),
      ...rows.map((row) => row.map(csvCell).join(";")),
    ].join("\r\n");
  }

  function downloadCsv(source: DateRangeExportResponse) {
    saveBlob(
      new Blob(["\ufeff", buildCsv(source)], {
        type: "text/csv;charset=utf-8",
      }),
      buildFilename("csv")
    );
  }

  function downloadExcel(source: DateRangeExportResponse) {
    const sourceSummary = buildSummary(source);
    const sourceRecords = source.records ?? [];
    const summaryRows = includeSummary
      ? `
        <table class="summary">
          <tr><th>Registros</th><th>Asistencias</th><th>Tardanzas</th><th>Inasistencias</th><th>Cumplimiento</th></tr>
          <tr><td>${sourceSummary.total}</td><td>${sourceSummary.attendance}</td><td>${sourceSummary.late}</td><td>${sourceSummary.absent}</td><td>${sourceSummary.complianceRate}%</td></tr>
        </table>`
      : "";

    const recordRows = sourceRecords
      .map(
        (record) => `
          <tr>
            <td>${htmlCell(record.teacherCode)}</td>
            <td>${htmlCell(record.teacher)}</td>
            <td>${htmlCell(record.department)}</td>
            <td>${htmlCell(record.type)}</td>
            <td>${htmlCell(record.courseCode)}</td>
            <td>${htmlCell(record.course)}</td>
            <td>${htmlCell(record.classroom)}</td>
            <td>${htmlCell(formatDate(record.date))}</td>
            <td>${htmlCell(formatTime(record.time))}</td>
            <td>${htmlCell(statusLabel(record.status))}</td>
            <td>${htmlCell(resultLabel(record.result))}</td>
            <td>${htmlCell(methodLabel(record.method, Boolean(record.bleValidated)))}</td>
          </tr>`
      )
      .join("");

    const signatureRows = includeSignatures
      ? `<div class="signatures"><span>Supervisor responsable</span><span>Validación institucional</span></div>`
      : "";

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #10243e; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h2 { font-size: 15px; color: #4e6480; font-weight: normal; margin-top: 0; }
            .meta, .summary, .records { border-collapse: collapse; width: 100%; margin-top: 18px; }
            th, td { border: 1px solid #cbd8e6; padding: 8px; font-size: 11px; }
            th { background: #eaf1f8; font-weight: bold; }
            .signatures { display: flex; justify-content: space-around; margin-top: 55px; }
            .signatures span { border-top: 1px solid #334b68; padding-top: 8px; width: 220px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Universidad Nacional de San Antonio Abad del Cusco</h1>
          <h2>${htmlCell(REPORT_LABELS[reportType])} · ${htmlCell(reportSubtitle)}</h2>
          <p>Periodo: ${htmlCell(formatDate(filters.dateFrom))} al ${htmlCell(formatDate(filters.dateTo))}</p>
          <p>${htmlCell(observations)}</p>
          ${summaryRows}
          <table class="records">
            <thead>
              <tr>
                <th>Código</th><th>Docente</th><th>Departamento</th><th>Tipo</th>
                <th>Código curso</th><th>Curso</th><th>Aula</th><th>Fecha</th>
                <th>Hora</th><th>Estado</th><th>Resultado</th><th>Método</th>
              </tr>
            </thead>
            <tbody>${recordRows}</tbody>
          </table>
          ${signatureRows}
        </body>
      </html>`;

    saveBlob(
      new Blob(["\ufeff", html], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      buildFilename("xls")
    );
  }

  function printPdf() {
    const previousTitle = document.title;
    document.title = buildFilename("pdf").replace(/\.pdf$/i, "");
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 250);
  }

  async function exportSelected(format = outputFormat) {
    const validation = validateConfiguration();
    if (validation) {
      setError(validation);
      return;
    }

    setExporting(true);

    try {
      const queryFilters = effectiveFilters();
      const queryKey = JSON.stringify(queryFilters);
      let currentPayload = payload;

      if (!currentPayload || previewKey !== queryKey) {
        if (!token) return;
        currentPayload = await fetchDateRangeExport(token, queryFilters);
        setPayload(currentPayload);
        setPreviewKey(queryKey);
        setLastGenerated(new Date());
      }

      if (format === "excel") downloadExcel(currentPayload);
      if (format === "csv") downloadCsv(currentPayload);
      if (format === "pdf") {
        window.setTimeout(printPdf, 120);
      }
    }
    finally {
      setExporting(false);
    }
  }

  if (loading && !payload) {
    return (
      <LoadingState
        title="Preparando el centro de exportación"
        description="Cargando catálogos, registros institucionales y vista previa documental."
        fullHeight
      />
    );
  }

  if (error && !payload) {
    return (
      <ErrorState
        title="No se pudo abrir el centro de exportación"
        description={error}
        retryText="Reintentar"
        onRetry={() => void generatePreview()}
        fullHeight
      />
    );
  }

  const chartMaximum = Math.max(
    summary.punctual + summary.present,
    summary.late,
    summary.absent,
    summary.rejected,
    1
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Salida documental"
        title="Centro de exportación"
        description="Configura el contenido, revisa el documento institucional y descarga la información real en PDF, Excel compatible o CSV UTF-8."
        badge={
          <span className={styles.readyBadge}>
            <span />
            Sistema listo
          </span>
        }
        actions={
          <div className={styles.headerActions}>
            <Link href="/supervisor/reportes" className={styles.secondaryButton}>
              Volver a reportes
            </Link>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void generatePreview()}
              disabled={refreshing}
            >
              <ReportIcon name="refresh" />
              {refreshing ? "Actualizando…" : "Actualizar vista previa"}
            </button>
          </div>
        }
      />

      {error ? <div className={styles.inlineError}>{error}</div> : null}

      <section className={styles.topGrid} aria-label="Formatos de exportación">
        <button
          type="button"
          className={`${styles.formatCard} ${
            outputFormat === "pdf" ? styles.formatCardActive : ""
          }`}
          onClick={() => setOutputFormat("pdf")}
        >
          <span className={`${styles.formatIcon} ${styles.pdfIcon}`}>
            <ReportIcon name="exportacion" />
          </span>
          <span>
            <strong>PDF</strong>
            <small>Impresión institucional, archivo oficial y firmas.</small>
            <em>Alta compatibilidad</em>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.formatCard} ${
            outputFormat === "excel" ? styles.formatCardActive : ""
          }`}
          onClick={() => setOutputFormat("excel")}
        >
          <span className={`${styles.formatIcon} ${styles.excelIcon}`}>
            <ReportIcon name="database" />
          </span>
          <span>
            <strong>Excel</strong>
            <small>Tabla editable compatible con Excel y LibreOffice.</small>
            <em>Editable</em>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.formatCard} ${
            outputFormat === "csv" ? styles.formatCardActive : ""
          }`}
          onClick={() => setOutputFormat("csv")}
        >
          <span className={`${styles.formatIcon} ${styles.previewIcon}`}>
            <ReportIcon name="asistencia" />
          </span>
          <span>
            <strong>CSV UTF-8</strong>
            <small>Datos completos para análisis, auditoría e integración.</small>
            <em>Datos completos</em>
          </span>
        </button>

        <article className={styles.statusCard}>
          <div>
            <strong>Estado de exportación</strong>
            <span className={styles.systemReady}>
              <i /> Sistema listo
            </span>
          </div>
          <p>
            Último reporte: {lastGenerated
              ? lastGenerated.toLocaleString("es-PE")
              : "pendiente"}.
          </p>
          <p>
            Formato seleccionado: {FORMAT_LABELS[outputFormat]}. Registros preparados: {summary.total.toLocaleString("es-PE")}.
          </p>
        </article>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.configurationCard}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>Configuración de exportación</h2>
              <p>Define el reporte, periodo y componentes incluidos.</p>
            </div>
            <span>{payload?.truncated ? `Límite ${payload.maxRows}` : "Datos completos"}</span>
          </header>

          <div className={styles.formGrid}>
            <label>
              <span>Tipo de reporte</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
              >
                {Object.entries(REPORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Formato de salida</span>
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
              >
                <option value="pdf">PDF mediante impresión</option>
                <option value="excel">Excel compatible (.xls)</option>
                <option value="csv">CSV UTF-8 (.csv)</option>
              </select>
            </label>
          </div>

          <div className={styles.presetRow}>
            <span>Periodo rápido</span>
            {([
              ["hoy", "Hoy"],
              ["7dias", "Últimos 7 días"],
              ["mes", "Mes actual"],
              ["personalizado", "Personalizado"],
            ] as Array<[PeriodPreset, string]>).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={periodPreset === value ? styles.presetActive : ""}
                onClick={() => applyPreset(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Fecha inicial</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => {
                  setPeriodPreset("personalizado");
                  setFilters((current) => ({ ...current, dateFrom: event.target.value }));
                }}
              />
            </label>
            <label>
              <span>Fecha final</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => {
                  setPeriodPreset("personalizado");
                  setFilters((current) => ({ ...current, dateTo: event.target.value }));
                }}
              />
            </label>
          </div>

          {reportType === "docente" ? (
            <label className={styles.fullField}>
              <span>Docente</span>
              <select
                value={filters.teacherId}
                disabled={catalogsLoading}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  teacherId: event.target.value,
                }))}
              >
                <option value="">Selecciona un docente</option>
                {catalogs?.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.codigo ? `${teacher.codigo} · ` : ""}{teacher.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {reportType === "curso" ? (
            <label className={styles.fullField}>
              <span>Curso</span>
              <select
                value={filters.courseCode}
                disabled={catalogsLoading}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  courseCode: event.target.value,
                }))}
              >
                <option value="">Selecciona un curso</option>
                {catalogs?.courses.map((course) => (
                  <option key={course.codigo} value={course.codigo}>
                    {course.codigo} · {course.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {reportType === "departamento" ? (
            <label className={styles.fullField}>
              <span>Departamento académico</span>
              <select
                value={filters.department}
                disabled={catalogsLoading}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  department: event.target.value,
                }))}
              >
                <option value="">Selecciona un departamento</option>
                {catalogs?.departments.map((department) => (
                  <option key={department.id} value={department.nombre}>
                    {department.codigo} · {department.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={styles.optionsTitle}>Opciones de contenido</div>

          <ToggleOption
            title="Incluir gráficos"
            description="Añade el gráfico resumido de asistencia, tardanzas e inasistencias."
            checked={includeCharts}
            onChange={setIncludeCharts}
          />
          <ToggleOption
            title="Incluir firmas"
            description="Reserva espacios para responsable y validación institucional."
            checked={includeSignatures}
            onChange={setIncludeSignatures}
          />
          <ToggleOption
            title="Incluir resumen estadístico"
            description="Muestra totales, porcentajes y cobertura del periodo."
            checked={includeSummary}
            onChange={setIncludeSummary}
          />

          <label className={styles.notesField}>
            <span>Observaciones de exportación</span>
            <textarea
              value={observations}
              rows={3}
              onChange={(event) => setObservations(event.target.value)}
            />
          </label>

          <div className={styles.actionGrid}>
            <button
              type="button"
              className={styles.pdfButton}
              onClick={() => void exportSelected("pdf")}
              disabled={exporting}
            >
              Exportar a PDF
            </button>
            <button
              type="button"
              className={styles.excelButton}
              onClick={() => void exportSelected("excel")}
              disabled={exporting}
            >
              Exportar a Excel
            </button>
            <button
              type="button"
              className={styles.downloadButton}
              onClick={() => void exportSelected()}
              disabled={exporting}
            >
              {exporting ? "Preparando…" : "Descargar reporte"}
            </button>
          </div>
        </article>

        <article className={styles.previewCard}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>Vista previa del documento</h2>
              <p>Representación institucional antes de exportar.</p>
            </div>
            <span>{FORMAT_LABELS[outputFormat]}</span>
          </header>

          <div className={styles.previewCanvas}>
            <div className={styles.printDocument}>
              <header className={styles.documentHeader}>
                <div className={styles.universityMark}>
                  <ReportIcon name="departamento" />
                </div>
                <div>
                  <h3>Universidad Nacional de San Antonio Abad del Cusco</h3>
                  <p>Sistema de Control de Asistencia Docente — UNSAAC</p>
                  <strong>{REPORT_LABELS[reportType]} · {reportSubtitle}</strong>
                </div>
              </header>

              {includeSummary ? (
                <section className={styles.documentSummary}>
                  <h4>Resumen del reporte</h4>
                  <p>
                    Registros: {summary.total.toLocaleString("es-PE")} · Asistencias: {summary.attendance.toLocaleString("es-PE")} · Tardanzas: {summary.late.toLocaleString("es-PE")} · Inasistencias: {summary.absent.toLocaleString("es-PE")} · Cumplimiento: {summary.complianceRate}%
                  </p>
                </section>
              ) : null}

              <div className={styles.documentInsights}>
                {includeCharts ? (
                  <section className={styles.miniChartCard}>
                    <h4>Gráfico resumido</h4>
                    <div className={styles.miniBars}>
                      <MiniBar label="P" value={summary.punctual + summary.present} max={chartMaximum} tone="green" />
                      <MiniBar label="T" value={summary.late} max={chartMaximum} tone="amber" />
                      <MiniBar label="I" value={summary.absent} max={chartMaximum} tone="red" />
                      <MiniBar label="R" value={summary.rejected} max={chartMaximum} tone="blue" />
                    </div>
                  </section>
                ) : null}

                <section className={styles.metadataCard}>
                  <h4>Metadatos</h4>
                  <p><b>Emitido por:</b> Supervisor académico</p>
                  <p><b>Fecha:</b> {new Date().toLocaleDateString("es-PE")}</p>
                  <p><b>Periodo:</b> {formatDate(filters.dateFrom)} – {formatDate(filters.dateTo)}</p>
                  <p><b>Formato:</b> {FORMAT_LABELS[outputFormat]}</p>
                </section>
              </div>

              <section className={styles.previewTableWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Docente</th>
                      <th>Curso / registro</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewRecords.length > 0 ? previewRecords : [null]).map(
                      (record, index) => record ? (
                        <tr key={`${record.id}-${index}`}>
                          <td>{record.teacher || "Docente no informado"}</td>
                          <td>{record.course || (normalize(record.type) === "CURSO" ? "Clase programada" : "Ingreso institucional")}</td>
                          <td>{formatDate(record.date)}</td>
                          <td>{formatTime(record.time)}</td>
                          <td>
                            <span className={`${styles.statusPill} ${styles[`status${normalize(record.status) || "OTHER"}`] ?? ""}`}>
                              {statusLabel(record.status)}
                            </span>
                          </td>
                        </tr>
                      ) : (
                        <tr key="empty">
                          <td colSpan={5}>No existen registros para los filtros seleccionados.</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </section>

              <section className={styles.printOnlyTable}>
                <h4>Detalle de registros</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Docente</th><th>Departamento</th><th>Curso</th><th>Fecha</th>
                      <th>Hora</th><th>Estado</th><th>Resultado</th><th>Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printRecords.map((record) => (
                      <tr key={`print-${record.id}`}>
                        <td>{record.teacher}</td>
                        <td>{record.department}</td>
                        <td>{record.courseCode ? `${record.courseCode} · ${record.course ?? ""}` : "Ingreso institucional"}</td>
                        <td>{formatDate(record.date)}</td>
                        <td>{formatTime(record.time)}</td>
                        <td>{statusLabel(record.status)}</td>
                        <td>{resultLabel(record.result)}</td>
                        <td>{methodLabel(record.method, Boolean(record.bleValidated))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {records.length > printRecords.length ? (
                  <p>El PDF presenta los primeros {printRecords.length} registros. El detalle completo está disponible en Excel o CSV.</p>
                ) : null}
              </section>

              <p className={styles.documentNotes}>{observations}</p>

              {includeSignatures ? (
                <footer className={styles.signatureGrid}>
                  <div><span />Supervisor responsable</div>
                  <div><span />Validación institucional</div>
                </footer>
              ) : null}
            </div>
          </div>

          <footer className={styles.previewFooter}>
            <span>
              {payload?.truncated
                ? `Vista limitada a ${payload.maxRows.toLocaleString("es-PE")} registros. Aplica filtros para completar el detalle.`
                : `${summary.total.toLocaleString("es-PE")} registros listos para exportar.`}
            </span>
            <button type="button" onClick={() => void generatePreview()} disabled={refreshing}>
              {refreshing ? "Actualizando…" : "Regenerar vista"}
            </button>
          </footer>
        </article>
      </section>
    </div>
  );
}

function ToggleOption({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleOption}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

function MiniBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const height = Math.max(8, Math.round((value / max) * 68));

  return (
    <span className={styles.miniBarItem} title={`${label}: ${value}`}>
      <i className={styles[`bar${tone}`]} style={{ height }} />
      <small>{label}</small>
    </span>
  );
}
