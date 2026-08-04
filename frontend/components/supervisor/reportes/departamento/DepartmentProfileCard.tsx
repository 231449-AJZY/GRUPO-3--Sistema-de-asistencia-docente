import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type { DepartmentProfile } from "@/types/supervisor-reportes";

import styles from "../docente/TeacherReport.module.css";

function initials(code: string) {
  return code
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

export default function DepartmentProfileCard({
  department,
  activeTeachers,
  activeCourses,
}: {
  department: DepartmentProfile;
  activeTeachers: number;
  activeCourses: number;
}) {
  return (
    <article className={styles.profileCard}>
      <div className={styles.profileHero}>
        <div className={styles.avatar}>
          <span>{initials(department.code) || "D"}</span>
        </div>
        <div className={styles.profileIdentity}>
          <span className={styles.profileEyebrow}>
            Unidad académica
          </span>
          <h2>{department.name}</h2>
          <p>Código institucional {department.code}</p>
          <div className={styles.profileBadges}>
            <span
              className={
                department.active
                  ? styles.activeBadge
                  : styles.inactiveBadge
              }
            >
              <i />
              {department.active
                ? "Departamento activo"
                : "Departamento inactivo"}
            </span>
            <span>{activeTeachers} docente(s)</span>
          </div>
        </div>
      </div>

      <div className={styles.profileDetails}>
        <div>
          <span>Código</span>
          <strong>{department.code}</strong>
        </div>
        <div>
          <span>Docentes activos</span>
          <strong>{activeTeachers}</strong>
        </div>
        <div>
          <span>Cursos activos</span>
          <strong>{activeCourses}</strong>
        </div>
        <div>
          <span>Estado institucional</span>
          <strong>{department.active ? "Habilitado" : "Inactivo"}</strong>
        </div>
      </div>

      <div className={styles.profileFooter}>
        <span>
          <ReportIcon name="database" />
          Catálogo académico verificado
        </span>
        <b>ID {department.id}</b>
      </div>
    </article>
  );
}
