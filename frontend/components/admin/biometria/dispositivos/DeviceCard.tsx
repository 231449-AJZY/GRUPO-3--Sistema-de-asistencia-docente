"use client";

import type {
  BiometricDevice,
} from "@/types/biometricDevice";

interface DeviceCardProps {
  device: BiometricDevice;
  testing: boolean;
  synchronizing: boolean;
  onViewDetails: (
    device: BiometricDevice
  ) => void;
  onTest: (
    device: BiometricDevice
  ) => void;
  onSynchronize: (
    device: BiometricDevice
  ) => void;
  onDiagnostic: (
    device: BiometricDevice
  ) => void;
}

export default function DeviceCard({
  device,
  testing,
  synchronizing,
  onViewDetails,
  onTest,
  onSynchronize,
  onDiagnostic,
}: DeviceCardProps) {
  const status = getStatusData(
    device.status
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <header className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-unsaac-blue">
              <DeviceIcon />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-unsaac-blue">
                {device.code}
              </p>

              <h3 className="mt-1 text-lg font-extrabold text-unsaac-text">
                {device.name}
              </h3>

              <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                {device.manufacturer} ·{" "}
                {device.model}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${status.className}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {status.label}
          </span>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Information
            label="Ubicación"
            value={device.location}
          />

          <Information
            label="Dirección IP"
            value={`${device.ipAddress}:${device.port}`}
            mono
          />

          <Information
            label="Número de serie"
            value={device.serialNumber}
            mono
          />

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
              Calidad de señal
            </p>

            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    device.signalPercentage >= 75
                      ? "bg-emerald-500"
                      : device.signalPercentage >= 50
                        ? "bg-orange-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width:
                      `${Math.max(
                        0,
                        Math.min(
                          100,
                          device.signalPercentage
                        )
                      )}%`,
                  }}
                />
              </div>

              <span className="text-sm font-extrabold tabular-nums text-unsaac-text">
                {device.signalPercentage}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Metric
            label="Registros pendientes"
            value={device.pendingRecords}
            warning={
              device.pendingRecords > 0
            }
          />

          <Metric
            label="Huellas registradas"
            value={
              device.registeredTemplates
            }
          />
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
            device.status === "connected"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : device.status === "warning"
                ? "border-orange-200 bg-orange-50 text-orange-800"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {device.message}
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
            Última actividad
          </p>

          <p className="mt-1 text-sm font-bold text-unsaac-text">
            {formatDateTime(
              device.lastActivityAt
            )}
          </p>
        </div>
      </div>

      <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 lg:grid-cols-4">
        <ActionButton
          label="Detalle"
          onClick={() =>
            onViewDetails(device)
          }
        />

        <ActionButton
          label={
            testing
              ? "Probando..."
              : "Probar"
          }
          disabled={testing}
          onClick={() =>
            onTest(device)
          }
        />

        <ActionButton
          label={
            synchronizing
              ? "Sincronizando..."
              : "Sincronizar"
          }
          disabled={
            synchronizing ||
            device.status ===
              "maintenance"
          }
          onClick={() =>
            onSynchronize(device)
          }
        />

        <ActionButton
          label="Diagnóstico"
          emphasized
          onClick={() =>
            onDiagnostic(device)
          }
        />
      </footer>
    </article>
  );
}

function Information({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-bold leading-5 text-unsaac-text ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-2xl font-extrabold tabular-nums ${
          warning
            ? "text-orange-700"
            : "text-unsaac-blue"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-unsaac-muted">
        {label}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  disabled = false,
  emphasized = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  emphasized?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        emphasized
          ? "bg-unsaac-blue text-white hover:bg-blue-800"
          : "border border-slate-200 bg-white text-unsaac-text hover:border-blue-300 hover:text-unsaac-blue"
      }`}
    >
      {label}
    </button>
  );
}

function getStatusData(
  status: BiometricDevice["status"]
) {
  switch (status) {
    case "connected":
      return {
        label: "Conectado",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
      };

    case "warning":
      return {
        label: "Advertencia",
        className:
          "border-orange-200 bg-orange-50 text-orange-700",
      };

    case "maintenance":
      return {
        label: "Mantenimiento",
        className:
          "border-violet-200 bg-violet-50 text-violet-700",
      };

    default:
      return {
        label: "Desconectado",
        className:
          "border-red-200 bg-red-50 text-red-700",
      };
  }
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Sin actividad registrada";
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Lima",
    }
  ).format(new Date(value));
}

function DeviceIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="2.5"
        width="14"
        height="19"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <rect
        x="8"
        y="5.5"
        width="8"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />

      <circle
        cx="12"
        cy="17"
        r="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}