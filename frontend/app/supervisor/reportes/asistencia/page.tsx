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
  useAttendanceReport,
} from "@/hooks/supervisor/reportes/useAttendanceReport";
import {
  clearSession,
  getToken,
} from "@/lib/auth";
import type {
  AttendanceReportFilters,
  AttendanceReportRecord,
} from "@/types/supervisor-reportes";

import styles from "./page.module.css";

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

function defaultFilters(): AttendanceReportFilters {
  const now = new Date();
  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toIsoDate(now),
    teacherId: "",
    courseCode: "",
    department: "",
    status: "",
    method: "",
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

function formatPeriod(from: string, to: string): string {
  const format = (value: string) => {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };
  return `${format(from)} – ${format(to)}`;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(records: AttendanceReportRecord[]) {
  const header = [
    "Docente",
    "Código docente",
    "Departamento",
    "Curso",
    "Código curso",
    "Aula",
    "Fecha",
    "Hora programada",
    "Hora registrada",
    "Diferencia minutos",
    "Estado",
    "Resultado",
    "Método",
    "Fuente",
  ];
  const rows = records.map((record) => [
    record.teacher,
    record.teacherCode,
    record.department,
    record.course || "Ingreso institucional",
    record.courseCode,
    record.classroom,
    record.date,
    record.scheduledTime,
    record.registeredTime,
    record.differenceMinutes,
    record.status,
    record.result,
    record.method,
    record.source,
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
  anchor.download = `reporte-asistencia-${toIsoDate(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function normalizeFilters(filters: AttendanceReportFilters): AttendanceReportFilters {
  if (!filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo) {
    return filters;
  }
  return {
    ...filters,
    dateFrom: filters.dateTo,
    dateTo: filters.dateFrom,
  };
}

export default function AttendanceReportPage() {
  const router = useRouter();
  const initialFilters = useMemo(defaultFilters, []);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const pageSize = 12;
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
  } = useAttendanceReport({
    token,
    filters: appliedFilters,
    page,
    pageSize,
    onUnauthorized: handleUnauthorized,
  });

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const activeFilterCount = [
    appliedFilters.teacherId,
    appliedFilters.courseCode,
    appliedFilters.department,
    appliedFilters.status,
    appliedFilters.method,
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
      label: "Otros registros",
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
          rate: evaluated > 0 ? (item.punctual / evaluated) * 100 : 0,
        };
      })
      .filter((item) => item.total > 0);
    const bestDay = [...evaluatedWeekdays].sort((a, b) => b.rate - a.rate)[0];
    const lateDay = [...evaluatedWeekdays].sort((a, b) => b.late - a.late)[0];
    const bestDepartment = [...(data?.departments ?? [])]
      .sort((a, b) => b.complianceRate - a.complianceRate)[0];
    const mainMethod = [...(data?.methods ?? [])]
      .sort((a, b) => b.total - a.total)[0];

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
    };
  }, [data]);

  function updateFilter<Key extends keyof AttendanceReportFilters>(
    key: Key,
    value: AttendanceReportFilters[Key]
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

  function clearFilters() {
    const next = defaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }

  if (loading && !data) {
    return (
      <LoadingState
        title="Construyendo el reporte de asistencia"
        description="Procesando métricas, tendencias, filtros y registros institucionales."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el reporte de asistencia"
        description={error}
        retryText="Reintentar consulta"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Control operativo"
        title="Reporte de asistencia"
        description="Análisis detallado del cumplimiento docente con métricas comparativas, evolución animada, filtros avanzados y trazabilidad de cada marcación."
        badge={
          <span className={styles.liveBadge}>
            <span />
            Datos institucionales
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
              {formatPeriod(appliedFilters.dateFrom, appliedFilters.dateTo)}
            </strong>
          </div>
        </div>
        <span className={styles.periodMeta}>
          {activeFilterCount > 0
            ? `${activeFilterCount} filtros especializados activos`
            : "Vista institucional completa"}
        </span>
      </section>

      <section className={styles.metricsGrid} aria-label="Indicadores de asistencia">
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
          detail={`${summary?.absent ?? 0} inasistencias en el periodo`}
          comparison={data?.comparison.compliancePoints}
          comparisonUnit="points"
          icon="departamento"
          tone="purple"
          trend={trend.map((item) => {
            const evaluated = item.punctual + item.late + item.absent;
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
              <h2>Cumplimiento por día</h2>
              <p>Comparación dinámica entre registros puntuales y tardanzas.</p>
            </div>
            <span className={styles.panelPill}>Animación activa</span>
          </div>
          <AttendanceTrendChart data={trend} />
        </article>

        <article className={`${styles.panel} ${styles.donutPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Distribución</span>
              <h2>Estado de asistencia</h2>
              <p>Lectura porcentual del periodo seleccionado.</p>
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
            <h2>Filtros del reporte</h2>
            <p>Combina periodo, docente, curso, departamento, estado y método.</p>
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
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label>
            <span>Fecha final</span>
            <input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
          <label>
            <span>Docente</span>
            <select
              value={draftFilters.teacherId}
              onChange={(event) => updateFilter("teacherId", event.target.value)}
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
              onChange={(event) => updateFilter("courseCode", event.target.value)}
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
              onChange={(event) => updateFilter("department", event.target.value)}
              disabled={catalogsLoading}
            >
              <option value="">Todos los departamentos</option>
              {(catalogs?.departments ?? []).map((department) => (
                <option key={department.id} value={department.nombre}>
                  {department.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select
              value={draftFilters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="PUNTUAL">Puntual</option>
              <option value="PRESENTE">Presente</option>
              <option value="TARDANZA">Tardanza</option>
              <option value="INASISTENCIA">Inasistencia</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </label>
          <label>
            <span>Método de marcación</span>
            <select
              value={draftFilters.method}
              onChange={(event) => updateFilter("method", event.target.value)}
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
            <button className={styles.applyButton} type="button" onClick={applyFilters}>
              <ReportIcon name="search" />
              Aplicar filtros
            </button>
            <button className={styles.clearButton} type="button" onClick={clearFilters}>
              Limpiar
            </button>
          </div>
        </div>

        <div className={styles.filterResultLine}>
          <ReportIcon name="database" />
          <span>
            Se encontraron <strong>{summary?.totalRecords.toLocaleString("es-PE") ?? "0"}</strong> registros,
            con <strong>{summary?.attendanceCount.toLocaleString("es-PE") ?? "0"}</strong> asistencias,
            <strong> {summary?.late.toLocaleString("es-PE") ?? "0"}</strong> tardanzas y
            <strong> {summary?.absent.toLocaleString("es-PE") ?? "0"}</strong> inasistencias.
          </span>
        </div>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={`${styles.panel} ${styles.weekdayPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Patrón semanal</span>
              <h2>Comportamiento por día</h2>
              <p>Volumen y distribución de incidencias durante la semana.</p>
            </div>
          </div>
          <AttendanceWeekdayBars data={data?.weekdays ?? []} />
        </article>

        <article className={`${styles.panel} ${styles.insightPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span>Lectura automática</span>
              <h2>Hallazgos del periodo</h2>
              <p>Indicadores clave derivados de los datos filtrados.</p>
            </div>
          </div>
          <div className={styles.insightList}>
            <div>
              <span className={styles.insightIconSuccess}><ReportIcon name="check" /></span>
              <p><span>Mejor desempeño semanal</span><strong>{insights.bestDay}</strong></p>
            </div>
            <div>
              <span className={styles.insightIconWarning}><ReportIcon name="clock" /></span>
              <p><span>Mayor concentración de tardanzas</span><strong>{insights.lateDay}</strong></p>
            </div>
            <div>
              <span className={styles.insightIconPurple}><ReportIcon name="departamento" /></span>
              <p><span>Departamento con mayor cumplimiento</span><strong>{insights.bestDepartment}</strong></p>
            </div>
            <div>
              <span className={styles.insightIconBlue}><ReportIcon name="database" /></span>
              <p><span>Método de marcación predominante</span><strong>{insights.mainMethod}</strong></p>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div>
            <span>Trazabilidad institucional</span>
            <h2>Registros de asistencia</h2>
            <p>Detalle paginado de cada marcación incluida en el reporte actual.</p>
          </div>
          <div className={styles.reportActions}>
            <button type="button" onClick={() => window.print()}>
              <ReportIcon name="print" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(data?.records ?? [])}
              disabled={(data?.records.length ?? 0) === 0}
            >
              <ReportIcon name="file" />
              Excel (.csv)
            </button>
            <Link href="/supervisor/reportes/legacy?view=exportacion">
              <ReportIcon name="exportacion" />
              Centro de exportación
            </Link>
          </div>
        </div>

        <AttendanceTable
          records={data?.records ?? []}
          pagination={data?.pagination ?? {
            page: 1,
            pageSize,
            totalRecords: 0,
            totalPages: 1,
            hasPrevious: false,
            hasNext: false,
          }}
          onPageChange={setPage}
          busy={refreshing}
        />
      </section>
    </div>
  );
}
