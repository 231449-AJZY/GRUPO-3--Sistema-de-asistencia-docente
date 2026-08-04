import type { SVGProps } from "react";

import type {
  ReportModuleId,
} from "@/types/supervisor-reportes";

interface ReportIconProps extends SVGProps<SVGSVGElement> {
  name: ReportModuleId | "refresh" | "calendar" | "arrow" | "database" | "clock" | "check" | "warning" | "filter" | "print" | "file" | "chevronLeft" | "chevronRight" | "search";
}

export default function ReportIcon({
  name,
  ...props
}: ReportIconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "asistencia":
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M9 19V5" />
          <path d="M14 19v-7" />
          <path d="M19 19V3" />
        </svg>
      );
    case "inasistencias":
      return (
        <svg {...common}>
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 16.5h.01" />
        </svg>
      );
    case "docente":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
        </svg>
      );
    case "curso":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8.5 7h7" />
          <path d="M8.5 11h7" />
          <path d="M8.5 15h4" />
        </svg>
      );
    case "departamento":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V9l7-5 7 5v12" />
          <path d="M9 21v-6h6v6" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
      );
    case "rango":
      return (
        <svg {...common}>
          <path d="M12 2v20M2 12h20" />
          <path d="m4.9 4.9 14.2 14.2M19.1 4.9 4.9 19.1" />
        </svg>
      );
    case "exportacion":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
          <path d="M5 21h14a2 2 0 0 0 2-2v-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9" />
          <path d="M5.8 15A7 7 0 0 0 17.6 17.6L20 15" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m14 7 5 5-5 5" />
        </svg>
      );
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 16.5h.01" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M4 5h16" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        </svg>
      );
    case "print":
      return (
        <svg {...common}>
          <path d="M6 9V3h12v6" />
          <rect x="6" y="14" width="12" height="7" rx="1" />
          <path d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
          <path d="M18 12h.01" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 2h8l4 4v16H6z" />
          <path d="M14 2v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      );
  }
}
