import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import type { TeacherProfile } from "@/types/supervisor-reportes";

import styles from "./TeacherReport.module.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

export default function TeacherProfileCard({
  teacher,
}: {
  teacher: TeacherProfile;
}) {
  return (
    <article className={styles.profileCard}>
      <div className={styles.profileHero}>
        <div className={styles.avatar}>
          {teacher.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.photoUrl} alt="" />
          ) : (
            <span>{initials(teacher.name) || "D"}</span>
          )}
        </div>
        <div className={styles.profileIdentity}>
          <span className={styles.profileEyebrow}>Ficha del docente</span>
          <h2>{teacher.name}</h2>
          <p>{teacher.department || "Sin departamento registrado"}</p>
          <div className={styles.profileBadges}>
            <span className={teacher.active ? styles.activeBadge : styles.inactiveBadge}>
              <i />
              {teacher.active ? "Estado activo" : "Estado inactivo"}
            </span>
            {teacher.category ? <span>{teacher.category}</span> : null}
            {teacher.condition ? <span>{teacher.condition}</span> : null}
          </div>
        </div>
      </div>

      <div className={styles.profileDetails}>
        <div>
          <span>Código institucional</span>
          <strong>{teacher.code || "No registrado"}</strong>
        </div>
        <div>
          <span>Correo institucional</span>
          <strong>{teacher.email || "No registrado"}</strong>
        </div>
        <div>
          <span>Departamento</span>
          <strong>{teacher.departmentCode || "—"} · {teacher.department || "Sin asignar"}</strong>
        </div>
        <div>
          <span>Contacto</span>
          <strong>{teacher.phone || "No registrado"}</strong>
        </div>
      </div>

      <div className={styles.profileFooter}>
        <span><ReportIcon name="database" />Perfil académico verificado</span>
        <b>{teacher.dni ? `DNI ${teacher.dni}` : "DNI no visible"}</b>
      </div>
    </article>
  );
}
