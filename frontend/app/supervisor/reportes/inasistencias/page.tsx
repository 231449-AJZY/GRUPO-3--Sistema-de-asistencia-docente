"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import AbsenceMetricCard from "@/components/supervisor/reportes/inasistencias/AbsenceMetricCard";
import { AbsenceDepartmentBars, AbsenceTeacherRanking } from "@/components/supervisor/reportes/inasistencias/AbsenceRankings";
import AbsenceScopeDonut from "@/components/supervisor/reportes/inasistencias/AbsenceScopeDonut";
import AbsenceTable from "@/components/supervisor/reportes/inasistencias/AbsenceTable";
import AbsenceTrendChart from "@/components/supervisor/reportes/inasistencias/AbsenceTrendChart";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import { useAbsenceReport } from "@/hooks/supervisor/reportes/useAbsenceReport";
import { clearSession, getToken } from "@/lib/auth";
import type { AbsenceReportFilters, AbsenceReportRecord } from "@/types/supervisor-reportes";
import styles from "./page.module.css";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2,"0");
  const day = String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function defaults(): AbsenceReportFilters {
  const now = new Date();
  return { dateFrom: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toIsoDate(now), teacherId: "", courseCode: "", department: "", type: "" };
}

function normalize(filters: AbsenceReportFilters) {
  if (filters.dateFrom <= filters.dateTo) return filters;
  return { ...filters, dateFrom: filters.dateTo, dateTo: filters.dateFrom };
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(records: AbsenceReportRecord[]) {
  const header = ["Docente","Código","Departamento","Contexto","Curso","Código curso","Aula","Fecha","Hora programada","Estado","Método","Fuente"];
  const rows = records.map((item) => [item.teacher,item.teacherCode,item.department,item.type,item.course,item.courseCode,item.classroom,item.date,item.scheduledTime,item.status,item.method,item.source]);
  const content = [header,...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `reporte-inasistencias-${toIsoDate(new Date())}.csv`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export default function AbsenceReportPage() {
  const router = useRouter();
  const initial = useMemo(defaults, []);
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [page, setPage] = useState(1);
  const token = getToken();
  const unauthorized = useCallback(() => { clearSession(); router.replace("/login"); }, [router]);
  const { data, catalogs, loading, refreshing, catalogsLoading, error, lastUpdated, reload } = useAbsenceReport({ token, filters: applied, page, pageSize: 12, onUnauthorized: unauthorized });
  const summary = data?.summary;
  const activeFilters = [applied.teacherId, applied.courseCode, applied.department, applied.type].filter(Boolean).length;
  const trend = data?.trend ?? [];
  const trendValues = trend.map((item) => item.total);

  function setFilter<K extends keyof AbsenceReportFilters>(key: K, value: AbsenceReportFilters[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function apply() { setApplied(normalize(draft)); setPage(1); }
  function reset() { const next = defaults(); setDraft(next); setApplied(next); setPage(1); }

  if (loading && !data) return <LoadingState title="Analizando inasistencias" description="Consolidando incidencias explícitas, tendencias, departamentos y reincidencia docente." fullHeight />;
  if (error && !data) return <ErrorState title="No se pudo abrir el reporte de inasistencias" description={error} retryText="Reintentar consulta" onRetry={() => void reload()} fullHeight />;

  return <div className={styles.page}>
    <PageHeader
      eyebrow="Reportes · Seguimiento crítico"
      title="Reporte de inasistencias"
      description="Análisis institucional de ausencias explícitas con evolución animada, reincidencia, concentración por departamento y trazabilidad por docente."
      badge={<span className={styles.liveBadge}><span />Datos reales</span>}
      actions={<div className={styles.headerActions}>
        <Link className={styles.backLink} href="/supervisor/reportes"><ReportIcon name="chevronLeft" />Volver a reportes</Link>
        <span className={styles.updatedAt}><ReportIcon name="clock" />{lastUpdated ? lastUpdated.toLocaleTimeString("es-PE") : "Pendiente"}</span>
        <button className={styles.refreshButton} type="button" onClick={() => void reload()} disabled={refreshing}><ReportIcon name="refresh" />{refreshing ? "Actualizando" : "Actualizar"}</button>
      </div>}
    />

    {error ? <div className={styles.inlineWarning}><ReportIcon name="warning" /><span>{error}</span></div> : null}

    <section className={styles.periodStrip}>
      <div><span className={styles.periodIcon}><ReportIcon name="calendar" /></span><div><p>Periodo analizado</p><strong>{displayDate(data?.period.from ?? applied.dateFrom)} – {displayDate(data?.period.to ?? applied.dateTo)}</strong></div></div>
      <div className={styles.periodMeta}><span>{activeFilters ? `${activeFilters} filtro(s) activo(s)` : "Vista institucional completa"}</span><span>{data?.summary.totalAbsences ?? 0} ausencia(s) explícita(s)</span></div>
    </section>

    <section className={styles.metricsGrid}>
      <AbsenceMetricCard label="Inasistencias explícitas" value={summary?.totalAbsences ?? 0} detail="Estados AUSENTE, FALTA o INASISTENCIA" comparison={data?.comparison.totalAbsencesPercent} icon="inasistencias" tone="red" trend={trendValues} delay={0} />
      <AbsenceMetricCard label="Docentes afectados" value={summary?.affectedTeachers ?? 0} detail="Docentes con al menos una incidencia" comparison={data?.comparison.affectedTeachersPercent} icon="docente" tone="orange" trend={trendValues.slice(-7)} delay={80} />
      <AbsenceMetricCard label="Docentes recurrentes" value={summary?.recurrentTeachers ?? 0} detail="Dos o más inasistencias en el periodo" comparison={data?.comparison.recurrentTeachersPercent} icon="warning" tone="violet" trend={(data?.teachers ?? []).map((item) => item.total)} delay={160} />
      <AbsenceMetricCard label="Cursos afectados" value={summary?.affectedCourses ?? 0} detail={`${summary?.courseAbsences ?? 0} incidencias asociadas a cursos`} comparison={data?.comparison.courseAbsencesPercent} icon="curso" tone="blue" trend={(data?.departments ?? []).map((item) => item.course)} delay={240} />
    </section>

    <section className={styles.filterPanel}>
      <header className={styles.filterHeading}><span><ReportIcon name="filter" /></span><div><h2>Filtros avanzados</h2><p>Combina periodo, docente, curso, departamento y contexto.</p></div>{activeFilters ? <b>{activeFilters} activos</b> : null}</header>
      <div className={styles.filterGrid}>
        <label><span>Desde</span><input type="date" value={draft.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)} /></label>
        <label><span>Hasta</span><input type="date" value={draft.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)} /></label>
        <label><span>Docente</span><select value={draft.teacherId} onChange={(e) => setFilter("teacherId", e.target.value)} disabled={catalogsLoading}><option value="">Todos los docentes</option>{catalogs?.teachers.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        <label><span>Curso</span><select value={draft.courseCode} onChange={(e) => setFilter("courseCode", e.target.value)} disabled={catalogsLoading}><option value="">Todos los cursos</option>{catalogs?.courses.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}</select></label>
        <label><span>Departamento</span><select value={draft.department} onChange={(e) => setFilter("department", e.target.value)} disabled={catalogsLoading}><option value="">Todos los departamentos</option>{catalogs?.departments.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select></label>
        <label><span>Contexto</span><select value={draft.type} onChange={(e) => setFilter("type", e.target.value)}><option value="">Todos los contextos</option><option value="CURSO">Curso</option><option value="INGRESO_INSTITUCIONAL">Ingreso institucional</option></select></label>
      </div>
      <div className={styles.filterActions}><button type="button" className={styles.resetButton} onClick={reset}>Restablecer</button><button type="button" className={styles.applyButton} onClick={apply}><ReportIcon name="search" />Aplicar filtros</button></div>
    </section>

    <section className={styles.analyticsGrid}>
      <article className={styles.panel}><header className={styles.panelHeader}><div><span>Distribución</span><h2>Contexto de las inasistencias</h2><p>Separación entre incidencias de curso e ingreso institucional.</p></div><b>Periodo actual</b></header><AbsenceScopeDonut course={summary?.courseAbsences ?? 0} institutional={summary?.institutionalAbsences ?? 0} total={summary?.totalAbsences ?? 0} /></article>
      <article className={`${styles.panel} ${styles.widePanel}`}><header className={styles.panelHeader}><div><span>Evolución</span><h2>Comportamiento diario</h2><p>Movimiento temporal de inasistencias por contexto.</p></div><b>Animación activa</b></header><AbsenceTrendChart data={trend} /></article>
    </section>

    <section className={styles.secondaryGrid}>
      <article className={styles.panel}><header className={styles.panelHeader}><div><span>Concentración</span><h2>Departamentos con mayor incidencia</h2><p>Volumen y docentes afectados por unidad académica.</p></div></header><AbsenceDepartmentBars data={data?.departments ?? []} /></article>
      <article className={styles.panel}><header className={styles.panelHeader}><div><span>Reincidencia</span><h2>Docentes con más inasistencias</h2><p>Ranking descriptivo para priorizar seguimiento.</p></div></header><AbsenceTeacherRanking data={data?.teachers ?? []} /></article>
    </section>

    <section className={styles.scopeCard}><span><ReportIcon name="database" /></span><div><strong>Alcance y fidelidad del dato</strong><p>{data?.dataScope.note ?? "El sistema reporta únicamente estados de inasistencia explícitos."}</p></div><b>Sin inferencias</b></section>

    <section className={styles.tablePanel}>
      <header className={styles.tableHeader}><div><span>Detalle verificable</span><h2>Registros de inasistencia</h2><p>Información devuelta por el historial unificado, sin convertir automáticamente faltas de marcación en ausencias.</p></div><div className={styles.exportActions}><button type="button" onClick={() => window.print()}><ReportIcon name="print" />Imprimir / PDF</button><button type="button" onClick={() => exportCsv(data?.records ?? [])}><ReportIcon name="file" />Exportar CSV</button></div></header>
      <AbsenceTable records={data?.records ?? []} pagination={data?.pagination ?? { page: 1, pageSize: 12, totalRecords: 0, totalPages: 1, hasPrevious: false, hasNext: false }} onPage={setPage} />
    </section>
  </div>;
}
