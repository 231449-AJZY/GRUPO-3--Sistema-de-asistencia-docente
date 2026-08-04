"use client";

import {
  useEffect,
} from "react";

import type {
  BiometricDevice,
} from "@/types/biometricDevice";

export default function DeviceDiagnosticModal({
  open,
  device,
  running,
  onClose,
  onRun,
}: {
  open: boolean;
  device: BiometricDevice | null;
  running: boolean;
  onClose: () => void;
  onRun: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !running
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    running,
    onClose,
  ]);

  if (!open || !device) {
    return null;
  }

  const diagnostics = [
    {
      label: "Conectividad de red",
      success:
        device.signalPercentage >= 50,
      description:
        device.signalPercentage >= 50
          ? "La comunicación de red es estable."
          : "La señal de red requiere revisión.",
    },
    {
      label: "Servicio biométrico",
      success:
        device.status !==
        "disconnected",
      description:
        device.status !==
        "disconnected"
          ? "El servicio del lector está respondiendo."
          : "No fue posible comunicarse con el lector.",
    },
    {
      label: "Almacenamiento temporal",
      success:
        device.pendingRecords <= 15,
      description:
        device.pendingRecords <= 15
          ? "Los registros pendientes están dentro del rango permitido."
          : "Existen demasiados registros pendientes de sincronización.",
    },
    {
      label: "Firmware",
      success: true,
      description:
        `Versión instalada: ${device.firmwareVersion}.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-unsaac-blue">
              Diagnóstico técnico
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-unsaac-text">
              {device.code}
            </h2>

            <p className="mt-2 text-sm font-semibold text-unsaac-muted">
              {device.name}
            </p>
          </div>

          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <div className="space-y-3 p-6">
          {diagnostics.map(
            (diagnostic) => (
              <div
                key={diagnostic.label}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold ${
                    running
                      ? "animate-pulse border-blue-200 bg-blue-50 text-unsaac-blue"
                      : diagnostic.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
                >
                  {running
                    ? "…"
                    : diagnostic.success
                      ? "✓"
                      : "!"}
                </span>

                <div>
                  <p className="font-extrabold text-unsaac-text">
                    {diagnostic.label}
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-unsaac-muted">
                    {running
                      ? "Comprobando componente..."
                      : diagnostic.description}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-unsaac-text transition hover:border-blue-300 disabled:opacity-50"
          >
            Cerrar
          </button>

          <button
            type="button"
            disabled={running}
            onClick={onRun}
            className="rounded-xl bg-unsaac-blue px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
          >
            {running
              ? "Ejecutando diagnóstico..."
              : "Ejecutar diagnóstico"}
          </button>
        </footer>
      </section>
    </div>
  );
}