"use client";

import SectionCard from "@/components/shared/SectionCard";

import {
  SettingsField,
  ToggleSetting,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type {
  NotificationSettings,
} from "@/types/configuration";

export default function NotificationSettingsPanel({
  value,
  onChange,
}: {
  value: NotificationSettings;
  onChange: (
    value: NotificationSettings
  ) => void;
}) {
  function update<K extends keyof NotificationSettings>(
    field: K,
    fieldValue: NotificationSettings[K]
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  return (
    <SectionCard
      title="Notificaciones y alertas"
      description="Seleccione los eventos que deben comunicarse al administrador."
    >
      <SettingsField
        label="Correo destinatario"
        description="Las alertas administrativas se dirigirán a esta cuenta."
      >
        <input
          type="email"
          value={value.recipientEmail}
          onChange={(event) =>
            update(
              "recipientEmail",
              event.target.value
            )
          }
          className={settingsFieldClass}
        />
      </SettingsField>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ToggleSetting
          label="Alertas por correo"
          description="Enviar mensajes ante incidencias importantes."
          checked={value.emailAlerts}
          onChange={(checked) =>
            update(
              "emailAlerts",
              checked
            )
          }
        />

        <ToggleSetting
          label="Alertas de dispositivos"
          description="Notificar desconexiones y advertencias técnicas."
          checked={value.deviceAlerts}
          onChange={(checked) =>
            update(
              "deviceAlerts",
              checked
            )
          }
        />

        <ToggleSetting
          label="Alertas de sincronización"
          description="Notificar registros pendientes o fallidos."
          checked={
            value.synchronizationAlerts
          }
          onChange={(checked) =>
            update(
              "synchronizationAlerts",
              checked
            )
          }
        />

        <ToggleSetting
          label="Resumen diario"
          description="Enviar un consolidado de asistencia cada día."
          checked={value.dailySummary}
          onChange={(checked) =>
            update(
              "dailySummary",
              checked
            )
          }
        />
      </div>
    </SectionCard>
  );
}