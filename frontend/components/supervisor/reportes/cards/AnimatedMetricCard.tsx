"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import styles from "@/app/supervisor/reportes/page.module.css";

interface AnimatedMetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  detail: string;
  icon: "asistencia" | "docente" | "curso" | "departamento";
  tone: "blue" | "green" | "amber" | "purple";
  delay?: number;
  trend?: number[];
}

function useAnimatedNumber(
  target: number,
  duration = 780,
  delay = 0
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let timeout = 0;
    const safeTarget = Number.isFinite(target) ? target : 0;

    timeout = window.setTimeout(() => {
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(safeTarget * eased);

        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };

      frame = window.requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, duration, target]);

  return value;
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => {
    if (values.length === 0) {
      return "0,24 100,24";
    }

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);

    return values
      .map((value, index) => {
        const x = values.length === 1
          ? 50
          : (index / (values.length - 1)) * 100;
        const y = 28 - ((value - min) / span) * 22;
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

export default function AnimatedMetricCard({
  label,
  value,
  suffix = "",
  detail,
  icon,
  tone,
  delay = 0,
  trend = [],
}: AnimatedMetricCardProps) {
  const animated = useAnimatedNumber(value, 760, delay);
  const displayValue = suffix === "%"
    ? animated.toLocaleString("es-PE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    : Math.round(animated).toLocaleString("es-PE");

  return (
    <article
      className={`${styles.metricCard} ${styles[`metric${tone}`]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.metricTopRow}>
        <span className={styles.metricIcon}>
          <ReportIcon name={icon} />
        </span>
        <span className={styles.metricPulse} aria-hidden="true" />
      </div>

      <div>
        <p className={styles.metricLabel}>{label}</p>
        <strong className={styles.metricValue}>
          {displayValue}
          {suffix}
        </strong>
        <p className={styles.metricDetail}>{detail}</p>
      </div>

      {trend.length > 1 ? <Sparkline values={trend} /> : null}
    </article>
  );
}
