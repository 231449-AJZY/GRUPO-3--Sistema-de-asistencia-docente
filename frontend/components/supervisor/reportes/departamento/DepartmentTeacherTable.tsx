import type {
  DepartmentTeacherPerformance,
} from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

function complianceTone(value: number) {
  if (value >= 90) return styles.complianceExcellent;
  if (value >= 80) return styles.complianceGood;
  if (value >= 70) return styles.complianceWarning;
  return styles.complianceRisk;
}

export default function DepartmentTeacherTable({
  teachers,
}: {
  teachers: DepartmentTeacherPerformance[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.courseTable}>
        <thead>
          <tr>
            <th>Docente</th>
            <th>Condición</th>
            <th>Cursos</th>
            <th>Sesiones</th>
            <th>Puntuales</th>
            <th>Tardanzas</th>
            <th>Inasistencias</th>
            <th>Cobertura</th>
            <th>Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          {teachers.length ? (
            teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>
                  <strong>{teacher.name}</strong>
                  <span>{teacher.code || "Sin código"} · {teacher.email || "Sin correo"}</span>
                </td>
                <td>
                  <strong>{teacher.category || "Sin categoría"}</strong>
                  <span>{teacher.condition || "Sin condición"}</span>
                </td>
                <td>
                  <strong>{teacher.assignedCourses}</strong>
                  <span>{teacher.scheduleSlots} bloque(s)</span>
                </td>
                <td>
                  <strong>
                    {teacher.recordedSessions}/{teacher.plannedSessions}
                  </strong>
                  <span>con registro / programadas</span>
                </td>
                <td>
                  <b className={styles.valueGreen}>{teacher.punctual}</b>
                </td>
                <td>
                  <b className={styles.valueAmber}>{teacher.late}</b>
                </td>
                <td>
                  <b className={styles.valueRed}>{teacher.absent}</b>
                </td>
                <td>
                  <span
                    className={`${styles.complianceBadge} ${complianceTone(
                      teacher.coverageRate
                    )}`}
                  >
                    {teacher.coverageRate.toFixed(1)}%
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.complianceBadge} ${complianceTone(
                      teacher.complianceRate
                    )}`}
                  >
                    {teacher.complianceRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={9}>
                <strong>No existen docentes en el departamento</strong>
                <span>Revisa el catálogo o selecciona otra unidad académica.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
