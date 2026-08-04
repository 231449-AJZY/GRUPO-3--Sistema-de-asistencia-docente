"use client";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";
import type {
  AttendanceWeekdayPoint,
} from "@/types/supervisor-reportes";

const DAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 7, label: "Dom" },
];

interface AttendanceWeekdayBarsProps {
  data: AttendanceWeekdayPoint[];
}

export default function AttendanceWeekdayBars({
  data,
}: AttendanceWeekdayBarsProps) {
  const normalized = DAYS.map((day) => {
    const found = data.find((item) => item.weekday === day.id);
    return {
      ...day,
      punctual: found?.punctual ?? 0,
      late: found?.late ?? 0,
      absent: found?.absent ?? 0,
      total: found?.total ?? 0,
    };
  });
  const max = Math.max(
    ...normalized.flatMap((item) => [item.punctual, item.late, item.absent]),
    1
  );

  return (
    <div className={styles.weekdayChart}>
      <div className={styles.weekdayGrid} aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className={styles.weekdayColumns}>
        {normalized.map((item, index) => (
          <div className={styles.weekdayGroup} key={item.id}>
            <div className={styles.weekdayBars}>
              <span
                className={styles.weekdayPunctual}
                style={{
                  height: `${Math.max((item.punctual / max) * 100, item.punctual ? 5 : 0)}%`,
                  animationDelay: `${index * 60}ms`,
                }}
                title={`${item.punctual} puntuales/presentes`}
              />
              <span
                className={styles.weekdayLate}
                style={{
                  height: `${Math.max((item.late / max) * 100, item.late ? 5 : 0)}%`,
                  animationDelay: `${index * 60 + 80}ms`,
                }}
                title={`${item.late} tardanzas`}
              />
              <span
                className={styles.weekdayAbsent}
                style={{
                  height: `${Math.max((item.absent / max) * 100, item.absent ? 5 : 0)}%`,
                  animationDelay: `${index * 60 + 160}ms`,
                }}
                title={`${item.absent} inasistencias`}
              />
            </div>
            <strong>{item.label}</strong>
            <small>{item.total}</small>
          </div>
        ))}
      </div>
      <div className={styles.weekdayLegend}>
        <span><i className={styles.weekdayPunctualDot} />Puntuales</span>
        <span><i className={styles.weekdayLateDot} />Tardanzas</span>
        <span><i className={styles.weekdayAbsentDot} />Inasistencias</span>
      </div>
    </div>
  );
}
