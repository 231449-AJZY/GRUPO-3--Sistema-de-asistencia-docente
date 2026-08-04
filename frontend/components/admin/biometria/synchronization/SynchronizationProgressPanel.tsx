"use client";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Button from "@/components/ui/Button";

interface SynchronizationProgressPanelProps {
  total: number;
  synchronized: number;
  pending: number;
  failed: number;
  progress: number;
  synchronizing: boolean;
  lastSynchronization: string;
  onSynchronize: () => void;
}

export default function SynchronizationProgressPanel({
  total,
  synchronized,
  pending,
  failed,
  progress,
  synchronizing,
  lastSynchronization,
  onSynchronize,
}: SynchronizationProgressPanelProps) {
  const remaining = pending + failed;

  return (
    <SectionCard
      title="Proceso de sincronización"
      description="Transfiera los registros locales al sistema institucional."
      action={
        <StatusBadge
          status={
            synchronizing
              ? "procesando"
              : remaining > 0
                ? "pendiente"
                : "sincronizado"
          }
          label={
            synchronizing
              ? "Sincronizando"
              : remaining > 0
                ? `${remaining} por procesar`
                : "Todo sincronizado"
          }
          size="md"
          showDot
        />
      }
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
                  Progreso general
                </p>

                <p className="mt-2 text-4xl font-extrabold tabular-nums text-unsaac-blue">
                  {progress}%
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm font-extrabold text-unsaac-text">
                  {synchronized} de {total}
                </p>

                <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                  registros sincronizados
                </p>
              </div>
            </div>

            <div
              className="mt-5 h-3 overflow-hidden rounded-full bg-blue-100"
              role="progressbar"
              aria-label="Progreso de sincronización"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  synchronizing
                    ? "animate-pulse bg-orange-500"
                    : "bg-unsaac-blue"
                }`}
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              label="Sincronizados"
              value={synchronized}
              tone="green"
            />

            <Metric
              label="Pendientes"
              value={pending}
              tone="orange"
            />

            <Metric
              label="Fallidos"
              value={failed}
              tone="red"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
              Última sincronización
            </p>

            <p className="mt-1 text-sm font-extrabold text-unsaac-text">
              {lastSynchronization}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-unsaac-blue">
            <SyncIcon
              spinning={synchronizing}
            />
          </span>

          <p className="mt-5 text-center text-base font-extrabold text-unsaac-text">
            {synchronizing
              ? "Procesando registros"
              : remaining > 0
                ? "Registros disponibles"
                : "Proceso completado"}
          </p>

          <p className="mt-2 text-center text-xs font-semibold leading-5 text-unsaac-muted">
            {synchronizing
              ? "No cierre esta página mientras se completa la transferencia."
              : remaining > 0
                ? "Los registros pendientes y fallidos pueden procesarse nuevamente."
                : "No existen registros pendientes de transferencia."}
          </p>

          <Button
            type="button"
            variant="primary"
            fullWidth
            className="mt-5"
            loading={synchronizing}
            loadingText="Sincronizando..."
            onClick={onSynchronize}
            disabled={
              synchronizing ||
              remaining === 0
            }
          >
            Sincronizar ahora
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "orange" | "red";
}) {
  const styles = {
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    orange:
      "border-orange-200 bg-orange-50 text-orange-700",
    red:
      "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${styles[tone]}`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>

      <p className="mt-1 text-2xl font-extrabold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SyncIcon({
  spinning,
}: {
  spinning: boolean;
}) {
  return (
    <svg
      className={`h-10 w-10 ${
        spinning ? "animate-spin" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 7v5h-5M4 17v-5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6.2 9a7 7 0 0 1 11.3-2L20 9M4 15l2.5 2A7 7 0 0 0 18 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}