"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DepartmentCourseTable from "@/components/supervisor/reportes/departamento/DepartmentCourseTable";
import DepartmentProfileCard from "@/components/supervisor/reportes/departamento/DepartmentProfileCard";
import DepartmentTeacherTable from "@/components/supervisor/reportes/departamento/DepartmentTeacherTable";
import TeacherMetricCard from "@/components/supervisor/reportes/docente/TeacherMetricCard";
import TeacherPerformanceGauge from "@/components/supervisor/reportes/docente/TeacherPerformanceGauge";
import TeacherRecentTable from "@/components/supervisor/reportes/docente/TeacherRecentTable";
import styles from "@/components/supervisor/reportes/docente/TeacherReport.module.css";
import TeacherTrendChart from "@/components/supervisor/reportes/docente/TeacherTrendChart";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import { useDepartmentReport } from "@/hooks/supervisor/reportes/useDepartmentReport";
import { clearSession, getToken } from "@/lib/auth";
import type {
  AttendanceReportRecord,
  DepartmentReportFilters,
} from "@/types/supervisor-reportes";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaults(): DepartmentReportFilters {
  const now = new Date();
  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toIsoDate(now),
    departmentId: "",
    semesterId: "",
  };
}

function normalize(
  filters: DepartmentReportFilters
): DepartmentReportFilters {
  if (filters.dateFrom <= filters.dateTo) return filters;
  return {
    ...filters,
    dateFrom: filters.dateTo,
    dateTo: filters.dateFrom,
  };
}

