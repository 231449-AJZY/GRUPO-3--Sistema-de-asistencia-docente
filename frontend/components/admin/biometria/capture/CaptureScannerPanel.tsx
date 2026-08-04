"use client";

import BiometriaFingerprintIcon from "@/components/admin/biometria/BiometriaFingerprintIcon";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

import type {
  CaptureReader,
  CaptureStage,
  FingerCode,
  FingerOption,
} from "@/types/biometricCapture";

interface CaptureScannerPanelProps {
  stage: CaptureStage;
  progress: number;
  quality: number | null;
  selectedFinger: FingerCode;
  fingers: FingerOption[];
  reader: CaptureReader;
  onFingerChange: (finger: FingerCode) => void;
  onStartCapture: () => void;
  onRepeatCapture: () => void;
  onRequestConfirm: () => void;
}

export default function CaptureScannerPanel({
  stage,
  progress,
  quality,
  selectedFinger,
  fingers,
  reader,
  onFingerChange,
  onStartCapture,
  onRepeatCapture,
  onRequestConfirm,
}: CaptureScannerPanelProps) {
  const state = getStageContent(stage);

  return (
    <SectionCard
      title="Captura de huella"
      description="Coloque el dedo seleccionado sobre el lector biométrico."
      action={
        <StatusBadge
          status={state.status}
          label={state.label}
          size="sm"
          showDot
        />
      }
    >
      <div className="flex min-h-[570px] flex-col">
        <Select
          label="Dedo por registrar"
          value={selectedFinger}
          onChange={(event) =>
            onFingerChange(
              event.target.value as FingerCode
            )
          }
          disabled={stage === "capturing"}
        >
          <optgroup label="Mano derecha">
            {fingers
              .filter(
                (finger) =>
                  finger.hand === "Derecha"
              )
              .map((finger) => (
                <option
                  key={finger.code}
                  value={finger.code}
                >
                  {finger.label}
                </option>
              ))}
          </optgroup>

          <optgroup label="Mano izquierda">
            {fingers
              .filter(
                (finger) =>
                  finger.hand === "Izquierda"
              )
              .map((finger) => (
                <option
                  key={finger.code}
                  value={finger.code}
                >
                  {finger.label}
                </option>
              ))}
          </optgroup>
        </Select>

        <div className="flex flex-1 flex-col items-center justify-center py-7">
          <div
            className={`relative flex h-64 w-64 items-center justify-center rounded-full border-[6px] bg-white transition-all duration-300 ${
              stage === "capturing"
                ? "animate-pulse border-orange-300 shadow-[0_0_0_18px_rgba(249,115,22,0.08)]"
                : stage === "review" ||
                    stage === "completed"
                  ? "border-emerald-300 shadow-[0_0_0_18px_rgba(16,185,129,0.08)]"
                  : stage === "error"
                    ? "border-red-300 shadow-[0_0_0_18px_rgba(239,68,68,0.08)]"
                    : "border-blue-200 shadow-[0_0_0_18px_rgba(37,99,235,0.06)]"
            }`}
          >
            <BiometriaFingerprintIcon
              className={`h-52 w-52 transition-all duration-300 ${
                stage === "capturing"
                  ? "scale-105 opacity-100"
                  : stage === "completed"
                    ? "opacity-95"
                    : "opacity-75"
              }`}
            />

            {(stage === "review" ||
              stage === "completed") && (
              <span className="absolute -bottom-1 -right-1 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-lg">
                <CheckIcon />
              </span>
            )}
          </div>

          <h3 className="mt-8 text-xl font-extrabold text-unsaac-text">
            {state.title}
          </h3>

          <p className="mt-2 max-w-md text-center text-sm font-semibold leading-6 text-unsaac-muted">
            {state.description}
          </p>

          {stage === "capturing" && (
            <div className="mt-6 w-full max-w-md">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-extrabold text-unsaac-muted">
                  Analizando muestra
                </p>

                <p className="text-sm font-extrabold tabular-nums text-orange-600">
                  {progress}%
                </p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {quality !== null &&
            stage !== "capturing" && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-emerald-700">
                  Calidad de la muestra
                </p>

                <p className="mt-1 text-3xl font-extrabold text-emerald-700">
                  {quality}%
                </p>
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stage === "ready" ||
          stage === "completed" ||
          stage === "error" ? (
            <Button
              type="button"
              variant="warning"
              fullWidth
              leftIcon={<ScanIcon />}
              onClick={onStartCapture}
              disabled={!reader.conectado}
            >
              {stage === "completed"
                ? "Nueva captura"
                : "Iniciar captura"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={onRepeatCapture}
              disabled={stage === "capturing"}
            >
              Repetir captura
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            fullWidth
            leftIcon={<CheckIcon />}
            onClick={onRequestConfirm}
            disabled={stage !== "review"}
          >
            Confirmar registro
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function getStageContent(
  stage: CaptureStage
) {
  if (stage === "capturing") {
    return {
      status: "capturando",
      label: "Capturando",
      title: "Captura en proceso",
      description:
        "Mantenga el dedo inmóvil mientras el lector analiza la huella.",
    };
  }

  if (stage === "review") {
    return {
      status: "advertencia",
      label: "Revisión requerida",
      title: "Muestra capturada",
      description:
        "Revise la calidad obtenida y confirme o repita el registro.",
    };
  }

  if (stage === "completed") {
    return {
      status: "registrado",
      label: "Registro guardado",
      title: "Huella registrada",
      description:
        "La muestra fue validada y agregada al historial local.",
    };
  }

  if (stage === "error") {
    return {
      status: "fallido",
      label: "Captura deficiente",
      title: "Repita la captura",
      description:
        "La calidad no alcanzó el mínimo requerido para registrar la huella.",
    };
  }

  return {
    status: "pendiente",
    label: "Lector preparado",
    title: "Esperando huella",
    description:
      "Seleccione el dedo y coloque la yema sobre el lector biométrico.",
  };
}

function ScanIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M8.5 12a3.5 3.5 0 0 1 7 0c0 3-1 4.8-2.2 6M6.5 12a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6.5 12 3.5 3.5L17.5 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}