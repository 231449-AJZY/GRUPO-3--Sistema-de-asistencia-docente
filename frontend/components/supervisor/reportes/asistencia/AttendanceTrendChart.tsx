"use client";

import {
  useMemo,
} from "react";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";
import type {
  ReportTrendPoint,
} from "@/types/supervisor-reportes";

interface AttendanceTrendChartProps {
  data: ReportTrendPoint[];
}

interface ChartPoint {
  x: number;
  punctualY: number;
  lateY: number;
  total: number;
  punctual: number;
  late: number;
  date: string;
}

function shortDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function pointsToPath(points: ChartPoint[], key: "punctualY" | "lateY"): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point[key]}`)
    .join(" ");
}

export default function AttendanceTrendChart({
  data,
}: AttendanceTrendChartProps) {
  const chart = useMemo(() => {
    const width = 760;
    const height = 300;
    const left = 42;
    const right = 18;
    const top = 24;
    const bottom = 42;
    const maxValue = Math.max(
      ...data.flatMap((item) => [item.punctual, item.late, item.total]),
      1
    );
    const innerWidth = width - left - right;
    const innerHeight = height - top - bottom;
    const points = data.map((item, index) => {
      const x = data.length <= 1
        ? left + innerWidth / 2
        : left + (index / (data.length - 1)) * innerWidth;
      return {
        x,
        punctualY: top + innerHeight - (item.punctual / maxValue) * innerHeight,
        lateY: top + innerHeight - (item.late / maxValue) * innerHeight,
        total: item.total,
        punctual: item.punctual,
        late: item.late,
        date: item.date,
      };
    });
    const punctualPath = pointsToPath(points, "punctualY");
    const latePath = pointsToPath(points, "lateY");
    const areaPath = points.length > 0
      ? `${punctualPath} L ${points[points.length - 1].x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`
      : "";

    return {
      width,
      height,
      left,
      top,
      bottom,
      innerHeight,
      maxValue,
      points,
      punctualPath,
      latePath,
      areaPath,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <strong>Sin evolución disponible</strong>
        <span>Ajusta el rango o los filtros para visualizar datos.</span>
      </div>
    );
  }

  const labelStep = Math.max(Math.ceil(data.length / 7), 1);

  return (
    <div className={styles.trendChartWrap}>
      <svg
        className={styles.trendChart}
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Evolución diaria de asistencias puntuales y tardanzas"
      >
        <defs>
          <linearGradient id="attendanceArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((line) => {
          const y = chart.top + (line / 4) * chart.innerHeight;
          const value = Math.round(chart.maxValue * (1 - line / 4));
          return (
            <g key={line}>
              <line
                className={styles.chartGrid}
                x1={chart.left}
                x2={chart.width - 18}
                y1={y}
                y2={y}
              />
              <text className={styles.chartAxisLabel} x="4" y={y + 4}>
                {value}
              </text>
            </g>
          );
        })}

        <path className={styles.trendArea} d={chart.areaPath} />
        <path className={styles.punctualLine} d={chart.punctualPath} />
        <path className={styles.lateLine} d={chart.latePath} />

        {chart.points.map((point, index) => (
          <g className={styles.chartPointGroup} key={`${point.date}-${index}`}>
            <circle
              className={styles.punctualPoint}
              cx={point.x}
              cy={point.punctualY}
              r="4"
            />
            <circle
              className={styles.latePoint}
              cx={point.x}
              cy={point.lateY}
              r="3.5"
            />
            <title>
              {`${point.date}: ${point.punctual} puntuales, ${point.late} tardanzas`}
            </title>
            {index % labelStep === 0 || index === chart.points.length - 1 ? (
              <text
                className={styles.chartDateLabel}
                x={point.x}
                y={chart.height - 13}
                textAnchor="middle"
              >
                {shortDate(point.date)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>

      <div className={styles.chartLegend}>
        <span><i className={styles.punctualLegend} />Puntuales y presentes</span>
        <span><i className={styles.lateLegend} />Tardanzas</span>
      </div>
    </div>
  );
}
