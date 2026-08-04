import type { TeacherCoursePerformance } from "@/types/supervisor-reportes";

import styles from "./TeacherReport.module.css";

function complianceTone(value: number) {
  if (value >= 90) return styles.complianceExcellent;
  if (value >= 80) return styles.complianceGood;
  if (value >= 70) return styles.complianceWarning;
  return styles.complianceRisk;
}

export default function TeacherCourseTable({
  courses,
}: {
  courses: TeacherCoursePerformance[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.courseTable}>
        <thead>
          <tr>
            <th>Curso</th>
            <th>Aula y horario</th>
            <th>Sesiones</th>
            <th>Puntuales</th>
            <th>Tardanzas</th>
            <th>Inasistencias</th>
            <th>Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          {courses.length ? (
            courses.map((course) => (
              <tr key={`${course.semesterId}-${course.id}`}>
                <td>
                  <strong>{course.name}</strong>
                  <span>{course.code} · {course.semester}</span>
                </td>
                <td>
                  <strong>{course.classrooms || "Aula no registrada"}</strong>
                  <span>{course.schedule || "Horario no registrado"}</span>
                </td>
                <td>
                  <strong>{course.recordedSessions}/{course.plannedSessions}</strong>
                  <span>con registro / programadas</span>
                </td>
                <td><b className={styles.valueGreen}>{course.punctual}</b></td>
                <td><b className={styles.valueAmber}>{course.late}</b></td>
                <td><b className={styles.valueRed}>{course.absent}</b></td>
                <td>
                  <span className={`${styles.complianceBadge} ${complianceTone(course.complianceRate)}`}>
                    {course.complianceRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={7}>
                <strong>No hay cursos asignados en el periodo seleccionado</strong>
                <span>Prueba con otro semestre o amplía el rango de fechas.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
