"use client";

import styles from "@/app/supervisor/reportes/asistencia/page.module.css";
import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type {
  AttendanceReportPagination,
  AttendanceReportRecord,
} from "@/types/supervisor-reportes";

interface AttendanceTableProps {
  records: AttendanceReportRecord[];
  pagination: AttendanceReportPagination;
  onPageChange: (page: number) => void;
  busy?: boolean;
}

function formatDate(value?: string | null): string {
  const [year, month, day] = String(value ?? "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function statusClass(value?: string | null): string {
  const status = String(value ?? "").trim().toUpperCase();
  if (["PUNTUAL", "PRESENTE"].includes(status)) return "success";
  if (status === "TARDANZA") return "warning";
  if (["INASISTENCIA", "AUSENTE", "FALTA", "RECHAZADO", "RECHAZADA"].includes(status)) {
    return "danger";
  }
  return "neutral";
}

function statusLabel(value?: string | null): string {
  const status = String(value ?? "").trim();
  return status || "Sin clasificar";
}

function differenceLabel(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "A tiempo";
  if (value > 0) return `+${value} min`;
  return `${value} min`;
}

export default function AttendanceTable({
  records,
  pagination,
  onPageChange,
  busy = false,
}: AttendanceTableProps) {
  const start = pagination.totalRecords === 0
    ? 0
    : (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(
    pagination.page * pagination.pageSize,
    pagination.totalRecords
  );

  return (
    <div className={`${styles.tableRegion} ${busy ? styles.tableBusy : ""}`}>
      <div className={styles.tableScroller}>
        <table className={styles.recordsTable}>
          <thead>
            <tr>
              <th>Docente</th>
              <th>Curso / tipo</th>
              <th>Departamento</th>
              <th>Fecha</th>
              <th>Programada</th>
              <th>Registrada</th>
              <th>Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={8}>
                  <span className={styles.emptyIcon}>
                    <ReportIcon name="search" />
                  </span>
                  <strong>No hay registros con los filtros actuales</strong>
                  <p>Amplía el rango de fechas o limpia algún criterio.</p>
                </td>
              </tr>
            ) : records.map((record) => (
              <tr key={record.id}>
                <td>
                  <div className={styles.teacherCell}>
                    <span className={styles.teacherAvatar}>
                      {String(record.teacher ?? "D").trim().slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{record.teacher || "Docente sin nombre"}</strong>
                      <span>{record.teacherCode || record.email || "Sin código"}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.primaryCell}>
                    <strong>{record.course || "Ingreso institucional"}</strong>
                    <span>
                      {[record.courseCode, record.classroom].filter(Boolean).join(" · ") ||
                        record.type || "Registro institucional"}
                    </span>
                  </div>
                </td>
                <td>{record.department || "Sin departamento"}</td>
                <td>{formatDate(record.date)}</td>
                <td>{record.scheduledTime || "—"}</td>
                <td>{record.registeredTime || "—"}</td>
                <td>
                  <span
                    className={`${styles.differenceBadge} ${
                      (record.differenceMinutes ?? 0) > 0
                        ? styles.differenceLate
                        : styles.differenceOnTime
                    }`}
                  >
                    {differenceLabel(record.differenceMinutes)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${styles[`status${statusClass(record.status)}`]}`}
                  >
                    {statusLabel(record.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationBar}>
        <p>
          Mostrando <strong>{start}-{end}</strong> de{" "}
          <strong>{pagination.totalRecords.toLocaleString("es-PE")}</strong> registros
        </p>
        <div className={styles.paginationControls}>
          <button
            type="button"
            disabled={!pagination.hasPrevious || busy}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label="Página anterior"
          >
            <ReportIcon name="chevronLeft" />
          </button>
          <span>
            Página <strong>{pagination.page}</strong> de{" "}
            <strong>{pagination.totalPages}</strong>
          </span>
          <button
            type="button"
            disabled={!pagination.hasNext || busy}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label="Página siguiente"
          >
            <ReportIcon name="chevronRight" />
          </button>
        </div>
      </div>
    </div>
  );
}
