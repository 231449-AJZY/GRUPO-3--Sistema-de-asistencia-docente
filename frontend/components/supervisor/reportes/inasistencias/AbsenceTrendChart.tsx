"use client";

import { useMemo } from "react";
import styles from "@/app/supervisor/reportes/inasistencias/page.module.css";
import type { AbsenceTrendPoint } from "@/types/supervisor-reportes";

interface Point { x: number; courseY: number; institutionalY: number; item: AbsenceTrendPoint; }

function path(points: Point[], key: "courseY" | "institutionalY") {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point[key]}`).join(" ");
}

export default function AbsenceTrendChart({ data }: { data: AbsenceTrendPoint[] }) {
  const chart = useMemo(() => {
    const width = 760, height = 300, left = 44, right = 18, top = 24, bottom = 42;
    const max = Math.max(...data.flatMap((item) => [item.course, item.institutional, item.total]), 1);
    const innerW = width - left - right, innerH = height - top - bottom;
    const points = data.map((item, index) => ({
      x: data.length < 2 ? left + innerW / 2 : left + (index / (data.length - 1)) * innerW,
      courseY: top + innerH - (item.course / max) * innerH,
      institutionalY: top + innerH - (item.institutional / max) * innerH,
      item,
    }));
    return { width, height, left, right, top, bottom, innerH, max, points,
      coursePath: path(points, "courseY"), institutionalPath: path(points, "institutionalY") };
  }, [data]);

  if (!data.length) return <div className={styles.chartEmpty}><strong>Sin evolución disponible</strong><span>Amplía el rango o modifica los filtros.</span></div>;
  const step = Math.max(Math.ceil(data.length / 7), 1);

  return (
    <div className={styles.trendWrap}>
      <svg className={styles.trendChart} viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" role="img" aria-label="Evolución diaria de inasistencias">
        {[0,1,2,3,4].map((line) => {
          const y = chart.top + (line / 4) * chart.innerH;
          return <g key={line}><line className={styles.gridLine} x1={chart.left} x2={chart.width-chart.right} y1={y} y2={y} /><text className={styles.axisLabel} x="5" y={y+4}>{Math.round(chart.max*(1-line/4))}</text></g>;
        })}
        <path className={styles.courseLine} d={chart.coursePath} />
        <path className={styles.institutionalLine} d={chart.institutionalPath} />
        {chart.points.map((point, index) => (
          <g key={`${point.item.date}-${index}`}>
            <circle className={styles.coursePoint} cx={point.x} cy={point.courseY} r="4" />
            <circle className={styles.institutionalPoint} cx={point.x} cy={point.institutionalY} r="3.5" />
            <title>{`${point.item.date}: ${point.item.course} en curso, ${point.item.institutional} institucionales`}</title>
            {index % step === 0 || index === chart.points.length - 1 ? <text className={styles.dateLabel} x={point.x} y={chart.height-13} textAnchor="middle">{point.item.date.slice(5).split("-").reverse().join("/")}</text> : null}
          </g>
        ))}
      </svg>
      <div className={styles.chartLegend}><span><i className={styles.courseLegend} />Cursos</span><span><i className={styles.institutionalLegend} />Ingreso institucional</span></div>
    </div>
  );
}
