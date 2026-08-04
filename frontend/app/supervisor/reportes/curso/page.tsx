"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import CourseProfileCard from "@/components/supervisor/reportes/curso/CourseProfileCard";
import CourseScheduleTable from "@/components/supervisor/reportes/curso/CourseScheduleTable";
import CourseTeacherTable from "@/components/supervisor/reportes/curso/CourseTeacherTable";
import TeacherMetricCard from "@/components/supervisor/reportes/docente/TeacherMetricCard";
import TeacherPerformanceGauge from "@/components/supervisor/reportes/docente/TeacherPerformanceGauge";
import TeacherRecentTable from "@/components/supervisor/reportes/docente/TeacherRecentTable";
import styles from "@/components/supervisor/reportes/docente/TeacherReport.module.css";
import TeacherTrendChart from "@/components/supervisor/reportes/docente/TeacherTrendChart";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import { useCourseReport } from "@/hooks/supervisor/reportes/useCourseReport";
import { clearSession, getToken } from "@/lib/auth";
import type {
  AttendanceReportRecord,
  CourseReportFilters,
} from "@/types/supervisor-reportes";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaults(): CourseReportFilters {
  const now = new Date();
  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toIsoDate(now),
    courseCode: "",
    semesterId: "",
  };
}

function normalize(filters: CourseReportFilters): CourseReportFilters {
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

function exportCsv(records: AttendanceReportRecord[], courseName: string) {
  const header = [
    "Curso",
    "Código",
    "Docente",
    "Código docente",
    "Fecha",
    "Aula",
    "Hora programada",
    "Hora registrada",
    "Estado",
    "Resultado",
    "Método",
    "Fuente",
  ];
  const rows = records.map((item) => [
    courseName,
    item.courseCode,
    item.teacher,
    item.teacherCode,
    item.date,
    item.classroom,
    item.scheduledTime,
    item.registeredTime,
    item.status,
    item.result,
    item.method,
    item.source,
  ]);
  const content = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-curso-${toIsoDate(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CourseReportPage() {
  const router = useRouter();
  const initial = useMemo(defaults, []);
  const [draft, setDraft] = useState<CourseReportFilters>(initial);
  const [applied, setApplied] = useState<CourseReportFilters>(initial);
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
  } = useCourseReport({
    token,
    filters: applied,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (applied.courseCode || !catalogs?.courses.length) return;
    const firstCourse = catalogs.courses[0].codigo;
    setDraft((current) => ({ ...current, courseCode: firstCourse }));
    setApplied((current) => ({ ...current, courseCode: firstCourse }));
  }, [applied.courseCode, catalogs]);

  function updateFilter<K extends keyof CourseReportFilters>(
    key: K,
    value: CourseReportFilters[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectSemester(value: string) {
    const semester = catalogs?.semesters.find(
      (item) => String(item.id) === value
    );
    setDraft((current) => ({
      ...current,
      semesterId: value,
      dateFrom: semester?.fecha_inicio?.slice(0, 10) || current.dateFrom,
      dateTo: semester?.fecha_fin?.slice(0, 10) || current.dateTo,
    }));
  }

  function applyFilters() {
    setApplied(normalize(draft));
  }

  function resetFilters() {
    const next = defaults();
    const firstCourse = catalogs?.courses[0];
    if (firstCourse) next.courseCode = firstCourse.codigo;
    setDraft(next);
    setApplied(next);
  }

  if (catalogsLoading && !catalogs) {
    return (
      <LoadingState
        title="Preparando el reporte por curso"
        description="Cargando cursos, semestres, docentes y estructura académica."
        fullHeight
      />
    );
  }

  if (!catalogs?.courses.length) {
    return (
      <ErrorState
        title="No existen cursos disponibles"
        description="El catálogo no contiene cursos activos para generar el reporte académico."
        retryText="Actualizar catálogo"
        onRetry={() => window.location.reload()}
        fullHeight
      />
    );
  }

  if (loading && applied.courseCode && !data) {
    return (
      <LoadingState
        title="Analizando el desempeño del curso"
        description="Consolidando programación, docentes, cobertura, puntualidad, tendencias y trazabilidad."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el reporte por curso"
        description={error}
        retryText="Reintentar consulta"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  const summary = data?.summary;
  const course = data?.course;
  const selectedCourse = catalogs.courses.find(
    (item) => item.codigo === draft.courseCode
  );
  const periodFrom = data?.period.from || applied.dateFrom;
  const periodTo = data?.period.to || applied.dateTo;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Lectura académica"
        title="Reporte por curso"
        description="Vista integral del curso: programación, docentes asignados, cobertura de sesiones, puntualidad, incidencias, evolución e historial verificable."
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
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("es-PE")
                : "Pendiente"}
            </span>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => void reload()}
              disabled={refreshing || !applied.courseCode}
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
          <span className={styles.filterIcon}><ReportIcon name="filter" /></span>
          <div>
            <h2>Consulta académica</h2>
            <p>Selecciona un curso y delimita el semestre o periodo de análisis.</p>
          </div>
          <b>{data?.selectedSemester?.code || "Rango personalizado"}</b>
        </div>

        <div className={styles.filterGrid}>
          <label className={styles.teacherSelector}>
            <span>Buscar curso</span>
            <div className={styles.selectWithIcon}>
              <ReportIcon name="search" />
              <select
                value={draft.courseCode}
                onChange={(event) =>
                  updateFilter("courseCode", event.target.value)
                }
              >
                {catalogs.courses.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
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
              onChange={(event) => selectSemester(event.target.value)}
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
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>

          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={draft.dateTo}
              disabled={Boolean(draft.semesterId)}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
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
              disabled={!draft.courseCode}
            >
              <ReportIcon name="search" />
              Consultar curso
            </button>
          </div>
        </div>
      </section>

      <section className={styles.periodStrip}>
        <div>
          <span><ReportIcon name="calendar" /></span>
          <div>
            <p>Periodo evaluado</p>
            <strong>{displayDate(periodFrom)} – {displayDate(periodTo)}</strong>
          </div>
        </div>
        <div className={styles.periodMeta}>
          <span>{course?.name || selectedCourse?.nombre || "Curso seleccionado"}</span>
          <b>{summary?.plannedSessions ?? 0} sesiones programadas</b>
        </div>
      </section>

      {course ? (
        <section className={styles.overviewGrid}>
          <CourseProfileCard
            course={course}
            classroomList={summary?.classroomList}
          />

          <div className={styles.metricsGrid}>
            <TeacherMetricCard
              label="Docentes asignados"
              value={summary?.assignedTeachers ?? 0}
              detail={`${summary?.teachersWithActivity ?? 0} con actividad registrada`}
              icon="docente"
              tone="blue"
              delay={0}
            />
            <TeacherMetricCard
              label="Sesiones cubiertas"
              value={summary?.recordedSessions ?? 0}
              detail={`${summary?.plannedSessions ?? 0} sesiones programadas`}
              delta={data?.comparison.coveragePoints}
              deltaUnit="points"
              icon="calendar"
              tone="green"
              delay={70}
            />
            <TeacherMetricCard
              label="Tardanzas"
              value={summary?.late ?? 0}
              detail={`${summary?.averageDelayMinutes ?? 0} min de retraso promedio`}
              delta={data?.comparison.latePercent}
              icon="clock"
              tone="amber"
              delay={140}
            />
            <TeacherMetricCard
              label="Inasistencias"
              value={summary?.absent ?? 0}
              detail="Ausencias explícitas del historial"
              delta={data?.comparison.absencePercent}
              icon="inasistencias"
              tone="red"
              delay={210}
            />
            <TeacherMetricCard
              label="Cumplimiento"
              value={summary?.complianceRate ?? 0}
              suffix="%"
              detail={`${summary?.coverageRate ?? 0}% de cobertura de sesiones`}
              delta={data?.comparison.compliancePoints}
              deltaUnit="points"
              icon="curso"
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
              <span>Desempeño integral</span>
              <h2>Distribución de cumplimiento</h2>
              <p>Lectura circular de puntualidad, tardanzas e inasistencias.</p>
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
              <h2>Comportamiento durante el periodo</h2>
              <p>Movimiento diario de asistencias puntuales, tardanzas y ausencias.</p>
            </div>
            <b>Gráfico animado</b>
          </header>
          <TeacherTrendChart data={data?.trend ?? []} />
        </article>
      </section>

      <section className={styles.insightsGrid}>
        <article className={`${styles.insightCard} ${styles.insightSuccess}`}>
          <span><ReportIcon name="check" /></span>
          <div>
            <p>Mejor desempeño docente</p>
            <strong>{data?.insights.bestTeacher?.name || "Sin datos suficientes"}</strong>
            <small>
              {data?.insights.bestTeacher
                ? `${data.insights.bestTeacher.complianceRate.toFixed(1)}% de cumplimiento`
                : "Aún no existen docentes evaluables"}
            </small>
          </div>
        </article>

        <article className={`${styles.insightCard} ${styles.insightWarning}`}>
          <span><ReportIcon name="warning" /></span>
          <div>
            <p>Docente que requiere atención</p>
            <strong>{data?.insights.attentionTeacher?.name || "Sin alertas académicas"}</strong>
            <small>
              {data?.insights.attentionTeacher
                ? `${data.insights.attentionTeacher.complianceRate.toFixed(1)}% de cumplimiento`
                : "No se detectaron docentes evaluables"}
            </small>
          </div>
        </article>

        <article className={`${styles.insightCard} ${styles.insightInfo}`}>
          <span><ReportIcon name="database" /></span>
          <div>
            <p>Método predominante</p>
            <strong>{data?.insights.topMethod?.method || "Sin registros"}</strong>
            <small>
              {data?.insights.topMethod
                ? `${data.insights.topMethod.total} verificaciones`
                : "No existe actividad biométrica en el periodo"}
            </small>
          </div>
        </article>

        <article className={`${styles.insightCard} ${styles.insightViolet}`}>
          <span><ReportIcon name="calendar" /></span>
          <div>
            <p>Día con mayor actividad</p>
            <strong>{displayDate(data?.insights.busiestDay?.date)}</strong>
            <small>{data?.insights.busiestDay?.total ?? 0} registros encontrados</small>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Equipo académico</span>
            <h2>Desempeño por docente</h2>
            <p>Programación, sesiones cubiertas, puntualidad, incidencias y cumplimiento.</p>
          </div>
          <span className={styles.tableCount}>{data?.teachers.length ?? 0} docente(s)</span>
        </header>
        <CourseTeacherTable teachers={data?.teachers ?? []} />
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Programación académica</span>
            <h2>Bloques horarios del curso</h2>
            <p>Vista de días, horas, aulas, docentes y cobertura de sesiones.</p>
          </div>
          <span className={styles.tableCount}>
            {data?.schedules.length ?? 0} de {summary?.scheduleSlots ?? 0} bloque(s)
          </span>
        </header>
        <CourseScheduleTable schedules={data?.schedules ?? []} />
      </section>

      <section className={styles.scopeCard}>
        <span><ReportIcon name="database" /></span>
        <div>
          <strong>Alcance y fidelidad del reporte</strong>
          <p>{data?.insights.scopeNote || "Los datos proceden de la programación académica y del historial unificado."}</p>
        </div>
        <b>Sin datos simulados</b>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Trazabilidad</span>
            <h2>Actividad reciente del curso</h2>
            <p>Últimos registros encontrados dentro del periodo seleccionado.</p>
          </div>
          <div className={styles.exportActions}>
            <button type="button" onClick={() => window.print()}>
              <ReportIcon name="print" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => exportCsv(data?.recent ?? [], course?.name || "curso")}
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
