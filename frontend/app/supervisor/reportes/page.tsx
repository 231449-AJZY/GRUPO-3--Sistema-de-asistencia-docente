"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import AnimatedAreaChart from "@/components/supervisor/reportes/charts/AnimatedAreaChart";
import AnimatedDonut from "@/components/supervisor/reportes/charts/AnimatedDonut";
import DepartmentBars from "@/components/supervisor/reportes/charts/DepartmentBars";
import AnimatedMetricCard from "@/components/supervisor/reportes/cards/AnimatedMetricCard";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import ReportModuleCard from "@/components/supervisor/reportes/ReportModuleCard";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import {
  useReportSummary,
} from "@/hooks/supervisor/reportes/useReportSummary";
import {
  clearSession,
  getToken,
} from "@/lib/auth";
import type {
  ReportModuleDefinition,
  ReportRecentRecord,
} from "@/types/supervisor-reportes";

import styles from "./page.module.css";

const MODULES: ReportModuleDefinition[] = [
  {
    id: "asistencia",
    title: "Reporte de asistencia",
    description:
      "Evolución, puntualidad, tardanzas y registros institucionales.",
    eyebrow: "Control operativo",
    status: "available",
    href: "/supervisor/reportes/asistencia",
    tone: "blue",
  },
  {
    id: "inasistencias",
    title: "Reporte de inasistencias",
    description:
      "Ausencias, justificaciones y concentración de incidencias.",
    eyebrow: "Seguimiento crítico",
    status: "priority",
    href: "/supervisor/reportes/inasistencias",
    tone: "red",
  },
  {
    id: "docente",
    title: "Reporte por docente",
    description:
      "Resumen individual, cursos, asistencia y evolución personal.",
    eyebrow: "Análisis individual",
    status: "popular",
    href: "/supervisor/reportes/docente",
    tone: "green",
  },
  {
    id: "curso",
    title: "Reporte por curso",
    description:
      "Cumplimiento por asignatura, sesiones, aula y horario.",
    eyebrow: "Lectura académica",
    status: "academic",
    href: "/supervisor/reportes/curso",
    tone: "amber",
  },
  {
    id: "departamento",
    title: "Reporte por departamento",
    description:
      "Comparación entre unidades académicas y desempeño agregado.",
    eyebrow: "Visión institucional",
    status: "institutional",
    href: "/supervisor/reportes/departamento",
    tone: "indigo",
  },
  {
    id: "rango",
    title: "Reporte por rango de fechas",
    description:
      "Exploración flexible de resultados dentro de cualquier periodo.",
    eyebrow: "Consulta avanzada",
    status: "flexible",
    href: "/supervisor/reportes/rango",
    tone: "orange",
  },
  {
    id: "exportacion",
    title: "Centro de exportación",
    description:
      "Preparación, vista previa y descarga de entregables institucionales.",
    eyebrow: "Salida documental",
    status: "available",
    href: "/supervisor/reportes/exportacion",
    tone: "purple",
  },
];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthPeriod() {
  const now = new Date();
  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoDate(now),
  };
}

