"use client";

import { useMemo } from "react";

import styles from "@/app/supervisor/reportes/page.module.css";
import type {
  ReportTrendPoint,
} from "@/types/supervisor-reportes";

interface AnimatedAreaChartProps {
  data: ReportTrendPoint[];
}

function shortDate(value: string): string {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}

export default function AnimatedAreaChart({
  data,
}: AnimatedAreaChartProps) {
  const model = useMemo(() => {
    const values = data.length > 0
      ? data
      : [
          { date: "—", total: 0, punctual: 0, late: 0, absent: 0 },
          { date: "—", total: 0, punctual: 0, late: 0, absent: 0 },
        ];
    const width = 720;
    const height = 228;
    const left = 32;
    const right = 14;
    const top = 18;
    const bottom = 35;
    const usableWidth = width - left - right;
    const usableHeight = height - top - bottom;
    const max = Math.max(...values.map((item) => item.total), 1);

    const points = values.map((item, index) => {
      const x = left +
        (index / Math.max(values.length - 1, 1)) * usableWidth;
      const y = top + usableHeight - (item.total / max) * usableHeight;
      return { ...item, x, y };
    });

    const line = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(" ");
    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L${last.x.toFixed(2)} ${(top + usableHeight).toFixed(2)} L${first.x.toFixed(2)} ${(top + usableHeight).toFixed(2)} Z`;
    const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: top + usableHeight - ratio * usableHeight,
      value: Math.round(max * ratio),
    }));

    const labelStep = Math.max(1, Math.ceil(points.length / 7));
    const labels = points.filter(
      (_point, index) =>
        index === 0 ||
        index === points.length - 1 ||
        index % labelStep === 0
    );

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      usableHeight,
      line,
      area,
      points,
      grid,
      labels,
    };
  }, [data]);

  return (
    <div className={styles.areaChartWrap}>
      <svg
        className={styles.areaChart}
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-label="Evolución de registros de asistencia por fecha"
      >
        <defs>
          <linearGradient id="reportsAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {model.grid.map((line) => (
          <g key={line.y}>
            <line
              className={styles.chartGridLine}
              x1={model.left}
              x2={model.width - model.right}
              y1={line.y}
              y2={line.y}
            />
            <text
              className={styles.chartAxisText}
              x={model.left - 8}
              y={line.y + 4}
              textAnchor="end"
            >
              {line.value}
            </text>
          </g>
        ))}

        <path
          className={styles.chartArea}
          d={model.area}
          fill="url(#reportsAreaGradient)"
        />
        <path className={styles.chartLine} d={model.line} pathLength="1" />

        {model.points.map((point, index) => (
          <g key={`${point.date}-${index}`} className={styles.chartPointGroup}>
            <circle
              className={styles.chartPointHalo}
              cx={point.x}
              cy={point.y}
              r="7"
            />
            <circle
              className={styles.chartPoint}
              cx={point.x}
              cy={point.y}
              r="3.5"
            />
            <title>
              {`${shortDate(point.date)}: ${point.total} registros`}
            </title>
          </g>
        ))}

        {model.labels.map((point) => (
          <text
            key={`label-${point.date}-${point.x}`}
            className={styles.chartDateText}
            x={point.x}
            y={model.height - 9}
            textAnchor="middle"
          >
            {shortDate(point.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
