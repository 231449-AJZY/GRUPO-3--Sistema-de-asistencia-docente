import type { CourseTeacherPerformance } from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

function complianceTone(value: number) {
  if (value >= 90) return styles.complianceExcellent;
  if (value >= 80) return styles.complianceGood;
  if (value >= 70) return styles.complianceWarning;
  return styles.complianceRisk;
}

export default function CourseTeacherTable({
  teachers,
}: {
  teachers: CourseTeacherPerformance[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.courseTable}>
        <thead>
          <tr>
            <th>Docente</th>
            <th>Aula y horario</th>
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
                  <span>{teacher.code || "Sin código"} · {teacher.department || "Sin departamento"}</span>
                </td>
                <td>
                  <strong>{teacher.classrooms || "Aula no registrada"}</strong>
                  <span>{teacher.schedule || "Horario no registrado"}</span>
                </td>
                <td>
                  <strong>{teacher.recordedSessions}/{teacher.plannedSessions}</strong>
                  <span>con registro / programadas</span>
                </td>
                <td><b className={styles.valueGreen}>{teacher.punctual}</b></td>
                <td><b className={styles.valueAmber}>{teacher.late}</b></td>
                <td><b className={styles.valueRed}>{teacher.absent}</b></td>
                <td>
                  <span className={`${styles.complianceBadge} ${complianceTone(teacher.coverageRate)}`}>
                    {teacher.coverageRate.toFixed(1)}%
                  </span>
                </td>
                <td>
                  <span className={`${styles.complianceBadge} ${complianceTone(teacher.complianceRate)}`}>
                    {teacher.complianceRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className={styles.emptyTableCell} colSpan={8}>
                <strong>No hay docentes asignados en el periodo seleccionado</strong>
                <span>Prueba con otro semestre o amplía el rango de fechas.</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
