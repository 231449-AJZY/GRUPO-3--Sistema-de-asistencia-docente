"use client";

import type {
  ReactNode,
} from "react";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Button from "@/components/ui/Button";

import type {
  BiometricHistoryRecord,
} from "@/types/biometricHistory";

interface BiometricHistoryDetailProps {
  record: BiometricHistoryRecord | null;
  onClose: () => void;
}

export default function BiometricHistoryDetail({
  record,
  onClose,
}: BiometricHistoryDetailProps) {
  if (!record) {
    return (
      <SectionCard
        title="Detalle del registro"
        description="Seleccione un evento de la tabla para consultar su información."
      >
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-unsaac-blue">
            <HistoryIcon />
          </span>

          <p className="mt-5 font-extrabold text-unsaac-text">
            Ningún registro seleccionado
          </p>

          <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-unsaac-muted">
            Utilice el botón “Ver detalle” para revisar los datos técnicos de un evento.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Detalle del registro"
      description={record.codigo}
      action={
        <StatusBadge
          status={
            record.resultado === "Exitoso"
              ? "exitoso"
              : record.resultado === "Fallido"
                ? "fallido"
                : "pendiente"
          }
          label={record.resultado}
          size="md"
          showDot
        />
      }
    >
      <div className="space-y-5">
        <article className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-unsaac-blue text-sm font-extrabold text-white">
              {getInitials(record.docente)}
            </span>

            <div className="min-w-0">
              <p className="text-base font-extrabold leading-6 text-unsaac-text">
                {record.docente}
              </p>

              <p className="mt-1 text-sm font-extrabold text-unsaac-blue">
                {record.codigoDocente}
              </p>

              <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                DNI: {record.dni}
              </p>
            </div>
          </div>
        </article>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <InformationItem
            label="Fecha"
            value={record.fecha}
            icon={<CalendarIcon />}
          />

          <InformationItem
            label="Hora"
            value={record.hora}
            icon={<ClockIcon />}
          />

          <InformationItem
            label="Evento"
            value={record.evento}
            icon={<EventIcon />}
          />

          <InformationItem
            label="Validación"
            value={record.tipoValidacion}
            icon={<FingerprintIcon />}
          />

          <InformationItem
            label="Dispositivo"
            value={record.dispositivo}
            icon={<DeviceIcon />}
          />

          <InformationItem
            label="Dirección IP"
            value={record.direccionIp}
            icon={<NetworkIcon />}
          />
        </dl>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
                Calidad biométrica
              </p>

              <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                Evaluación de la muestra capturada.
              </p>
            </div>

            <p className="text-2xl font-extrabold text-unsaac-blue">
              {record.calidad === null
                ? "N/A"
                : `${record.calidad}%`}
            </p>
          </div>

          {record.calidad !== null && (
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  record.calidad >= 85
                    ? "bg-emerald-500"
                    : record.calidad >= 70
                      ? "bg-orange-500"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${record.calidad}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-blue">
            Observación
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-unsaac-muted">
            {record.observacion}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onClose}
        >
          Cerrar detalle
        </Button>
      </div>
    </SectionCard>
  );
}

function InformationItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-unsaac-blue">
          {icon}
        </span>

        <div className="min-w-0">
          <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
            {label}
          </dt>

          <dd className="mt-1 break-words text-sm font-extrabold text-unsaac-text">
            {value}
          </dd>
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "DB"
  );
}

function HistoryIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 3v5h5M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 4.5 4.5c0 4.5-1.5 7-3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 11a7 7 0 0 1 14 0c0 4.5-1 7-2.2 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 9a8 8 0 0 1 14 0M8 15a5 5 0 0 0 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}