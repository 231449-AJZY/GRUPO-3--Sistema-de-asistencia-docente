"use client";

import { useId, useMemo } from "react";

import type { ReportTrendPoint } from "@/types/supervisor-reportes";

import styles from "./TeacherReport.module.css";

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return month && day ? `${day}/${month}` : value;
}

export default function TeacherTrendChart({
  data,
}: {
  data: ReportTrendPoint[];
}) {
  const gradientId = useId().replace(/:/g, "");
  const width = 760;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 24;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.punctual, item.late, item.absent]),
    1
  );

  const paths = useMemo(() => {
    const make = (key: "punctual" | "late" | "absent") =>
      data
        .map((item, index) => {
          const x =
            data.length <= 1
              ? left + plotWidth / 2
              : left + (index / (data.length - 1)) * plotWidth;
          const y = top + plotHeight - (item[key] / maxValue) * plotHeight;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

    return {
      punctual: make("punctual"),
      late: make("late"),
      absent: make("absent"),
    };
  }, [data, maxValue, plotHeight, plotWidth]);

  const areaPath = data.length
    ? `${paths.punctual} L ${left + plotWidth} ${top + plotHeight} L ${left} ${
        top + plotHeight
      } Z`
    : "";

  if (!data.length) {
    return (
      <div className={styles.chartEmpty}>
        <strong>Sin actividad en el periodo</strong>
        <span>Modifica el docente, semestre o rango de fechas.</span>
      </div>
    );
  }

  const labels = data.filter(
    (_, index) =>
      index === 0 ||
      index === data.length - 1 ||
      index % Math.max(Math.ceil(data.length / 5), 1) === 0
  );

  return (
    <div className={styles.trendChart}>
      <div className={styles.chartLegend}>
        <span><i className={styles.legendGreen} />Puntuales</span>
        <span><i className={styles.legendAmber} />Tardanzas</span>
        <span><i className={styles.legendRed} />Inasistencias</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity=".24" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity=".01" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((step) => {
          const y = top + (step / 4) * plotHeight;
          return (
            <line
              key={step}
              className={styles.gridLine}
              x1={left}
              x2={left + plotWidth}
              y1={y}
              y2={y}
            />
          );
        })}

        {areaPath ? (
          <path d={areaPath} fill={`url(#${gradientId})`} />
        ) : null}
        <path className={`${styles.chartLine} ${styles.lineGreen}`} d={paths.punctual} />
        <path className={`${styles.chartLine} ${styles.lineAmber}`} d={paths.late} />
        <path className={`${styles.chartLine} ${styles.lineRed}`} d={paths.absent} />

        {labels.map((item) => {
          const index = data.indexOf(item);
          const x =
            data.length <= 1
              ? left + plotWidth / 2
              : left + (index / (data.length - 1)) * plotWidth;
          return (
            <text
              key={`${item.date}-${index}`}
              className={styles.axisLabel}
              x={x}
              y={height - 12}
              textAnchor="middle"
            >
              {shortDate(item.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
