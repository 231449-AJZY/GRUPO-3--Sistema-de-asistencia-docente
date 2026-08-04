import type { CSSProperties } from "react";

import styles from "@/app/supervisor/reportes/page.module.css";

interface DonutSegment {
  label: string;
  value: number;
  tone: "punctual" | "late" | "absent" | "other";
}

interface AnimatedDonutProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}

export default function AnimatedDonut({
  segments,
  centerValue,
  centerLabel,
}: AnimatedDonutProps) {
  const total = segments.reduce(
    (sum, segment) => sum + Math.max(segment.value, 0),
    0
  );
  let offset = 0;

  return (
    <div className={styles.donutLayout}>
      <div className={styles.donutWrap}>
        <svg
          className={styles.donut}
          viewBox="0 0 120 120"
          role="img"
          aria-label="Distribución de estados de asistencia"
        >
          <circle
            className={styles.donutTrack}
            cx="60"
            cy="60"
            r="46"
            pathLength="100"
          />

          {segments.map((segment, index) => {
            const percentage = total > 0
              ? (segment.value / total) * 100
              : 0;
            const currentOffset = offset;
            offset += percentage;

            const style = {
              "--segment-size": `${percentage} 100`,
              "--segment-offset": `${-currentOffset}`,
              "--segment-delay": `${index * 130 + 120}ms`,
            } as CSSProperties;

            return (
              <circle
                key={segment.label}
                className={`${styles.donutSegment} ${styles[`donut${segment.tone}`]}`}
                cx="60"
                cy="60"
                r="46"
                pathLength="100"
                style={style}
              />
            );
          })}
        </svg>

        <div className={styles.donutCenter}>
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className={styles.donutLegend}>
        {segments.map((segment) => {
          const percentage = total > 0
            ? Math.round((segment.value / total) * 1000) / 10
            : 0;

          return (
            <div key={segment.label} className={styles.legendRow}>
              <span
                className={`${styles.legendDot} ${styles[`legend${segment.tone}`]}`}
              />
              <span>{segment.label}</span>
              <strong>{percentage}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
