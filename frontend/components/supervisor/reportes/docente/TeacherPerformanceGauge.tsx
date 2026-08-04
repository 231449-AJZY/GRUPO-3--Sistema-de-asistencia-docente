"use client";

import { useMemo } from "react";

import styles from "./TeacherReport.module.css";

interface TeacherPerformanceGaugeProps {
  compliance: number;
  punctual: number;
  late: number;
  absent: number;
}

export default function TeacherPerformanceGauge({
  compliance,
  punctual,
  late,
  absent,
}: TeacherPerformanceGaugeProps) {
  const safeCompliance = Math.max(0, Math.min(100, compliance));
  const total = Math.max(punctual + late + absent, 1);
  const segments = useMemo(
    () => [
      {
        label: "Puntuales",
        value: punctual,
        percent: (punctual / total) * 100,
        className: styles.legendGreen,
      },
      {
        label: "Tardanzas",
        value: late,
        percent: (late / total) * 100,
        className: styles.legendAmber,
      },
      {
        label: "Inasistencias",
        value: absent,
        percent: (absent / total) * 100,
        className: styles.legendRed,
      },
    ],
    [absent, late, punctual, total]
  );

  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeCompliance / 100) * circumference;

  return (
    <div className={styles.gaugeLayout}>
      <div className={styles.gaugeShell}>
        <svg viewBox="0 0 220 220" role="img" aria-label={`Cumplimiento ${safeCompliance}%`}>
          <defs>
            <linearGradient id="teacherGaugeGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="55%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle className={styles.gaugeTrack} cx="110" cy="110" r={radius} />
          <circle
            className={styles.gaugeValue}
            cx="110"
            cy="110"
            r={radius}
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className={styles.gaugeCenter}>
          <strong>{safeCompliance.toFixed(1)}%</strong>
          <span>Cumplimiento</span>
          <small>{punctual + late + absent} registros evaluados</small>
        </div>
      </div>

      <div className={styles.gaugeLegend}>
        {segments.map((segment) => (
          <div key={segment.label}>
            <i className={segment.className} />
            <span>
              <b>{segment.label}</b>
              <small>{segment.percent.toFixed(1)}% del total evaluado</small>
            </span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
