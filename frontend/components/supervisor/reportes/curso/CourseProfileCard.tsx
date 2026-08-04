import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type { CourseProfile } from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

function initials(code: string) {
  return code
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

export default function CourseProfileCard({
  course,
  classroomList,
}: {
  course: CourseProfile;
  classroomList?: string | null;
}) {
  return (
    <article className={styles.profileCard}>
      <div className={styles.profileHero}>
        <div className={styles.avatar}>
          <span>{initials(course.code) || "C"}</span>
        </div>
        <div className={styles.profileIdentity}>
          <span className={styles.profileEyebrow}>Ficha del curso</span>
          <h2>{course.name}</h2>
          <p>{course.department || "Sin departamento registrado"}</p>
          <div className={styles.profileBadges}>
            <span className={course.active ? styles.activeBadge : styles.inactiveBadge}>
              <i />
              {course.active ? "Curso activo" : "Curso inactivo"}
            </span>
            <span>{course.credits} crédito(s)</span>
          </div>
        </div>
      </div>

      <div className={styles.profileDetails}>
        <div>
          <span>Código del curso</span>
          <strong>{course.code}</strong>
        </div>
        <div>
          <span>Departamento</span>
          <strong>
            {course.departmentCode || "—"} · {course.department || "Sin asignar"}
          </strong>
        </div>
        <div>
          <span>Créditos</span>
          <strong>{course.credits}</strong>
        </div>
        <div>
          <span>Aulas utilizadas</span>
          <strong>{classroomList || "No registradas"}</strong>
        </div>
      </div>

      <div className={styles.profileFooter}>
        <span><ReportIcon name="database" />Estructura académica verificada</span>
        <b>ID {course.id}</b>
      </div>
    </article>
  );
}
