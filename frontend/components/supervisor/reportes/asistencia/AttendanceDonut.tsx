"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";

interface DonutSegment {
  label: string;
  value: number;
  tone: "punctual" | "late" | "absent" | "other";
}

interface AttendanceDonutProps {
  segments: DonutSegment[];
  centerValue: number;
  centerLabel: string;
}

const CIRCUMFERENCE = 2 * Math.PI * 48;

export default function AttendanceDonut({
  segments,
  centerValue,
  centerLabel,
}: AttendanceDonutProps) {
  const [ready, setReady] = useState(false);
  const total = useMemo(
    () => Math.max(segments.reduce((sum, item) => sum + item.value, 0), 1),
    [segments]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [segments]);

  let offset = 0;

  return (
    <div className={styles.donutLayout}>
      <div className={styles.donutWrap}>
        <svg
          className={styles.donutSvg}
          viewBox="0 0 120 120"
          role="img"
          aria-label="Distribución de estados de asistencia"
        >
          <circle className={styles.donutTrack} cx="60" cy="60" r="48" />
          {segments.map((segment) => {
            const length = (segment.value / total) * CIRCUMFERENCE;
            const currentOffset = offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                className={`${styles.donutSegment} ${styles[`donut${segment.tone}`]}`}
                cx="60"
                cy="60"
                r="48"
                strokeDasharray={`${ready ? length : 0} ${CIRCUMFERENCE}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
        <div className={styles.donutCenter}>
          <strong>{centerValue.toFixed(1)}%</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className={styles.donutLegend}>
        {segments.map((segment) => {
          const percentage = total > 0
            ? Math.round((segment.value / total) * 1000) / 10
            : 0;
          return (
            <div className={styles.legendRow} key={segment.label}>
              <span
                className={`${styles.legendDot} ${styles[`legend${segment.tone}`]}`}
              />
              <div>
                <span>{segment.label}</span>
                <small>{percentage.toFixed(1)}%</small>
              </div>
              <strong>{segment.value.toLocaleString("es-PE")}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
