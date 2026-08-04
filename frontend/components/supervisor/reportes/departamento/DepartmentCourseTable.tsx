import type {
  DepartmentCoursePerformance,
} from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

function complianceTone(value: number) {
  if (value >= 90) return styles.complianceExcellent;
  if (value >= 80) return styles.complianceGood;
  if (value >= 70) return styles.complianceWarning;
  return styles.complianceRisk;
}

export default function DepartmentCourseTable({
  courses,
}: {
  courses: DepartmentCoursePerformance[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.courseTable}>
        <thead>
          <tr>
            <th>Curso</th>
            <th>Docentes</th>
            <th>Programación</th>
            <th>Registros</th>
            <th>Puntuales</th>
            <th>Tardanzas</th>
            <th>Inasistencias</th>
            <th>Cobertura</th>
            <th>Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          {courses.length ? (
            courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <strong>{course.name}</strong>
                  <span>{course.code} · {course.credits} crédito(s)</span>
                </td>
                <td>
                  <strong>{course.assignedTeachers}</strong>
                  <span>docente(s) asignado(s)</span>
                </td>
                <td>
                  <strong>{course.scheduleSlots} bloque(s)</strong>
                  <span>{course.plannedSessions} sesiones programadas</span>
                </td>
                <td>
                  <strong>{course.totalRecords}</strong>
                  <span>{course.recordedSessions} sesión(es) con registro</span>
                </td>
                <td>
                  <b className={styles.valueGreen}>{course.punctual}</b>
                </td>
                <td>
                  <b className={styles.valueAmber}>{course.late}</b>
                </td>
                <td>
                  <b className={styles.valueRed}>{course.absent}</b>
                </td>
                <td>
                  <span
                    className={`${styles.complianceBadge} ${complianceTone(
                      course.coverageRate
                    )}`}
                  >
                    {course.coverageRate.toFixed(1)}%
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.complianceBadge} ${complianceTone(
                      course.complianceRate
                    )}`}
                  >
                    {course.complianceRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={9}>
                <strong>No existen cursos vinculados al departamento</strong>
                <span>Revisa la asignación académica o selecciona otro periodo.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