function formatDate(value?: string | null): string {
  const clean = String(value ?? "").slice(0, 10);
  const [year, month, day] = clean.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function formatTime(value?: string | null): string {
  return String(value ?? "").slice(0, 5) || "—";
}

function formatDateTime(value: Date | null): string {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function statusTone(value?: string | null): string {
  const status = String(value ?? "").trim().toUpperCase();
  if (status === "PUNTUAL" || status === "PRESENTE") return "success";
  if (status === "TARDANZA") return "warning";
  if (["INASISTENCIA", "AUSENTE", "FALTA", "RECHAZADA"].includes(status)) {
    return "danger";
  }
  return "neutral";
}

function recordContext(record: ReportRecentRecord): string {
  if (record.course) {
    return `${record.course}${record.classroom ? ` · ${record.classroom}` : ""}`;
  }
  return record.type === "INGRESO_INSTITUCIONAL"
    ? "Ingreso institucional"
    : "Registro institucional";
}

export default function SupervisorReportsPage() {
  const router = useRouter();
  const defaultPeriod = useMemo(currentMonthPeriod, []);
  const [dateFrom, setDateFrom] = useState(defaultPeriod.from);
  const [dateTo, setDateTo] = useState(defaultPeriod.to);
  const [appliedFrom, setAppliedFrom] = useState(defaultPeriod.from);
  const [appliedTo, setAppliedTo] = useState(defaultPeriod.to);
  const token = getToken();

  const handleUnauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  const {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    reload,
  } = useReportSummary({
    token,
    dateFrom: appliedFrom,
    dateTo: appliedTo,
    onUnauthorized: handleUnauthorized,
  });

  const trendValues = data?.trend.map((item) => item.total) ?? [];
  const punctualTrend = data?.trend.map((item) => item.punctual) ?? [];
  const summary = data?.summary;

  function applyPeriod() {
    if (!dateFrom || !dateTo) return;
    if (dateFrom <= dateTo) {
      setAppliedFrom(dateFrom);
      setAppliedTo(dateTo);
    } else {
      setAppliedFrom(dateTo);
      setAppliedTo(dateFrom);
      setDateFrom(dateTo);
      setDateTo(dateFrom);
    }
  }

  function resetPeriod() {
    const period = currentMonthPeriod();
    setDateFrom(period.from);
    setDateTo(period.to);
    setAppliedFrom(period.from);
    setAppliedTo(period.to);
  }

  if (loading && !data) {
    return (
      <LoadingState
        title="Construyendo el centro de reportes"
        description="Consolidando métricas, tendencias, departamentos y registros recientes."
        fullHeight
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo abrir el módulo de reportes"
        description={error}
        retryText="Reintentar conexión"
        onRetry={() => void reload()}
        fullHeight
      />
    );
  }

  const donutSegments = [
    {
      label: "Puntuales",
      value: summary?.punctual ?? 0,
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
      label: "Otros estados",
      value: Math.max(
        (summary?.totalRecords ?? 0) -
          (summary?.punctual ?? 0) -
          (summary?.late ?? 0) -
          (summary?.absent ?? 0),
        0
      ),
      tone: "other" as const,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Inteligencia institucional"
        title="Módulo de reportes"
        description="Una vista ejecutiva y dinámica de la asistencia docente, con métricas reales, tendencias animadas y accesos especializados."
        badge={
          <span className={styles.liveBadge}>
            <span />
            Datos reales
          </span>
        }
        actions={
          <div className={styles.headerActions}>
            <span className={styles.updatedAt}>
              <ReportIcon name="clock" />
              Actualizado {formatDateTime(lastUpdated)}
            </span>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => void reload()}
              disabled={refreshing}
            >
              <ReportIcon name="refresh" />
              {refreshing ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
        }
      />

      <section className={styles.periodPanel}>
        <div className={styles.periodHeading}>
          <span className={styles.periodIcon}>
            <ReportIcon name="calendar" />
          </span>
          <div>
            <p>Periodo de análisis</p>
            <strong>Actualiza todo el tablero con un solo filtro</strong>
          </div>
        </div>

        <div className={styles.periodControls}>
          <label>
            <span>Fecha inicial</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label>
            <span>Fecha final</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
          <button type="button" className={styles.applyButton} onClick={applyPeriod}>
            Aplicar periodo
          </button>
          <button type="button" className={styles.resetButton} onClick={resetPeriod}>
            Mes actual
          </button>
        </div>
      </section>

      {error ? (
        <div className={styles.inlineWarning} role="status">
          <strong>La última actualización no se completó.</strong>
          <span>{error}. Se mantienen visibles los datos anteriores.</span>
        </div>
      ) : null}

      <section className={styles.metricsGrid} aria-label="Indicadores principales">
        <AnimatedMetricCard
          label="Registros del periodo"
          value={summary?.totalRecords ?? 0}
          detail={`${summary?.teachersWithRecords ?? 0} docentes con actividad`}
          icon="asistencia"
          tone="blue"
          delay={30}
          trend={trendValues}
        />
        <AnimatedMetricCard
          label="Cumplimiento"
          value={summary?.complianceRate ?? 0}
          suffix="%"
          detail={`${summary?.attendanceCount ?? 0} asistencias contabilizadas`}
          icon="docente"
          tone="green"
          delay={110}
          trend={punctualTrend}
        />
        <AnimatedMetricCard
          label="Tardanzas"
          value={summary?.late ?? 0}
          detail={`${summary?.punctualityRate?.toFixed(1) ?? "0.0"}% de puntualidad`}
          icon="curso"
          tone="amber"
          delay={190}
          trend={data?.trend.map((item) => item.late) ?? []}
        />
        <AnimatedMetricCard
          label="Departamentos activos"
          value={summary?.activeDepartments ?? 0}
          detail={`${summary?.activeTeachers ?? 0} docentes registrados`}
          icon="departamento"
          tone="purple"
          delay={270}
          trend={data?.departments.map((item) => item.total) ?? []}
        />
      </section>

      <section className={styles.analyticsGrid}>
        <article className={`${styles.analyticsCard} ${styles.trendCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <p>Evolución temporal</p>
              <h2>Registros por fecha</h2>
            </div>
            <span className={styles.cardPill}>
              {formatDate(appliedFrom)} — {formatDate(appliedTo)}
            </span>
          </div>
          <AnimatedAreaChart data={data?.trend ?? []} />
          <div className={styles.chartFooterStats}>
            <span>
              <i className={styles.blueDot} />
              {summary?.courseRecords ?? 0} registros de curso
            </span>
            <span>
              <i className={styles.indigoDot} />
              {summary?.institutionalEntries ?? 0} ingresos institucionales
            </span>
          </div>
        </article>

        <article className={`${styles.analyticsCard} ${styles.donutCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <p>Distribución</p>
              <h2>Estado de asistencia</h2>
            </div>
            <span className={styles.cardPill}>Periodo actual</span>
          </div>
          <AnimatedDonut
            segments={donutSegments}
            centerValue={`${summary?.complianceRate?.toFixed(1) ?? "0.0"}%`}
            centerLabel="cumplimiento"
          />
        </article>
      </section>

      <section className={styles.modulesSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p>Exploración especializada</p>
            <h2>Elige el tipo de reporte</h2>
            <span>
              Cada vista será reconstruida progresivamente con la misma arquitectura premium.
            </span>
          </div>
          <Link href="/supervisor/reportes/legacy" className={styles.legacyLink}>
            Abrir centro anterior
            <ReportIcon name="arrow" />
          </Link>
        </div>

        <div className={styles.modulesGrid}>
          {MODULES.map((module, index) => (
            <ReportModuleCard key={module.id} module={module} index={index} />
          ))}
        </div>
      </section>

      <section className={styles.lowerGrid}>
        <article className={styles.analyticsCard}>
          <div className={styles.cardHeader}>
            <div>
              <p>Comparación institucional</p>
              <h2>Cumplimiento por departamento</h2>
            </div>
            <Link
              href="/supervisor/reportes/departamento"
              className={styles.textLink}
            >
              Ver detalle
              <ReportIcon name="arrow" />
            </Link>
          </div>
          <DepartmentBars data={data?.departments ?? []} />
        </article>

        <article className={`${styles.analyticsCard} ${styles.recentCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <p>Actividad reciente</p>
              <h2>Últimos registros</h2>
            </div>
            <span className={styles.sourceBadge}>
              <ReportIcon name="database" />
              API de reportes
            </span>
          </div>

          <div className={styles.recentList}>
            {(data?.recent ?? []).length > 0 ? (
              data?.recent.map((record, index) => (
                <div
                  key={`${record.id}-${index}`}
                  className={styles.recentItem}
                  style={{ animationDelay: `${220 + index * 65}ms` }}
                >
                  <span className={styles.recentAvatar}>
                    {String(record.teacher ?? "D").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className={styles.recentMain}>
                    <strong>{record.teacher || "Docente no informado"}</strong>
                    <span>{recordContext(record)}</span>
                  </div>
                  <div className={styles.recentMeta}>
                    <span
                      className={`${styles.statusBadge} ${styles[`status${statusTone(record.status)}`]}`}
                    >
                      {record.status || record.result || "Registrado"}
                    </span>
                    <small>
                      {formatDate(record.date)} · {formatTime(record.time)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.chartEmpty}>
                No hay registros recientes dentro del periodo seleccionado.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className={styles.integrityStrip}>
        <div>
          <span className={styles.integrityIcon}>
            <ReportIcon name="database" />
          </span>
          <div>
            <strong>Fuente consolidada</strong>
            <p>
              El tablero usa <code>/api/reportes/resumen</code> y evita la consulta repetitiva por cada docente.
            </p>
          </div>
        </div>
        <span>
          {summary?.activeCourses ?? 0} cursos · {summary?.semesters ?? 0} semestres
        </span>
      </section>
    </div>
  );
}
