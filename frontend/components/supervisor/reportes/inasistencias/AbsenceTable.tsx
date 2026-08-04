import styles from "@/app/supervisor/reportes/inasistencias/page.module.css";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type { AbsenceReportRecord, AttendanceReportPagination } from "@/types/supervisor-reportes";

function formatDate(value?: string | null) {
  const [year, month, day] = String(value ?? "").slice(0,10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export default function AbsenceTable({ records, pagination, onPage }: { records: AbsenceReportRecord[]; pagination: AttendanceReportPagination; onPage: (page: number) => void; }) {
  return <>
    <div className={styles.tableScroller}>
      <table className={styles.recordsTable}>
        <thead><tr><th>Docente</th><th>Departamento</th><th>Contexto</th><th>Fecha</th><th>Horario</th><th>Estado</th><th>Fuente</th></tr></thead>
        <tbody>{records.length ? records.map((record) => (
          <tr key={record.id}>
            <td><strong>{record.teacher || "Docente no identificado"}</strong><span>{record.teacherCode || "Sin código"}</span></td>
            <td>{record.department || "Sin departamento"}</td>
            <td><strong>{record.course || "Ingreso institucional"}</strong><span>{record.courseCode || record.type || "—"}{record.classroom ? ` · ${record.classroom}` : ""}</span></td>
            <td>{formatDate(record.date)}</td>
            <td>{record.scheduledTime || record.registeredTime || "—"}</td>
            <td><span className={styles.absenceBadge}><ReportIcon name="warning" />{String(record.status || "AUSENTE").replaceAll("_", " ")}</span></td>
            <td><strong>{String(record.method || "Sin método").replaceAll("_", " ")}</strong><span>{record.source || "—"}</span></td>
          </tr>
        )) : <tr><td className={styles.emptyCell} colSpan={7}><ReportIcon name="check" /><strong>No hay inasistencias explícitas</strong><span>Los filtros seleccionados no devolvieron registros.</span></td></tr>}</tbody>
      </table>
    </div>
    <footer className={styles.paginationBar}>
      <p>Mostrando página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages}</strong> · {pagination.totalRecords} registro(s)</p>
      <div><button type="button" disabled={!pagination.hasPrevious} onClick={() => onPage(pagination.page-1)}><ReportIcon name="chevronLeft" />Anterior</button><button type="button" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page+1)}>Siguiente<ReportIcon name="chevronRight" /></button></div>
    </footer>
  </>;
}
