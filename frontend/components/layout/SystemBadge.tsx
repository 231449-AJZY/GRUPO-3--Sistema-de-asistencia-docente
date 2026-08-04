export type SystemStatus =
  | "connected"
  | "disconnected"
  | "maintenance";

interface SystemBadgeProps {
  status?: SystemStatus;
}

const STATUS_CONFIG: Record<
  SystemStatus,
  {
    label: string;
    containerClass: string;
    dotClass: string;
    statusClass: string;
  }
> = {
  connected: {
    label: "Conectado",
    containerClass:
      "border-emerald-300/30 bg-emerald-400/10",
    dotClass: "bg-emerald-300",
    statusClass: "text-emerald-100",
  },

  disconnected: {
    label: "Desconectado",
    containerClass:
      "border-red-300/30 bg-red-400/10",
    dotClass: "bg-red-300",
    statusClass: "text-red-100",
  },

  maintenance: {
    label: "Mantenimiento",
    containerClass:
      "border-amber-300/30 bg-amber-400/10",
    dotClass: "bg-amber-300",
    statusClass: "text-amber-100",
  },
};

export default function SystemBadge({
  status = "connected",
}: SystemBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-2 ${config.containerClass}`}
      aria-label={`Estado del sistema biométrico: ${config.label}`}
      title={`Sistema biométrico: ${config.label}`}
    >
      <span className="relative flex h-3 w-3 shrink-0">
        {status === "connected" && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${config.dotClass}`}
          />
        )}

        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${config.dotClass}`}
        />
      </span>

      <div className="leading-none">
        <p className="whitespace-nowrap text-xs font-extrabold text-white">
          Sistema biométrico
        </p>

        <p
          className={`mt-1 whitespace-nowrap text-[11px] font-bold ${config.statusClass}`}
        >
          {config.label}
        </p>
      </div>
    </div>
  );
}
