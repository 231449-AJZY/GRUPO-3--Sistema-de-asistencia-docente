"use client";

import SectionCard from "@/components/shared/SectionCard";

import {
  SettingsCallout,
  SettingsField,
  ToggleSetting,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type {
  BiometricSettings,
} from "@/types/configuration";

export default function BiometricSettingsPanel({
  value,
  onChange,
}: {
  value: BiometricSettings;
  onChange: (
    value: BiometricSettings
  ) => void;
}) {
  function update<K extends keyof BiometricSettings>(
    field: K,
    fieldValue: BiometricSettings[K]
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  return (
    <SectionCard
      title="Preferencias biométricas"
      description="Configure la calidad, intentos y sincronización de lectores."
    >
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-extrabold text-unsaac-blue">
              Calidad mínima aceptada
            </p>

            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              Las muestras inferiores serán rechazadas.
            </p>
          </div>

          <p className="text-3xl font-extrabold text-unsaac-blue">
            {value.minimumQuality}%
          </p>
        </div>

        <input
          type="range"
          min={40}
          max={100}
          step={1}
          value={value.minimumQuality}
          onChange={(event) =>
            update(
              "minimumQuality",
              Number(event.target.value)
            )
          }
          className="mt-5 w-full accent-blue-700"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsField label="Máximo de intentos">
          <input
            type="number"
            min={1}
            max={10}
            value={value.maximumAttempts}
            onChange={(event) =>
              update(
                "maximumAttempts",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>

        <SettingsField label="Lector preferido">
          <select
            value={value.preferredDevice}
            onChange={(event) =>
              update(
                "preferredDevice",
                event.target.value
              )
            }
            className={settingsFieldClass}
          >
            <option value="BIO-001">
              BIO-001
            </option>

            <option value="BIO-002">
              BIO-002
            </option>

            <option value="BIO-003">
              BIO-003
            </option>
          </select>
        </SettingsField>

        <SettingsField
          label="Intervalo de sincronización"
          description="Frecuencia expresada en minutos."
        >
          <input
            type="number"
            min={5}
            max={180}
            value={
              value.synchronizationIntervalMinutes
            }
            onChange={(event) =>
              update(
                "synchronizationIntervalMinutes",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>

        <SettingsField
          label="Retención sin conexión"
          description="Días para conservar registros locales."
        >
          <input
            type="number"
            min={1}
            max={90}
            value={value.offlineRetentionDays}
            onChange={(event) =>
              update(
                "offlineRetentionDays",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>
      </div>

      <div className="mt-6">
        <ToggleSetting
          label="Sincronización automática"
          description="Los lectores enviarán periódicamente sus registros al sistema."
          checked={
            value.automaticSynchronization
          }
          onChange={(checked) =>
            update(
              "automaticSynchronization",
              checked
            )
          }
        />
      </div>

      <div className="mt-6">
        <SettingsCallout
          title="Protección de datos biométricos"
          description="El frontend solo administra preferencias visuales. Las plantillas biométricas no deben almacenarse en el navegador."
          tone="orange"
        />
      </div>
    </SectionCard>
  );
}