"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/supervisor/reportes/inasistencias/page.module.css";

interface Props {
  course: number;
  institutional: number;
  total: number;
}

const C = 2 * Math.PI * 48;

export default function AbsenceScopeDonut({ course, institutional, total }: Props) {
  const [ready, setReady] = useState(false);
  const safeTotal = useMemo(() => Math.max(course + institutional, 1), [course, institutional]);
  const courseLength = (course / safeTotal) * C;
  const institutionalLength = (institutional / safeTotal) * C;
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [course, institutional]);

  return (
    <div className={styles.donutLayout}>
      <div className={styles.donutWrap}>
        <svg className={styles.donutSvg} viewBox="0 0 120 120" role="img" aria-label="Distribución de inasistencias por alcance">
          <circle className={styles.donutTrack} cx="60" cy="60" r="48" />
          <circle className={`${styles.donutSegment} ${styles.courseSegment}`} cx="60" cy="60" r="48"
            strokeDasharray={`${ready ? courseLength : 0} ${C}`} />
          <circle className={`${styles.donutSegment} ${styles.institutionalSegment}`} cx="60" cy="60" r="48"
            strokeDasharray={`${ready ? institutionalLength : 0} ${C}`}
            strokeDashoffset={-courseLength} />
        </svg>
        <div className={styles.donutCenter}>
          <strong>{total.toLocaleString("es-PE")}</strong>
          <span>inasistencias</span>
        </div>
      </div>
      <div className={styles.donutLegend}>
        {[
          { label: "En cursos", value: course, className: styles.courseDot },
          { label: "Ingreso institucional", value: institutional, className: styles.institutionalDot },
        ].map((item) => (
          <div className={styles.legendRow} key={item.label}>
            <i className={item.className} />
            <div><span>{item.label}</span><small>{((item.value / safeTotal) * 100).toFixed(1)}%</small></div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
