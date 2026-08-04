import type { AttendanceReportRecord } from "@/types/supervisor-reportes";

import styles from "./TeacherReport.module.css";

function statusClass(status?: string | null) {
  const value = String(status ?? "").toUpperCase();
  if (["PUNTUAL", "PRESENTE"].includes(value)) return styles.statusSuccess;
  if (value === "TARDANZA") return styles.statusWarning;
  if (["INASISTENCIA", "AUSENTE", "FALTA", "RECHAZADA"].includes(value)) {
    return styles.statusDanger;
  }
  return styles.statusNeutral;
}

function displayDate(value?: string | null) {
  const clean = String(value ?? "").slice(0, 10);
  const [year, month, day] = clean.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export default function TeacherRecentTable({
  records,
}: {
  records: AttendanceReportRecord[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.recentTable}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Contexto</th>
            <th>Programada</th>
            <th>Registrada</th>
            <th>Estado</th>
            <th>Método</th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map((record) => (
              <tr key={record.id}>
                <td><strong>{displayDate(record.date)}</strong></td>
                <td>
                  <strong>{record.course || "Ingreso institucional"}</strong>
                  <span>{record.classroom || record.type || "Registro general"}</span>
                </td>
                <td>{record.scheduledTime || "—"}</td>
                <td>{record.registeredTime || "—"}</td>
                <td>
                  <span className={`${styles.statusBadge} ${statusClass(record.status)}`}>
                    {record.status || record.result || "SIN ESTADO"}
                  </span>
                </td>
                <td>
                  <strong>{record.method || "Sin método"}</strong>
                  <span>{record.source || "Fuente no registrada"}</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={6}>
                <strong>No existen registros recientes</strong>
                <span>El docente no presenta actividad en el periodo consultado.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
