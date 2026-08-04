import styles from "@/app/supervisor/reportes/inasistencias/page.module.css";
import type { AbsenceDepartmentPoint, AbsenceTeacherPoint } from "@/types/supervisor-reportes";

function initials(value?: string | null) {
  return String(value ?? "?").split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export function AbsenceDepartmentBars({ data }: { data: AbsenceDepartmentPoint[] }) {
  const max = Math.max(...data.map((item) => item.total), 1);
  if (!data.length) return <div className={styles.rankEmpty}>Sin departamentos para mostrar.</div>;
  return <div className={styles.departmentList}>{data.map((item, index) => (
    <div className={styles.departmentItem} key={item.department}>
      <div className={styles.departmentHeading}><span>{index+1}</span><div><strong>{item.department}</strong><small>{item.teachers} docente(s)</small></div><b>{item.total}</b></div>
      <div className={styles.barTrack}><span style={{ width: `${(item.total/max)*100}%`, animationDelay: `${index*60}ms` }} /></div>
      <div className={styles.barMeta}><span>{item.course} en cursos</span><span>{item.institutional} institucionales</span></div>
    </div>
  ))}</div>;
}

export function AbsenceTeacherRanking({ data }: { data: AbsenceTeacherPoint[] }) {
  if (!data.length) return <div className={styles.rankEmpty}>Sin docentes con inasistencias en el periodo.</div>;
  return <div className={styles.teacherList}>{data.map((item, index) => (
    <div className={styles.teacherItem} key={item.teacherId}>
      <span className={styles.teacherPosition}>{index+1}</span>
      <span className={styles.teacherAvatar}>{initials(item.teacher)}</span>
      <div className={styles.teacherCopy}><strong>{item.teacher || "Docente no identificado"}</strong><span>{item.department || "Sin departamento"} · última: {item.lastDate || "—"}</span></div>
      <div className={styles.teacherTotals}><strong>{item.total}</strong><span>{item.course} curso / {item.institutional} inst.</span></div>
    </div>
  ))}</div>;
}