function displayDate(value?: string | null) {
  const clean = String(value ?? "").slice(0, 10);
  const [year, month, day] = clean.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(
  records: AttendanceReportRecord[],
  department: string
) {
  const header = [
    "Docente",
    "Código",
    "Curso o registro",
    "Fecha",
    "Hora programada",
    "Hora registrada",
    "Estado",
    "Resultado",
    "Método",
    "Aula",
  ];

  const rows = records.map((item) => [
    item.teacher,
    item.teacherCode,
    item.course || "Ingreso institucional",
    item.date,
    item.scheduledTime,
    item.registeredTime,
    item.status,
    item.result,
    item.method,
    item.classroom,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-departamento-${department
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DepartmentReportPage() {
  const router = useRouter();
  const token = getToken();
  const initial = useMemo(defaults, []);
  const [draft, setDraft] =
    useState<DepartmentReportFilters>(initial);
  const [applied, setApplied] =
    useState<DepartmentReportFilters>(initial);

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
  } = useDepartmentReport({
    token,
    filters: applied,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (
      catalogs?.departments.length &&
      !draft.departmentId
    ) {
      const departmentId = String(catalogs.departments[0].id);
      setDraft((current) => ({
        ...current,
        departmentId,
      }));
      setApplied((current) => ({
        ...current,
        departmentId,
      }));
    }
  }, [catalogs, draft.departmentId]);

  function updateFilter(
    key: keyof DepartmentReportFilters,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectSemester(value: string) {
    const semester = catalogs?.semesters.find(
      (item) => String(item.id) === value
    );

    setDraft((current) => ({
      ...current,
      semesterId: value,
      dateFrom:
        value && semester?.fecha_inicio
          ? String(semester.fecha_inicio).slice(0, 10)
          : current.dateFrom,
      dateTo:
        value && semester?.fecha_fin
          ? String(semester.fecha_fin).slice(0, 10)
          : current.dateTo,
    }));
  }

  function applyFilters() {
    setApplied(normalize(draft));
  }

  function resetFilters() {
    const next = {
      ...defaults(),
      departmentId:
        catalogs?.departments[0]?.id
          ? String(catalogs.departments[0].id)
          : "",
    };
    setDraft(next);
    setApplied(next);
  }

  if (catalogsLoading && !catalogs) {
    return (
      <LoadingState
        title="Preparando el reporte por departamento"
        description="Cargando unidades académicas, semestres, docentes y cursos."
        fullHeight
      />
    );
  }

  if (!catalogs?.departments.length) {
    return (
      <ErrorState
        title="No existen departamentos disponibles"
        description="El catálogo institucional no contiene departamentos para generar el reporte."
        retryText="Actualizar catálogo"
        onRetry={() => window.location.reload()}
        fullHeight
      />
    );
  }

  if (loading && applied.departmentId && !data) {
    return (
      <LoadingState
        title="Analizando el departamento"
        description="Consolidando docentes, cursos, sesiones, cobertura, puntualidad e historial."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el reporte por departamento"
        description={error}
        retryText="Reintentar consulta"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  const summary = data?.summary;
  const department = data?.department;
  const selectedDepartment = catalogs.departments.find(
    (item) => String(item.id) === draft.departmentId
  );
  const periodFrom = data?.period.from || applied.dateFrom;
  const periodTo = data?.period.to || applied.dateTo;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Visión institucional"
        title="Reporte por departamento"
        description="Análisis integral de docentes, cursos, programación, cobertura, cumplimiento, puntualidad e incidencias por unidad académica."
        badge={
          <span className={styles.liveBadge}>
            <span />
            Datos institucionales
          </span>
        }
        actions={
          <div className={styles.headerActions}>
            <Link
              className={styles.backLink}
              href="/supervisor/reportes"
            >
              <ReportIcon name="chevronLeft" />
              Volver a reportes
            </Link>
            <span className={styles.updatedAt}>
              <ReportIcon name="clock" />
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("es-PE")
                : "Pendiente"}
            </span>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => void reload()}
              disabled={refreshing || !applied.departmentId}
            >
              <ReportIcon name="refresh" />
              {refreshing ? "Actualizando" : "Actualizar"}
            </button>
          </div>
        }
      />

      {error ? (
        <div className={styles.inlineWarning}>
          <ReportIcon name="warning" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className={styles.filterPanel}>
        <div className={styles.filterHeading}>
          <span className={styles.filterIcon}>
            <ReportIcon name="filter" />
          </span>
          <div>
            <h2>Consulta institucional</h2>
            <p>
              Selecciona el departamento y delimita el semestre o periodo.
            </p>
          </div>
          <b>
            {data?.selectedSemester?.code || "Rango personalizado"}
          </b>
        </div>

        <div className={styles.filterGrid}>
          <label className={styles.teacherSelector}>
            <span>Departamento</span>
            <div className={styles.selectWithIcon}>
              <ReportIcon name="search" />
              <select
                value={draft.departmentId}
                onChange={(event) =>
                  updateFilter("departmentId", event.target.value)
                }
              >
                {catalogs.departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} · {item.codigo}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label>
            <span>Semestre</span>
            <select
              value={draft.semesterId}
              onChange={(event) =>
                selectSemester(event.target.value)
              }
            >
              <option value="">Periodo personalizado</option>
              {catalogs.semesters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Desde</span>
            <input
              type="date"
              value={draft.dateFrom}
              disabled={Boolean(draft.semesterId)}
              onChange={(event) =>
                updateFilter("dateFrom", event.target.value)
              }
            />
          </label>

          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={draft.dateTo}
              disabled={Boolean(draft.semesterId)}
              onChange={(event) =>
                updateFilter("dateTo", event.target.value)
              }
            />
          </label>

          <div className={styles.filterActions}>
            <button
              className={styles.resetButton}
              type="button"
              onClick={resetFilters}
            >
              Restablecer
            </button>
            <button
              className={styles.applyButton}
              type="button"
              onClick={applyFilters}
              disabled={!draft.departmentId}
            >
              <ReportIcon name="search" />
              Consultar departamento
            </button>
          </div>
        </div>
      </section>

      <section className={styles.periodStrip}>
        <div>
          <span>
            <ReportIcon name="calendar" />
          </span>
          <div>
            <p>Periodo evaluado</p>
            <strong>
              {displayDate(periodFrom)} – {displayDate(periodTo)}
            </strong>
          </div>
        </div>
        <div className={styles.periodMeta}>
          <span>
            {department?.name ||
              selectedDepartment?.nombre ||
              "Departamento seleccionado"}
          </span>
          <b>{summary?.plannedSessions ?? 0} sesiones programadas</b>
        </div>
      </section>

      {department ? (
        <section className={styles.overviewGrid}>
          <DepartmentProfileCard
            department={department}
            activeTeachers={summary?.activeTeachers ?? 0}
            activeCourses={summary?.activeCourses ?? 0}
          />

          <div className={styles.metricsGrid}>
            <TeacherMetricCard
              label="Docentes activos"
              value={summary?.activeTeachers ?? 0}
              detail={`${summary?.teachersWithActivity ?? 0} con actividad`}
              icon="docente"
              tone="blue"
              delay={0}
            />
            <TeacherMetricCard
              label="Cursos activos"
              value={summary?.activeCourses ?? 0}
              detail={`${summary?.coursesWithActivity ?? 0} con registros`}
              icon="curso"
              tone="violet"
              delay={70}
            />
            <TeacherMetricCard
              label="Sesiones cubiertas"
              value={summary?.recordedSessions ?? 0}
              detail={`${summary?.plannedSessions ?? 0} programadas`}
              delta={data?.comparison.coveragePoints}
              deltaUnit="points"
              icon="calendar"
              tone="green"
              delay={140}
            />
            <TeacherMetricCard
              label="Tardanzas"
              value={summary?.late ?? 0}
              detail={`${summary?.averageDelayMinutes ?? 0} min de retraso promedio`}
              delta={data?.comparison.latePercent}
              icon="clock"
              tone="amber"
              delay={210}
            />
            <TeacherMetricCard
              label="Cumplimiento"
              value={summary?.complianceRate ?? 0}
              suffix="%"
              detail={`${summary?.coverageRate ?? 0}% de cobertura`}
              delta={data?.comparison.compliancePoints}
              deltaUnit="points"
              icon="departamento"
              tone="violet"
              delay={280}
            />
          </div>
        </section>
      ) : null}

      <section className={styles.analyticsGrid}>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Desempeño agregado</span>
              <h2>Distribución de cumplimiento</h2>
              <p>
                Puntualidad, tardanzas e inasistencias de la unidad académica.
              </p>
            </div>
            <b>{summary?.activeDays ?? 0} días con actividad</b>
          </header>
          <TeacherPerformanceGauge
            compliance={summary?.complianceRate ?? 0}
            punctual={summary?.punctual ?? 0}
            late={summary?.late ?? 0}
            absent={summary?.absent ?? 0}
          />
        </article>

        <article className={`${styles.panel} ${styles.trendPanel}`}>
          <header className={styles.panelHeader}>
            <div>
              <span>Evolución temporal</span>
              <h2>Actividad durante el periodo</h2>
              <p>
                Movimiento diario de asistencias, tardanzas y ausencias.
              </p>
            </div>
            <b>Gráfico animado</b>
          </header>
          <TeacherTrendChart data={data?.trend ?? []} />
        </article>
      </section>

      <section className={styles.insightsGrid}>
        <article
          className={`${styles.insightCard} ${styles.insightSuccess}`}
        >
          <span><ReportIcon name="check" /></span>
          <div>
            <p>Mejor desempeño docente</p>
            <strong>
              {data?.insights.bestTeacher?.name ||
                "Sin datos suficientes"}
            </strong>
            <small>
              {data?.insights.bestTeacher
                ? `${data.insights.bestTeacher.complianceRate.toFixed(
                    1
                  )}% de cumplimiento`
                : "Aún no existen docentes evaluables"}
            </small>
          </div>
        </article>

        <article
          className={`${styles.insightCard} ${styles.insightWarning}`}
        >
          <span><ReportIcon name="warning" /></span>
          <div>
            <p>Docente que requiere atención</p>
            <strong>
              {data?.insights.attentionTeacher?.name ||
                "Sin alertas académicas"}
            </strong>
            <small>
              {data?.insights.attentionTeacher
                ? `${data.insights.attentionTeacher.complianceRate.toFixed(
                    1
                  )}% de cumplimiento`
                : "No se detectaron docentes evaluables"}
            </small>
          </div>
        </article>

        <article
          className={`${styles.insightCard} ${styles.insightInfo}`}
        >
          <span><ReportIcon name="curso" /></span>
          <div>
            <p>Curso con mejor desempeño</p>
            <strong>
              {data?.insights.bestCourse?.name ||
                "Sin datos suficientes"}
            </strong>
            <small>
              {data?.insights.bestCourse
                ? `${data.insights.bestCourse.complianceRate.toFixed(
                    1
                  )}% de cumplimiento`
                : "No existen cursos evaluables"}
            </small>
          </div>
        </article>

        <article
          className={`${styles.insightCard} ${styles.insightViolet}`}
        >
          <span><ReportIcon name="database" /></span>
          <div>
            <p>Método predominante</p>
            <strong>
              {data?.insights.topMethod?.method || "Sin registros"}
            </strong>
            <small>
              {data?.insights.topMethod
                ? `${data.insights.topMethod.total} verificaciones`
                : "No existe actividad en el periodo"}
            </small>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Equipo académico</span>
            <h2>Desempeño por docente</h2>
            <p>
              Cursos, programación, cobertura, puntualidad e incidencias.
            </p>
          </div>
          <span className={styles.tableCount}>
            {data?.teachers.length ?? 0} docente(s)
          </span>
        </header>
        <DepartmentTeacherTable teachers={data?.teachers ?? []} />
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Oferta académica</span>
            <h2>Desempeño por curso</h2>
            <p>
              Docentes, bloques, sesiones, cobertura y cumplimiento.
            </p>
          </div>
          <span className={styles.tableCount}>
            {data?.courses.length ?? 0} curso(s)
          </span>
        </header>
        <DepartmentCourseTable courses={data?.courses ?? []} />
      </section>

      <section className={styles.scopeCard}>
        <span><ReportIcon name="database" /></span>
        <div>
          <strong>Alcance y fidelidad del reporte</strong>
          <p>
            {data?.insights.scopeNote ||
              "Los datos proceden de la programación y del historial unificado."}
          </p>
        </div>
        <b>Sin datos simulados</b>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Trazabilidad</span>
            <h2>Actividad reciente del departamento</h2>
            <p>
              Últimos registros encontrados dentro del periodo seleccionado.
            </p>
          </div>
          <div className={styles.exportActions}>
            <button type="button" onClick={() => window.print()}>
              <ReportIcon name="print" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  data?.recent ?? [],
                  department?.name || "departamento"
                )
              }
            >
              <ReportIcon name="file" />
              Exportar CSV
            </button>
          </div>
        </header>
        <TeacherRecentTable records={data?.recent ?? []} />
      </section>
    </div>
  );
}
