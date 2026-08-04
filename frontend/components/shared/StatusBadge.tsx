export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface StatusBadgeProps {
  status: string;
  label?: string;
  tone?: StatusTone;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700",
  danger:
    "border-red-200 bg-red-50 text-red-700",
  info:
    "border-blue-200 bg-blue-50 text-blue-700",
  neutral:
    "border-slate-200 bg-slate-100 text-slate-600",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  neutral: "bg-slate-400",
};

const SIZE_CLASSES = {
  sm: "gap-1.5 px-2.5 py-1 text-xs",
  md: "gap-2 px-3 py-1.5 text-sm",
};

const STATUS_TONES: Record<string, StatusTone> = {
  presente: "success",
  puntual: "success",
  activo: "success",
  registrado: "success",
  conectado: "success",
  operativo: "success",
  aprobado: "success",
  actualizado: "success",
  exitoso: "success",
  "en-linea": "success",

  tardanza: "warning",
  pendiente: "warning",
  mantenimiento: "warning",
  reintento: "warning",
  "en-pausa": "warning",

  inasistencia: "danger",
  ausente: "danger",
  inactivo: "danger",
  desconectado: "danger",
  fallido: "danger",
  rechazado: "danger",

  biometrico: "info",
  manual: "info",
  supervisor: "info",
};

function normalizeStatus(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function formatLabel(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[_-]+/g, " ");

  if (!cleaned) {
    return "Sin estado";
  }

  return (
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1)
  );
}

export default function StatusBadge({
  status,
  label,
  tone,
  size = "sm",
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);

  const resolvedTone =
    tone ??
    STATUS_TONES[normalizedStatus] ??
    "neutral";

  const visibleLabel =
    label ??
    formatLabel(status);

  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border font-extrabold ${TONE_CLASSES[resolvedTone]} ${SIZE_CLASSES[size]} ${className}`}
      aria-label={`Estado: ${visibleLabel}`}
      title={`Estado: ${visibleLabel}`}
    >
      {showDot && (
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASSES[resolvedTone]}`}
          aria-hidden="true"
        />
      )}

      {visibleLabel}
    </span>
  );
}