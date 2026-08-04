"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";

interface AttendanceMetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  detail: string;
  comparison?: number;
  comparisonUnit?: "percent" | "points";
  inverseComparison?: boolean;
  icon: "asistencia" | "check" | "clock" | "departamento";
  tone: "blue" | "green" | "amber" | "purple";
  trend?: number[];
  delay?: number;
}

function useCountUp(target: number, delay: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const safeTarget = Number.isFinite(target) ? target : 0;

    timer = window.setTimeout(() => {
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / 760, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(safeTarget * eased);
        if (progress < 1) frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, target]);

  return value;
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => {
    if (values.length < 2) return "0,26 100,26";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);

    return values
      .map((item, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 29 - ((item - min) / span) * 23;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg
      className={styles.metricSparkline}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} />
    </svg>
  );
}

function comparisonLabel(
  value: number,
  unit: "percent" | "points"
): string {
  const sign = value > 0 ? "+" : "";
  return unit === "points"
    ? `${sign}${value.toFixed(1)} ptos.`
    : `${sign}${value.toFixed(1)}%`;
}

export default function AttendanceMetricCard({
  label,
  value,
  suffix = "",
  detail,
  comparison,
  comparisonUnit = "percent",
  inverseComparison = false,
  icon,
  tone,
  trend = [],
  delay = 0,
}: AttendanceMetricCardProps) {
  const animated = useCountUp(value, delay);
  const display = suffix === "%"
    ? animated.toLocaleString("es-PE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : Math.round(animated).toLocaleString("es-PE");
  const comparisonTone = comparison === undefined
    ? "neutral"
    : comparison === 0
      ? "neutral"
      : (comparison > 0) !== inverseComparison
        ? "positive"
        : "negative";

  return (
    <article
      className={`${styles.metricCard} ${styles[`metric${tone}`]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.metricTopRow}>
        <span className={styles.metricIcon}>
          <ReportIcon name={icon} />
        </span>
        {comparison !== undefined ? (
          <span
            className={`${styles.comparisonBadge} ${styles[comparisonTone]}`}
          >
            {comparisonLabel(comparison, comparisonUnit)}
          </span>
        ) : null}
      </div>

      <div className={styles.metricCopy}>
        <p>{label}</p>
        <strong>
          {display}
          {suffix}
        </strong>
        <span>{detail}</span>
      </div>

      {trend.length > 1 ? <Sparkline values={trend} /> : null}
    </article>
  );
}
