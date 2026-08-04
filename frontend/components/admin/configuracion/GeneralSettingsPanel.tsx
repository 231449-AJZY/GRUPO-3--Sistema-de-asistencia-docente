"use client";

import SectionCard from "@/components/shared/SectionCard";
import {
  SettingsField,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type {
  ConfigurationSemesterOption,
  GeneralSettings,
} from "@/types/configuration";

export default function GeneralSettingsPanel({
  value,
  semestres,
  errors,
  onChange,
}: {
  value: GeneralSettings;
  semestres: ConfigurationSemesterOption[];
  errors?: Partial<Record<keyof GeneralSettings, string>>;
  onChange: (value: GeneralSettings) => void;
}) {
  function update<K extends keyof GeneralSettings>(field: K, fieldValue: GeneralSettings[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <SectionCard
      title="Configuración general"
      description="Datos institucionales utilizados en la interfaz, reportes y procesos administrativos."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SettingsField label="Nombre del sistema" description="Denominación mostrada en la plataforma.">
          <input type="text" value={value.systemName} maxLength={150} onChange={(event) => update("systemName", event.target.value)} className={inputClass(errors?.systemName)} />
          <FieldError message={errors?.systemName} />
        </SettingsField>

        <SettingsField label="Código institucional" description="Identificador abreviado de la universidad.">
          <input type="text" value={value.institutionCode} maxLength={20} onChange={(event) => update("institutionCode", event.target.value.toUpperCase())} className={inputClass(errors?.institutionCode)} />
          <FieldError message={errors?.institutionCode} />
        </SettingsField>

        <SettingsField label="Nombre de la institución" description="Denominación oficial para reportes.">
          <input type="text" value={value.institutionName} maxLength={200} onChange={(event) => update("institutionName", event.target.value)} className={inputClass(errors?.institutionName)} />
          <FieldError message={errors?.institutionName} />
        </SettingsField>

        <SettingsField label="Correo de soporte" description="Dirección administrativa para incidencias.">
          <input type="email" value={value.supportEmail} maxLength={150} onChange={(event) => update("supportEmail", event.target.value)} className={inputClass(errors?.supportEmail)} />
          <FieldError message={errors?.supportEmail} />
        </SettingsField>

        <SettingsField label="Zona horaria">
          <select value={value.timezone} onChange={(event) => update("timezone", event.target.value)} className={inputClass(errors?.timezone)}>
            <option value="America/Lima">America/Lima</option>
            <option value="UTC">UTC</option>
          </select>
          <FieldError message={errors?.timezone} />
        </SettingsField>

        <SettingsField label="Idioma">
          <select value={value.language} onChange={(event) => update("language", event.target.value)} className={inputClass(errors?.language)}>
            <option value="Español">Español</option>
            <option value="English">English</option>
          </select>
          <FieldError message={errors?.language} />
        </SettingsField>

        <SettingsField label="Periodo académico activo" description="Periodo utilizado por horarios, asistencia y paneles.">
          <select value={value.activeAcademicPeriod} onChange={(event) => update("activeAcademicPeriod", event.target.value)} className={inputClass(errors?.activeAcademicPeriod)} disabled={semestres.length === 0}>
            {semestres.length === 0 && <option value="">Sin semestres registrados</option>}
            {semestres.map((semester) => (
              <option key={semester.id} value={semester.codigo}>
                {semester.codigo}{semester.activo ? " · Activo" : ""}
              </option>
            ))}
          </select>
          <FieldError message={errors?.activeAcademicPeriod} />
        </SettingsField>
      </div>

      {semestres.length === 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          Registre un semestre en Gestión académica para establecer el periodo institucional activo.
        </div>
      )}
    </SectionCard>
  );
}

function inputClass(error?: string) {
  return `${settingsFieldClass} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""}`;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-xs font-bold text-red-600">{message}</p> : null;
}
