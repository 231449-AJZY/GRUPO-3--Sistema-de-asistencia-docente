import type { CourseScheduleBlock } from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

export default function CourseScheduleTable({
  schedules,
}: {
  schedules: CourseScheduleBlock[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.recentTable}>
        <thead>
          <tr>
            <th>Día</th>
            <th>Horario</th>
            <th>Aula</th>
            <th>Docente</th>
            <th>Semestre</th>
            <th>Sesiones</th>
          </tr>
        </thead>
        <tbody>
          {schedules.length ? (
            schedules.map((schedule) => (
              <tr key={schedule.id}>
                <td><strong>{schedule.day}</strong></td>
                <td>
                  <strong>{schedule.startTime} – {schedule.endTime}</strong>
                  <span>Bloque #{schedule.id}</span>
                </td>
                <td>{schedule.classroom || "—"}</td>
                <td>
                  <strong>{schedule.teacher}</strong>
                  <span>{schedule.teacherCode || "Sin código"}</span>
                </td>
                <td>{schedule.semester}</td>
                <td>
                  <strong>{schedule.recordedSessions}/{schedule.plannedSessions}</strong>
                  <span>con registro / programadas</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={6}>
                <strong>No existen bloques horarios activos</strong>
                <span>El curso no tiene programación que intersecte el periodo.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
