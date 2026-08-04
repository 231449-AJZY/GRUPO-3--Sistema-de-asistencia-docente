import Link from "next/link";

import ReportIcon from "@/components/supervisor/reportes/ReportIcon";
import styles from "@/app/supervisor/reportes/page.module.css";
import type {
  ReportModuleDefinition,
} from "@/types/supervisor-reportes";

const STATUS_LABELS: Record<
  ReportModuleDefinition["status"],
  string
> = {
  available: "Disponible",
  priority: "Prioritario",
  popular: "Más solicitado",
  academic: "Académico",
  institutional: "Institucional",
  flexible: "Flexible",
};

interface ReportModuleCardProps {
  module: ReportModuleDefinition;
  index: number;
}

export default function ReportModuleCard({
  module,
  index,
}: ReportModuleCardProps) {
  return (
    <Link
      href={module.href}
      className={`${styles.moduleCard} ${styles[`module${module.tone}`]}`}
      style={{ animationDelay: `${160 + index * 70}ms` }}
    >
      <div className={styles.moduleCardTop}>
        <span className={styles.moduleIcon}>
          <ReportIcon name={module.id} />
        </span>
        <span className={styles.moduleArrow}>
          <ReportIcon name="arrow" />
        </span>
      </div>

      <div className={styles.moduleCardBody}>
        <p>{module.eyebrow}</p>
        <h3>{module.title}</h3>
        <span>{module.description}</span>
      </div>

      <div className={styles.moduleCardFooter}>
        <span className={styles.moduleStatus}>
          {STATUS_LABELS[module.status]}
        </span>
        <span>Abrir análisis</span>
      </div>
    </Link>
  );
}
