"use client";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

import {
  SettingsCallout,
  SettingsField,
  ToggleSetting,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type {
  ConfigurationBackup,
  MaintenanceSettings,
} from "@/types/configuration";

export default function MaintenancePanel({
  value,
  backups,
  creatingBackup,
  onChange,
  onCreateBackup,
}: {
  value: MaintenanceSettings;
  backups: ConfigurationBackup[];
  creatingBackup: boolean;
  onChange: (
    value: MaintenanceSettings
  ) => void;
  onCreateBackup: () => void;
}) {
  function update<K extends keyof MaintenanceSettings>(
    field: K,
    fieldValue: MaintenanceSettings[K]
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Respaldo y mantenimiento"
        description="Configure diagnósticos, copias de seguridad y disponibilidad."
        action={
          <Button
            type="button"
            variant="primary"
            loading={creatingBackup}
            loadingText="Creando respaldo"
            onClick={onCreateBackup}
          >
            Crear respaldo
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SettingsField label="Frecuencia de respaldo">
            <select
              value={value.backupFrequency}
              onChange={(event) =>
                update(
                  "backupFrequency",
                  event.target
                    .value as MaintenanceSettings["backupFrequency"]
                )
              }
              disabled={
                !value.automaticBackups
              }
              className={settingsFieldClass}
            >
              <option value="Diario">
                Diario
              </option>

              <option value="Semanal">
                Semanal
              </option>

              <option value="Mensual">
                Mensual
              </option>
            </select>
          </SettingsField>

          <SettingsField
            label="Retención de respaldos"
            description="Cantidad de días antes de depurar archivos antiguos."
          >
            <input
              type="number"
              min={1}
              max={365}
              value={value.retentionDays}
              onChange={(event) =>
                update(
                  "retentionDays",
                  Number(event.target.value)
                )
              }
              className={settingsFieldClass}
            />
          </SettingsField>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ToggleSetting
            label="Respaldos automáticos"
            description="Generar copias periódicas de la información institucional."
            checked={
              value.automaticBackups
            }
            onChange={(checked) =>
              update(
                "automaticBackups",
                checked
              )
            }
          />

          <ToggleSetting
            label="Diagnóstico automático"
            description="Comprobar periódicamente la salud de los servicios."
            checked={
              value.automaticDiagnostics
            }
            onChange={(checked) =>
              update(
                "automaticDiagnostics",
                checked
              )
            }
          />

          <ToggleSetting
            label="Modo mantenimiento"
            description="Restringir temporalmente el acceso de usuarios no administradores."
            checked={value.maintenanceMode}
            onChange={(checked) =>
              update(
                "maintenanceMode",
                checked
              )
            }
          />
        </div>

        {value.maintenanceMode && (
          <div className="mt-6">
            <SettingsCallout
              title="Modo mantenimiento habilitado"
              description="Esta representación es visual. No bloqueará accesos reales mientras no exista integración con el backend."
              tone="red"
            />
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Historial de respaldos"
        description="Copias simuladas generadas durante la sesión."
        contentClassName="p-0"
        action={
          <Badge variant="info">
            {backups.length} respaldo(s)
          </Badge>
        }
      >
        <div className="w-full overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={headerClass}>
                  Nombre
                </th>

                <th className={headerClass}>
                  Fecha
                </th>

                <th className={headerClass}>
                  Tamaño
                </th>

                <th className={headerClass}>
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {backups.map((backup) => (
                <tr
                  key={backup.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className={cellClass}>
                    <p className="font-extrabold text-unsaac-blue">
                      {backup.name}
                    </p>
                  </td>

                  <td className={cellClass}>
                    <p className="font-semibold text-unsaac-text">
                      {formatDateTime(
                        backup.createdAt
                      )}
                    </p>
                  </td>

                  <td className={cellClass}>
                    <p className="font-bold text-unsaac-muted">
                      {backup.size}
                    </p>
                  </td>

                  <td className={cellClass}>
                    <StatusBadge
                      status={
                        backup.status ===
                        "Completado"
                          ? "exitoso"
                          : backup.status ===
                              "Fallido"
                            ? "fallido"
                            : "procesando"
                      }
                      label={backup.status}
                      showDot
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "es-PE",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Lima",
    }
  ).format(new Date(value));
}

const headerClass =
  "whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500";

const cellClass =
  "px-5 py-4 align-middle text-sm";