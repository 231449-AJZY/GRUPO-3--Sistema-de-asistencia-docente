"use client";

import { useEffect, useMemo, useState } from "react";

import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type { ReportModuleId } from "@/types/supervisor-reportes";

import styles from "./TeacherReport.module.css";

interface TeacherMetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  detail: string;
  delta?: number;
  deltaUnit?: "percent" | "points";
  icon: ReportModuleId | "clock" | "check" | "warning" | "calendar";
  tone: "blue" | "green" | "amber" | "red" | "violet";
  delay?: number;
}

export default function TeacherMetricCard({
  label,
  value,
  suffix = "",
  detail,
  delta,
  deltaUnit = "percent",
  icon,
  tone,
  delay = 0,
}: TeacherMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const totalFrames = 34;
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setDisplayValue(value * Math.min(progress, 1));
      if (frame >= totalFrames) window.clearInterval(timer);
    }, 24);

    return () => window.clearInterval(timer);
  }, [reducedMotion, value]);

  const formatted = Number.isInteger(value)
    ? Math.round(displayValue).toLocaleString("es-PE")
    : displayValue.toLocaleString("es-PE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <article
      className={`${styles.metricCard} ${styles[`metric_${tone}`]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}>
          <ReportIcon name={icon} />
        </span>
        {hasDelta ? (
          <span
            className={`${styles.metricDelta} ${
              positive ? styles.deltaPositive : styles.deltaNegative
            }`}
          >
            {positive ? "↑" : "↓"} {Math.abs(delta ?? 0).toFixed(1)}
            {deltaUnit === "points" ? " pt" : "%"}
          </span>
        ) : (
          <span className={styles.metricQuiet}>Periodo actual</span>
        )}
      </div>
      <p>{label}</p>
      <strong>
        {formatted}
        {suffix}
      </strong>
      <span>{detail}</span>
    </article>
  );
}
