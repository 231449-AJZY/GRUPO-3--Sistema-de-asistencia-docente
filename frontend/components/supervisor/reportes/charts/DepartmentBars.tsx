import styles from "@/app/supervisor/reportes/page.module.css";
import type {
  ReportDepartmentPoint,
} from "@/types/supervisor-reportes";

interface DepartmentBarsProps {
  data: ReportDepartmentPoint[];
}

function compactName(value: string): string {
  const clean = value.trim();
  return clean.length > 34 ? `${clean.slice(0, 32)}…` : clean;
}

export default function DepartmentBars({
  data,
}: DepartmentBarsProps) {
  const visible = data.slice(0, 6);

  if (visible.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        Todavía no hay registros departamentales en el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className={styles.departmentBars}>
      {visible.map((item, index) => (
        <div key={item.department} className={styles.departmentBarRow}>
          <div className={styles.departmentBarLabel}>
            <span title={item.department}>{compactName(item.department)}</span>
            <strong>{item.complianceRate.toFixed(1)}%</strong>
          </div>
          <div className={styles.departmentBarTrack}>
            <span
              className={styles.departmentBarFill}
              style={{
                width: `${Math.max(Math.min(item.complianceRate, 100), 0)}%`,
                animationDelay: `${180 + index * 100}ms`,
              }}
            />
          </div>
          <div className={styles.departmentBarMeta}>
            <span>{item.total.toLocaleString("es-PE")} registros</span>
            <span>{item.late} tardanzas</span>
          </div>
        </div>
      ))}
    </div>
  );
}
