"use client";

import SectionCard from "@/components/shared/SectionCard";

import {
  SettingsCallout,
  SettingsField,
  ToggleSetting,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type {
  SecuritySettings,
} from "@/types/configuration";

export default function SecuritySettingsPanel({
  value,
  onChange,
}: {
  value: SecuritySettings;
  onChange: (
    value: SecuritySettings
  ) => void;
}) {
  function update<K extends keyof SecuritySettings>(
    field: K,
    fieldValue: SecuritySettings[K]
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  return (
    <SectionCard
      title="Seguridad de acceso"
      description="Configure sesiones, bloqueos y trazabilidad administrativa."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SettingsField
          label="Duración de sesión"
          description="Horas antes de solicitar un nuevo inicio."
        >
          <input
            type="number"
            min={1}
            max={24}
            value={
              value.sessionDurationHours
            }
            onChange={(event) =>
              update(
                "sessionDurationHours",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>

        <SettingsField
          label="Intentos de acceso"
          description="Intentos fallidos antes del bloqueo."
        >
          <input
            type="number"
            min={1}
            max={20}
            value={
              value.maximumLoginAttempts
            }
            onChange={(event) =>
              update(
                "maximumLoginAttempts",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>

        <SettingsField
          label="Tiempo de bloqueo"
          description="Duración del bloqueo en minutos."
        >
          <input
            type="number"
            min={1}
            max={1440}
            value={value.accountLockMinutes}
            onChange={(event) =>
              update(
                "accountLockMinutes",
                Number(event.target.value)
              )
            }
            className={settingsFieldClass}
          />
        </SettingsField>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ToggleSetting
          label="Contraseñas seguras"
          description="Exigir longitud, números y caracteres especiales."
          checked={
            value.requireStrongPassword
          }
          onChange={(checked) =>
            update(
              "requireStrongPassword",
              checked
            )
          }
        />

        <ToggleSetting
          label="Cambio obligatorio"
          description="Solicitar cambio de contraseña en el siguiente acceso."
          checked={
            value.forcePasswordChange
          }
          onChange={(checked) =>
            update(
              "forcePasswordChange",
              checked
            )
          }
        />

        <ToggleSetting
          label="Auditoría de eventos"
          description="Registrar acciones administrativas relevantes."
          checked={value.auditEvents}
          onChange={(checked) =>
            update(
              "auditEvents",
              checked
            )
          }
        />
      </div>

      <div className="mt-6">
        <SettingsCallout
          title="JWT del backend"
          description="La duración real de la sesión seguirá dependiendo del token emitido por el backend. Esta opción representa la configuración administrativa futura."
          tone="orange"
        />
      </div>
    </SectionCard>
  );
}