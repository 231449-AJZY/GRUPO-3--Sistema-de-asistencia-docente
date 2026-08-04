"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/supervisor/reportes/inasistencias/page.module.css";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";

type IconName = "inasistencias" | "docente" | "curso" | "warning";

interface Props {
  label: string;
  value: number;
  detail: string;
  comparison?: number;
  icon: IconName;
  tone: "red" | "orange" | "violet" | "blue";
  trend?: number[];
  delay?: number;
}

function useCountUp(target: number, delay: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 720, 1);
        setValue(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [delay, target]);
  return value;
}

export default function AbsenceMetricCard({
  label, value, detail, comparison, icon, tone, trend = [], delay = 0,
}: Props) {
  const animated = useCountUp(value, delay);
  const points = useMemo(() => {
    if (trend.length < 2) return "0,28 100,28";
    const max = Math.max(...trend, 1);
    return trend.map((item, index) => {
      const x = (index / (trend.length - 1)) * 100;
      const y = 30 - (item / max) * 23;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
  }, [trend]);
  const comparisonClass = comparison === undefined || comparison === 0
    ? styles.neutral
    : comparison < 0 ? styles.positive : styles.negative;

  return (
    <article
      className={`${styles.metricCard} ${styles[`metric${tone}`]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}><ReportIcon name={icon} /></span>
        {comparison !== undefined ? (
          <span className={`${styles.deltaBadge} ${comparisonClass}`}>
            {comparison > 0 ? "+" : ""}{comparison.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p>{label}</p>
      <strong>{Math.round(animated).toLocaleString("es-PE")}</strong>
      <span>{detail}</span>
      <svg className={styles.sparkline} viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} />
      </svg>
    </article>
  );
}
