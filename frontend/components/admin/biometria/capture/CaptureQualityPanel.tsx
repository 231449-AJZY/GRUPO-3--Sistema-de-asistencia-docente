import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import type {
  CaptureReader,
  CaptureStage,
} from "@/types/biometricCapture";

interface CaptureQualityPanelProps {
  stage: CaptureStage;
  quality: number | null;
  reader: CaptureReader;
}

export default function CaptureQualityPanel({
  stage,
  quality,
  reader,
}: CaptureQualityPanelProps) {
  const qualityValue = quality ?? 0;
  const qualityState =
    getQualityConfiguration(
      qualityValue,
      stage
    );

  return (
    <div className="space-y-5">
      <SectionCard
        title="Estado del lector"
        description="Dispositivo utilizado para la captura."
        action={
          <StatusBadge
            status={
              reader.conectado
                ? "conectado"
                : "desconectado"
            }
            label={
              reader.conectado
                ? "Conectado"
                : "Desconectado"
            }
            showDot
          />
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <DeviceIcon />
              </span>

              <div>
                <p className="font-extrabold text-unsaac-text">
                  {reader.nombre}
                </p>

                <p className="mt-1 text-sm font-bold text-unsaac-blue">
                  {reader.codigo}
                </p>
              </div>
            </div>
          </div>

          <InfoRow
            label="Modelo"
            value={reader.modelo}
          />

          <InfoRow
            label="Ubicación"
            value={reader.ubicacion}
          />

          <InfoRow
            label="Última actividad"
            value={reader.ultimaActividad}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-extrabold text-unsaac-muted">
                Calidad de conexión
              </p>

              <p className="text-sm font-extrabold text-emerald-700">
                {reader.calidadConexion}%
              </p>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${reader.calidadConexion}%`,
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Calidad biométrica"
        description="Evaluación visual de la muestra obtenida."
        action={
          <StatusBadge
            status={qualityState.status}
            label={qualityState.label}
            showDot
          />
        }
      >
        <div className="space-y-5">
          <div
            className={`rounded-2xl border p-5 ${qualityState.panel}`}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
                  Calidad actual
                </p>

                <p
                  className={`mt-2 text-4xl font-extrabold ${qualityState.text}`}
                >
                  {quality === null
                    ? "--"
                    : `${quality}%`}
                </p>
              </div>

              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${qualityState.icon}`}
              >
                <QualityIcon />
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs font-bold text-unsaac-muted">
              <span>Deficiente</span>
              <span>Excelente</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500">
              <div
                className="h-full bg-white/50 transition-all"
                style={{
                  marginLeft: `${qualityValue}%`,
                }}
              />
            </div>
          </div>

          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-unsaac-muted">
            Se recomienda una calidad mínima de 75% para confirmar el registro.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Proceso de registro"
        description="Etapas de la captura biométrica."
      >
        <ol className="space-y-3">
          <ProcessStep
            number="1"
            title="Seleccionar docente"
            completed
          />

          <ProcessStep
            number="2"
            title="Elegir dedo"
            completed
          />

          <ProcessStep
            number="3"
            title="Capturar huella"
            completed={
              stage === "review" ||
              stage === "completed"
            }
            active={
              stage === "capturing"
            }
          />

          <ProcessStep
            number="4"
            title="Confirmar registro"
            completed={
              stage === "completed"
            }
            active={
              stage === "review"
            }
          />
        </ol>
      </SectionCard>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  completed = false,
  active = false,
}: {
  number: string;
  title: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        completed
          ? "border-emerald-200 bg-emerald-50"
          : active
            ? "border-orange-200 bg-orange-50"
            : "border-slate-200 bg-slate-50"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
          completed
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-orange-500 text-white"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {completed ? "✓" : number}
      </span>

      <p
        className={`text-sm font-extrabold ${
          completed
            ? "text-emerald-700"
            : active
              ? "text-orange-700"
              : "text-unsaac-muted"
        }`}
      >
        {title}
      </p>
    </li>
  );
}

function getQualityConfiguration(
  quality: number,
  stage: CaptureStage
) {
  if (
    stage === "ready" ||
    stage === "capturing"
  ) {
    return {
      status: "pendiente",
      label: "Sin evaluar",
      panel:
        "border-slate-200 bg-slate-50",
      text: "text-slate-500",
      icon:
        "bg-slate-200 text-slate-500",
    };
  }

  if (quality >= 90) {
    return {
      status: "registrado",
      label: "Excelente",
      panel:
        "border-emerald-200 bg-emerald-50",
      text: "text-emerald-700",
      icon:
        "bg-emerald-100 text-emerald-700",
    };
  }

  if (quality >= 75) {
    return {
      status: "operativo",
      label: "Buena",
      panel:
        "border-blue-200 bg-blue-50",
      text: "text-unsaac-blue",
      icon:
        "bg-blue-100 text-unsaac-blue",
    };
  }

  return {
    status: "fallido",
    label: "Deficiente",
    panel: "border-red-200 bg-red-50",
    text: "text-red-700",
    icon: "bg-red-100 text-red-700",
  };
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-extrabold text-unsaac-muted">
        {label}
      </p>

      <p className="text-right text-sm font-extrabold text-unsaac-text">
        {value}
      </p>
    </div>
  );
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
        y="3"
        width="14"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}