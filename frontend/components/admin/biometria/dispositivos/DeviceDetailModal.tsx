"use client";

import {
  useEffect,
} from "react";

import type {
  BiometricDevice,
} from "@/types/biometricDevice";

export default function DeviceDetailModal({
  open,
  device,
  onClose,
}: {
  open: boolean;
  device: BiometricDevice | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, onClose]);

  if (!open || !device) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-unsaac-blue">
              {device.code}
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-unsaac-text">
              Detalle del dispositivo
            </h2>

            <p className="mt-2 text-sm font-semibold text-unsaac-muted">
              Información técnica y operativa del lector biométrico.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700"
          >
            ×
          </button>
        </header>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h3 className="text-lg font-extrabold text-unsaac-text">
              {device.name}
            </h3>

            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              {device.manufacturer} ·{" "}
              {device.model}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail
              label="Ubicación"
              value={device.location}
            />

            <Detail
              label="Número de serie"
              value={device.serialNumber}
            />

            <Detail
              label="Dirección IP"
              value={`${device.ipAddress}:${device.port}`}
            />

            <Detail
              label="Dirección MAC"
              value={device.macAddress}
            />

            <Detail
              label="Firmware"
              value={device.firmwareVersion}
            />

            <Detail
              label="Señal"
              value={`${device.signalPercentage}%`}
            />

            <Detail
              label="Huellas registradas"
              value={String(
                device.registeredTemplates
              )}
            />

            <Detail
              label="Registros pendientes"
              value={String(
                device.pendingRecords
              )}
            />

            <Detail
              label="Sincronización automática"
              value={
                device.automaticSync
                  ? "Habilitada"
                  : "Deshabilitada"
              }
            />

            <Detail
              label="Estado"
              value={translateStatus(
                device.status
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DateDetail
              label="Última actividad"
              value={device.lastActivityAt}
            />

            <DateDetail
              label="Última sincronización"
              value={
                device.lastSynchronizationAt
              }
            />

            <DateDetail
              label="Último diagnóstico"
              value={
                device.lastDiagnosticAt
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-unsaac-text">
        {value}
      </p>
    </div>
  );
}

function DateDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold leading-6 text-unsaac-text">
        {formatDateTime(value)}
      </p>
    </div>
  );
}

function translateStatus(
  status: BiometricDevice["status"]
) {
  switch (status) {
    case "connected":
      return "Conectado";

    case "warning":
      return "Advertencia";

    case "maintenance":
      return "Mantenimiento";

    default:
      return "Desconectado";
  }
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Sin registro";
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