"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import TeacherCourseTable from "@/components/supervisor/reportes/docente/TeacherCourseTable";
import TeacherMetricCard from "@/components/supervisor/reportes/docente/TeacherMetricCard";
import TeacherPerformanceGauge from "@/components/supervisor/reportes/docente/TeacherPerformanceGauge";
import TeacherProfileCard from "@/components/supervisor/reportes/docente/TeacherProfileCard";
import TeacherRecentTable from "@/components/supervisor/reportes/docente/TeacherRecentTable";
import TeacherTrendChart from "@/components/supervisor/reportes/docente/TeacherTrendChart";
import styles from "@/components/supervisor/reportes/docente/TeacherReport.module.css";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import { useTeacherReport } from "@/hooks/supervisor/reportes/useTeacherReport";
import { clearSession, getToken } from "@/lib/auth";
import type {
  AttendanceReportRecord,
  TeacherReportFilters,
} from "@/types/supervisor-reportes";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaults(): TeacherReportFilters {
  const now = new Date();
  return {
    dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toIsoDate(now),
    teacherId: "",
    semesterId: "",
  };
}

function normalize(filters: TeacherReportFilters): TeacherReportFilters {
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

function exportCsv(records: AttendanceReportRecord[], teacherName: string) {
  const header = [
    "Docente",
    "Código",
    "Fecha",
    "Curso o contexto",
    "Aula",
    "Hora programada",
    "Hora registrada",
    "Estado",
    "Resultado",
    "Método",
    "Fuente",
  ];
  const rows = records.map((item) => [
    teacherName,
    item.teacherCode,
    item.date,
    item.course || item.type,
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
    new Blob([`\uFEFF${content}`], {
      type: "text/csv;charset=utf-8",
    })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-docente-${toIsoDate(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function TeacherReportPage() {
  const router = useRouter();
  const initial = useMemo(defaults, []);
  const [draft, setDraft] = useState<TeacherReportFilters>(initial);
  const [applied, setApplied] = useState<TeacherReportFilters>(initial);
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
  } = useTeacherReport({
    token,
    filters: applied,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (applied.teacherId || !catalogs?.teachers.length) return;
    const firstTeacher = String(catalogs.teachers[0].id);
    setDraft((current) => ({ ...current, teacherId: firstTeacher }));
    setApplied((current) => ({ ...current, teacherId: firstTeacher }));
  }, [applied.teacherId, catalogs]);

  function updateFilter<K extends keyof TeacherReportFilters>(
    key: K,
    value: TeacherReportFilters[K]
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
    const firstTeacher = catalogs?.teachers[0];
    if (firstTeacher) next.teacherId = String(firstTeacher.id);
    setDraft(next);
    setApplied(next);
  }

  if (catalogsLoading && !catalogs) {
    return (
      <LoadingState
        title="Preparando el reporte por docente"
        description="Cargando docentes, semestres y estructura académica."
        fullHeight
      />
    );
  }

  if (!catalogs?.teachers.length) {
    return (
      <ErrorState
        title="No existen docentes disponibles"
        description="El catálogo no contiene docentes activos para generar el reporte individual."
        retryText="Actualizar catálogo"
        onRetry={() => window.location.reload()}
        fullHeight
      />
    );
  }

  if (loading && applied.teacherId && !data) {
    return (
      <LoadingState
        title="Analizando el desempeño docente"
        description="Consolidando perfil, horarios, cursos, puntualidad, tendencias e incidencias."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el reporte por docente"
        description={error}
        retryText="Reintentar consulta"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  const summary = data?.summary;
  const teacher = data?.teacher;
  const selectedTeacher = catalogs.teachers.find(
    (item) => String(item.id) === draft.teacherId
  );
  const periodFrom = data?.period.from || applied.dateFrom;
  const periodTo = data?.period.to || applied.dateTo;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reportes · Análisis individual"
        title="Reporte por docente"
        description="Vista integral y animada del desempeño individual: carga académica, cumplimiento, puntualidad, evolución, cursos e historial verificable."
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
              disabled={refreshing || !applied.teacherId}
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
            <h2>Consulta individual</h2>
            <p>Selecciona un docente y delimita el semestre o periodo de análisis.</p>
          </div>
          <b>{data?.selectedSemester?.code || "Rango personalizado"}</b>
        </div>

        <div className={styles.filterGrid}>
          <label className={styles.teacherSelector}>
            <span>Buscar docente</span>
            <div className={styles.selectWithIcon}>
              <ReportIcon name="search" />
              <select
                value={draft.teacherId}
                onChange={(event) =>
                  updateFilter("teacherId", event.target.value)
                }
              >
                {catalogs.teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.codigo ? ` · ${item.codigo}` : ""}
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
              disabled={!draft.teacherId}
            >
              <ReportIcon name="search" />
              Consultar docente
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
          <span>{teacher?.name || selectedTeacher?.nombre || "Docente seleccionado"}</span>
          <b>{summary?.plannedSessions ?? 0} sesiones programadas</b>
        </div>
      </section>

      {teacher ? (
        <section className={styles.overviewGrid}>
          <TeacherProfileCard teacher={teacher} />

          <div className={styles.metricsGrid}>
            <TeacherMetricCard
              label="Cursos asignados"
              value={summary?.assignedCourses ?? 0}
              detail={`${summary?.scheduleSlots ?? 0} bloques horarios activos`}
              icon="curso"
              tone="blue"
              delay={0}
            />
            <TeacherMetricCard
              label="Asistencias"
              value={summary?.attendanceCount ?? 0}
              detail={`${summary?.punctual ?? 0} registros puntuales`}
              delta={data?.comparison.attendancePercent}
              icon="check"
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
              detail={`${summary?.punctualityRate ?? 0}% de puntualidad`}
              delta={data?.comparison.compliancePoints}
              deltaUnit="points"
              icon="docente"
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
            <p>Mejor desempeño</p>
            <strong>{data?.insights.bestCourse?.name || "Sin datos suficientes"}</strong>
            <small>
              {data?.insights.bestCourse
                ? `${data.insights.bestCourse.complianceRate.toFixed(1)}% de cumplimiento`
                : "Aún no existen cursos evaluables"}
            </small>
          </div>
        </article>

        <article className={`${styles.insightCard} ${styles.insightWarning}`}>
          <span><ReportIcon name="warning" /></span>
          <div>
            <p>Curso que requiere atención</p>
            <strong>{data?.insights.attentionCourse?.name || "Sin alertas académicas"}</strong>
            <small>
              {data?.insights.attentionCourse
                ? `${data.insights.attentionCourse.complianceRate.toFixed(1)}% de cumplimiento`
                : "No se detectaron cursos evaluables"}
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
            <p>Cobertura del periodo</p>
            <strong>{summary?.plannedSessions ?? 0} sesiones programadas</strong>
            <small>{summary?.coursesWithActivity ?? 0} cursos con actividad registrada</small>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Detalle académico</span>
            <h2>Desempeño por curso</h2>
            <p>Cursos asignados, horarios, sesiones programadas y cumplimiento alcanzado.</p>
          </div>
          <span className={styles.tableCount}>{data?.courses.length ?? 0} curso(s)</span>
        </header>
        <TeacherCourseTable courses={data?.courses ?? []} />
      </section>

      <section className={styles.scopeCard}>
        <span><ReportIcon name="database" /></span>
        <div>
          <strong>Alcance y fidelidad del reporte</strong>
          <p>{data?.insights.scopeNote || "Los datos proceden de la estructura académica y del historial unificado."}</p>
        </div>
        <b>Sin datos simulados</b>
      </section>

      <section className={styles.panel}>
        <header className={styles.tableHeader}>
          <div>
            <span>Trazabilidad</span>
            <h2>Actividad reciente del docente</h2>
            <p>Últimos registros encontrados dentro del periodo seleccionado.</p>
          </div>
          <div className={styles.exportActions}>
            <button type="button" onClick={() => window.print()}>
              <ReportIcon name="print" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() =>
                exportCsv(data?.recent ?? [], teacher?.name || "docente")
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
