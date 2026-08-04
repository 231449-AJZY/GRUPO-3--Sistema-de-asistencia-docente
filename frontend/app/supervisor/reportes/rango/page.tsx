"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import AttendanceDonut from "@/components/supervisor/reportes/asistencia/AttendanceDonut";
import AttendanceMetricCard from "@/components/supervisor/reportes/asistencia/AttendanceMetricCard";
import AttendanceTable from "@/components/supervisor/reportes/asistencia/AttendanceTable";
import AttendanceTrendChart from "@/components/supervisor/reportes/asistencia/AttendanceTrendChart";
import AttendanceWeekdayBars from "@/components/supervisor/reportes/asistencia/AttendanceWeekdayBars";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import {
  useDateRangeReport,
} from "@/hooks/supervisor/reportes/useDateRangeReport";
import {
  fetchDateRangeExport,
} from "@/lib/supervisor/reportes/api";
import {
  clearSession,
  getToken,
} from "@/lib/auth";
import type {
  DateRangeReportFilters,
  ReportRecentRecord,
} from "@/types/supervisor-reportes";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";

const WEEKDAY_NAMES: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
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

function defaultFilters(): DateRangeReportFilters {
  const now = new Date();

  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
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

function formatUpdatedAt(value: Date | null): string {
  if (!value) return "Pendiente";

  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatPeriod(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function inclusiveDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return 0;
  }

  return Math.max(
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    1
  );
}

function normalizeFilters(
  filters: DateRangeReportFilters
): DateRangeReportFilters {
  if (
    !filters.dateFrom ||
    !filters.dateTo ||
    filters.dateFrom <= filters.dateTo
  ) {
    return filters;
  }

  return {
    ...filters,
    dateFrom: filters.dateTo,
    dateTo: filters.dateFrom,
  };
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(
  records: ReportRecentRecord[],
  from: string,
  to: string
) {
  const header = [
    "Docente",
    "Código docente",
    "Departamento",
    "Tipo",
    "Curso",
    "Código curso",
    "Aula",
    "Fecha",
    "Hora",
    "Estado",
    "Resultado",
    "Método",
    "Fuente",
    "Firma verificada",
    "BLE validado",
  ];

  const rows = records.map((record) => [
    record.teacher,
    record.teacherCode,
    record.department,
    record.type,
    record.course || "Ingreso institucional",
    record.courseCode,
    record.classroom,
    record.date,
    record.time,
    record.status,
    record.result,
    record.method,
    record.source,
    record.signatureVerified ? "Sí" : "No",
    record.bleValidated ? "Sí" : "No",
  ]);

  const content = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-rango-${from}-a-${to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function DateRangeReportPage() {
  const router = useRouter();
  const initialFilters = useMemo(defaultFilters, []);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 15;
  const token = getToken();

  const handleUnauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  const {
    data,
    catalogs,
    loading,
    refreshing,
    catalogsLoading,
    error,
    lastUpdated,
    reload,
  } = useDateRangeReport({
    token,
    filters: appliedFilters,
    page,
    pageSize,
    onUnauthorized: handleUnauthorized,
  });

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const rangeDays = inclusiveDays(
    appliedFilters.dateFrom,
    appliedFilters.dateTo
  );

  const activeFilterCount = [
    appliedFilters.teacherId,
    appliedFilters.courseCode,
    appliedFilters.department,
    appliedFilters.status,
    appliedFilters.method,
    appliedFilters.type,
    appliedFilters.result,
  ].filter(Boolean).length;

  const donutSegments = [
    {
      label: "Puntuales / presentes",
      value: (summary?.punctual ?? 0) + (summary?.present ?? 0),
      tone: "punctual" as const,
    },
    {
      label: "Tardanzas",
      value: summary?.late ?? 0,
      tone: "late" as const,
    },
    {
      label: "Inasistencias",
      value: summary?.absent ?? 0,
      tone: "absent" as const,
    },
    {
      label: "Otros resultados",
      value: Math.max(
        (summary?.totalRecords ?? 0) -
          (summary?.punctual ?? 0) -
          (summary?.present ?? 0) -
          (summary?.late ?? 0) -
          (summary?.absent ?? 0),
        0
      ),
      tone: "other" as const,
    },
  ];

  const insights = useMemo(() => {
    const weekdays = data?.weekdays ?? [];
    const evaluatedWeekdays = weekdays
      .map((item) => {
        const evaluated = item.punctual + item.late + item.absent;

        return {
          ...item,
          rate: evaluated > 0
            ? ((item.punctual + item.late) / evaluated) * 100
            : 0,
        };
      })
      .filter((item) => item.total > 0);

    const bestDay = [...evaluatedWeekdays]
      .sort((first, second) => second.rate - first.rate)[0];
    const lateDay = [...evaluatedWeekdays]
      .sort((first, second) => second.late - first.late)[0];
    const bestDepartment = [...(data?.departments ?? [])]
      .sort(
        (first, second) =>
          second.complianceRate - first.complianceRate
      )[0];
    const mainMethod = [...(data?.methods ?? [])]
      .sort((first, second) => second.total - first.total)[0];
    const busiestDay = [...trend]
      .sort((first, second) => second.total - first.total)[0];

    return {
      bestDay: bestDay
        ? `${WEEKDAY_NAMES[bestDay.weekday] ?? "día"} (${bestDay.rate.toFixed(1)}%)`
        : "Sin datos suficientes",
      lateDay: lateDay && lateDay.late > 0
        ? `${WEEKDAY_NAMES[lateDay.weekday] ?? "día"} (${lateDay.late})`
        : "Sin tardanzas detectadas",
      bestDepartment: bestDepartment
        ? `${bestDepartment.department} (${bestDepartment.complianceRate.toFixed(1)}%)`
        : "Sin datos suficientes",
      mainMethod: mainMethod
        ? `${mainMethod.method.replaceAll("_", " ")} (${mainMethod.total})`
        : "Sin método dominante",
      busiestDay: busiestDay
        ? `${formatDate(busiestDay.date)} (${busiestDay.total})`
        : "Sin actividad registrada",
    };
  }, [data, trend]);

  function updateFilter<Key extends keyof DateRangeReportFilters>(
    key: Key,
    value: DateRangeReportFilters[Key]
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    const normalized = normalizeFilters(draftFilters);
    setDraftFilters(normalized);
    setAppliedFilters(normalized);
    setPage(1);
  }

  function applyRange(from: Date, to: Date) {
    const next = normalizeFilters({
      ...appliedFilters,
      dateFrom: toIsoDate(from),
      dateTo: toIsoDate(to),
    });

    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }

  function clearFilters() {
    const next = defaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }

  async function exportCompleteCsv() {
    if (!token || exporting) return;

    setExporting(true);

    try {
      const payload = await fetchDateRangeExport(
        token,
        appliedFilters
      );

      downloadCsv(
        payload.records,
        appliedFilters.dateFrom,
        appliedFilters.dateTo
      );

      if (payload.truncated) {
        window.alert(
          `La exportación alcanzó el límite de ${payload.maxRows.toLocaleString("es-PE")} registros. Reduce el rango o aplica más filtros para obtener el detalle completo.`
        );
      }
    }
    catch (caught: unknown) {
      window.alert(
        caught instanceof Error
          ? caught.message
          : "No se pudo preparar la exportación."
      );
    }
    finally {
      setExporting(false);
    }
  }

  if (loading && !data) {
    return (
      <LoadingState
        title="Construyendo el reporte por rango"
        description="Procesando comparación temporal, filtros, tendencias y trazabilidad institucional."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el reporte por rango"
        description={error}
        retryText="Reintentar consulta"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  const now = new Date();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Análisis temporal"
        title="Reporte por rango de fechas"
        description="Explora cualquier periodo con comparación automática, filtros cruzados, evolución diaria, patrones semanales y trazabilidad completa."
        badge={
          <span className={styles.liveBadge}>
            <span />
            Periodo flexible
          </span>
        }
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.backLink} href="/supervisor/reportes">
              <ReportIcon name="chevronLeft" />
              Volver a reportes
            </Link>
            <span className={styles.updatedAt}>
              <ReportIcon name="clock" />
              {formatUpdatedAt(lastUpdated)}
            </span>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => void reload()}
              disabled={refreshing}
            >
              <ReportIcon name="refresh" />
              {refreshing ? "Actualizando" : "Actualizar"}
            </button>
          </div>
        }
      />

      {error ? (
        <div className={styles.inlineError} role="alert">
          <ReportIcon name="warning" />
          <div>
            <strong>No se pudo refrescar la información.</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => void reload()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className={styles.periodStrip}>
        <div>
          <span className={styles.periodIcon}>
            <ReportIcon name="calendar" />
          </span>
          <div>
            <p>Periodo analizado</p>
            <strong>
              {formatPeriod(
                appliedFilters.dateFrom,
                appliedFilters.dateTo
              )}
            </strong>
          </div>
        </div>
        <span className={styles.periodMeta}>
          {rangeDays} día(s) ·{" "}
          {activeFilterCount > 0
            ? `${activeFilterCount} filtros activos`
            : "vista institucional completa"}
        </span>
      </section>

      <section className={styles.filterPanel}>
        <div className={styles.filterHeading}>
          <div className={styles.filterHeadingIcon}>
            <ReportIcon name="calendar" />
          </div>
          <div>
            <span>Accesos temporales</span>
            <h2>Periodos rápidos</h2>
            <p>Aplica un intervalo frecuente sin perder los demás filtros.</p>
          </div>
        </div>

        <div className={styles.reportActions}>
          <button
            type="button"
            onClick={() => applyRange(now, now)}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => applyRange(shiftDays(now, -6), now)}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => applyRange(shiftDays(now, -29), now)}
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            onClick={() =>
              applyRange(
                new Date(now.getFullYear(), now.getMonth(), 1),
                now
              )
            }
          >
            Mes actual
          </button>
          <button
            type="button"
            onClick={() =>
              applyRange(
                new Date(now.getFullYear(), 0, 1),
                now
              )
            }
          >
            Año actual
          </button>
        </div>
      </section>

      <section
        className={styles.metricsGrid}
        aria-label="Indicadores del rango"
      >
        <AttendanceMetricCard
          label="Total de registros"
          value={summary?.totalRecords ?? 0}
          detail={`${summary?.teachers ?? 0} docentes · ${summary?.courses ?? 0} cursos`}
          comparison={data?.comparison.totalRecordsPercent}
          icon="asistencia"
          tone="blue"
          trend={trend.map((item) => item.total)}
          delay={0}
        />
        <AttendanceMetricCard
          label="Asistencias"
          value={summary?.attendanceCount ?? 0}
          detail={`${summary?.punctualityRate.toFixed(1) ?? "0.0"}% de puntualidad`}
          comparison={data?.comparison.attendancePercent}
          icon="check"
          tone="green"
          trend={trend.map((item) => item.punctual)}
          delay={90}
        />
        <AttendanceMetricCard
          label="Tardanzas"
          value={summary?.late ?? 0}
          detail={`Promedio: ${summary?.averageDelayMinutes.toFixed(1) ?? "0.0"} min`}
          comparison={data?.comparison.latePercent}
          inverseComparison
          icon="clock"
          tone="amber"
          trend={trend.map((item) => item.late)}
          delay={180}
        />
        <AttendanceMetricCard
          label="Cumplimiento"
          value={summary?.complianceRate ?? 0}
          suffix="%"
          detail={`${summary?.absent ?? 0} inasistencias en ${rangeDays} día(s)`}
          comparison={data?.comparison.compliancePoints}
          comparisonUnit="points"
          icon="departamento"
          tone="purple"
          trend={trend.map((item) => {
            const evaluated =
              item.punctual + item.late + item.absent;

            return evaluated > 0
              ? ((item.punctual + item.late) / evaluated) * 100
              : 0;
          })}
          delay={270}
        />
      </section>

      <section className={styles.analyticsGrid}>
        <article className={`${styles.panel} ${styles.trendPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Evolución temporal</span>
              <h2>Comportamiento diario</h2>
              <p>Comparación entre registros puntuales y tardanzas.</p>
            </div>
            <span className={styles.panelPill}>
              Periodo anterior comparado
            </span>
          </div>
          <AttendanceTrendChart data={trend} />
        </article>

        <article className={`${styles.panel} ${styles.donutPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Distribución</span>
              <h2>Estados del periodo</h2>
              <p>Lectura porcentual de los resultados filtrados.</p>
            </div>
          </div>
          <AttendanceDonut
            segments={donutSegments}
            centerValue={summary?.complianceRate ?? 0}
            centerLabel="cumplimiento"
          />
        </article>
      </section>

      <section className={styles.filterPanel}>
        <div className={styles.filterHeading}>
          <div className={styles.filterHeadingIcon}>
            <ReportIcon name="filter" />
          </div>
          <div>
            <span>Consulta avanzada</span>
            <h2>Filtros del periodo</h2>
            <p>Combina fechas, docente, curso, departamento, tipo, estado, resultado y método.</p>
          </div>
          {activeFilterCount > 0 ? (
            <span className={styles.activeFiltersBadge}>
              {activeFilterCount} activos
            </span>
          ) : null}
        </div>

        <div className={styles.filterGrid}>
          <label>
            <span>Fecha inicial</span>
            <input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) =>
                updateFilter("dateFrom", event.target.value)
              }
            />
          </label>
          <label>
            <span>Fecha final</span>
            <input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) =>
                updateFilter("dateTo", event.target.value)
              }
            />
          </label>
          <label>
            <span>Docente</span>
            <select
              value={draftFilters.teacherId}
              onChange={(event) =>
                updateFilter("teacherId", event.target.value)
              }
              disabled={catalogsLoading}
            >
              <option value="">Todos los docentes</option>
              {(catalogs?.teachers ?? []).map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Curso</span>
            <select
              value={draftFilters.courseCode}
              onChange={(event) =>
                updateFilter("courseCode", event.target.value)
              }
              disabled={catalogsLoading}
            >
              <option value="">Todos los cursos</option>
              {(catalogs?.courses ?? []).map((course) => (
                <option key={course.codigo} value={course.codigo}>
                  {course.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Departamento académico</span>
            <select
              value={draftFilters.department}
              onChange={(event) =>
                updateFilter("department", event.target.value)
              }
              disabled={catalogsLoading}
            >
              <option value="">Todos los departamentos</option>
              {(catalogs?.departments ?? []).map((department) => (
                <option
                  key={department.id}
                  value={department.nombre}
                >
                  {department.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tipo de registro</span>
            <select
              value={draftFilters.type}
              onChange={(event) =>
                updateFilter("type", event.target.value)
              }
            >
              <option value="">Todos los tipos</option>
              <option value="CURSO">Asistencia de curso</option>
              <option value="INGRESO_INSTITUCIONAL">
                Ingreso institucional
              </option>
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                updateFilter("status", event.target.value)
              }
            >
              <option value="">Todos los estados</option>
              <option value="PUNTUAL">Puntual</option>
              <option value="PRESENTE">Presente</option>
              <option value="TARDANZA">Tardanza</option>
              <option value="INASISTENCIA">Inasistencia</option>
            </select>
          </label>
          <label>
            <span>Resultado técnico</span>
            <select
              value={draftFilters.result}
              onChange={(event) =>
                updateFilter("result", event.target.value)
              }
            >
              <option value="">Todos los resultados</option>
              <option value="REGISTRADA">Registrada</option>
              <option value="DUPLICADA">Duplicada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </label>
          <label>
            <span>Método de marcación</span>
            <select
              value={draftFilters.method}
              onChange={(event) =>
                updateFilter("method", event.target.value)
              }
              disabled={catalogsLoading}
            >
              <option value="">Todos los métodos</option>
              {(catalogs?.methods ?? []).map((method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button
              className={styles.applyButton}
              type="button"
              onClick={applyFilters}
            >
              <ReportIcon name="search" />
              Aplicar filtros
            </button>
            <button
              className={styles.clearButton}
              type="button"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className={styles.filterResultLine}>
          <ReportIcon name="database" />
          <span>
            Se encontraron{" "}
            <strong>
              {summary?.totalRecords.toLocaleString("es-PE") ?? "0"}
            </strong>{" "}
            registros en {rangeDays} día(s), con{" "}
            <strong>
              {summary?.attendanceCount.toLocaleString("es-PE") ?? "0"}
            </strong>{" "}
            asistencias,{" "}
            <strong>
              {summary?.late.toLocaleString("es-PE") ?? "0"}
            </strong>{" "}
            tardanzas y{" "}
            <strong>
              {summary?.absent.toLocaleString("es-PE") ?? "0"}
            </strong>{" "}
            inasistencias.
          </span>
        </div>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={`${styles.panel} ${styles.weekdayPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Patrón semanal</span>
              <h2>Distribución por día</h2>
              <p>Volumen de incidencias a lo largo de la semana.</p>
            </div>
          </div>
          <AttendanceWeekdayBars data={data?.weekdays ?? []} />
        </article>

        <article className={`${styles.panel} ${styles.insightPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Lectura automática</span>
              <h2>Hallazgos del rango</h2>
              <p>Indicadores derivados de los registros seleccionados.</p>
            </div>
          </div>
          <div className={styles.insightList}>
            <div>
              <span className={styles.insightIconSuccess}>
                <ReportIcon name="check" />
              </span>
              <p>
                <span>Mejor desempeño semanal</span>
                <strong>{insights.bestDay}</strong>
              </p>
            </div>
            <div>
              <span className={styles.insightIconWarning}>
                <ReportIcon name="clock" />
              </span>
              <p>
                <span>Mayor concentración de tardanzas</span>
                <strong>{insights.lateDay}</strong>
              </p>
            </div>
            <div>
              <span className={styles.insightIconPurple}>
                <ReportIcon name="departamento" />
              </span>
              <p>
                <span>Departamento con mayor cumplimiento</span>
                <strong>{insights.bestDepartment}</strong>
              </p>
            </div>
            <div>
              <span className={styles.insightIconBlue}>
                <ReportIcon name="database" />
              </span>
              <p>
                <span>Método predominante</span>
                <strong>{insights.mainMethod}</strong>
              </p>
            </div>
            <div>
              <span className={styles.insightIconBlue}>
                <ReportIcon name="calendar" />
              </span>
              <p>
                <span>Día con mayor actividad</span>
                <strong>{insights.busiestDay}</strong>
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div>
            <span>Trazabilidad temporal</span>
            <h2>Registros del periodo</h2>
            <p>Detalle paginado de cada marcación incluida en el rango actual.</p>
          </div>
          <div className={styles.reportActions}>
            <button type="button" onClick={() => window.print()}>
              <ReportIcon name="print" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => void exportCompleteCsv()}
              disabled={exporting || (summary?.totalRecords ?? 0) === 0}
            >
              <ReportIcon name="file" />
              {exporting ? "Preparando CSV" : "Exportar CSV completo"}
            </button>
            <Link href="/supervisor/reportes/legacy?view=exportacion">
              <ReportIcon name="exportacion" />
              Centro de exportación
            </Link>
          </div>
        </div>

        <AttendanceTable
          records={data?.records ?? []}
          pagination={
            data?.pagination ?? {
              page: 1,
              pageSize,
              totalRecords: 0,
              totalPages: 1,
              hasPrevious: false,
              hasNext: false,
            }
          }
          onPageChange={setPage}
          busy={refreshing}
        />
      </section>
    </div>
  );
}
