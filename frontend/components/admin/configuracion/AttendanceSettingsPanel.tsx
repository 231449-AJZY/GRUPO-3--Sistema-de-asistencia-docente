"use client";

import SectionCard from "@/components/shared/SectionCard";
import {
  SettingsField,
  ToggleSetting,
  settingsFieldClass,
} from "@/components/admin/configuracion/SettingsControls";

import type { AttendanceSettings, WorkingDay } from "@/types/configuration";

const WORKING_DAYS: WorkingDay[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

export default function AttendanceSettingsPanel({
  value,
  errors,
  onChange,
}: {
  value: AttendanceSettings;
  errors?: Partial<Record<keyof AttendanceSettings, string>>;
  onChange: (value: AttendanceSettings) => void;
}) {
  function update<K extends keyof AttendanceSettings>(field: K, fieldValue: AttendanceSettings[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  function toggleDay(day: WorkingDay) {
    const enabled = value.workingDays.includes(day);
    update(
      "workingDays",
      enabled ? value.workingDays.filter((item) => item !== day) : [...value.workingDays, day]
    );
  }

  return (
    <SectionCard
      title="Parámetros de asistencia"
      description="Configure el horario institucional y las reglas generales para las marcaciones."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SettingsField label="Hora institucional de ingreso" description="Referencia para el ingreso diario.">
          <input type="time" value={value.institutionalEntryTime} onChange={(event) => update("institutionalEntryTime", event.target.value)} className={inputClass(errors?.institutionalEntryTime)} />
          <FieldError message={errors?.institutionalEntryTime} />
        </SettingsField>

        <SettingsField label="Tolerancia de ingreso" description="Minutos permitidos después del inicio.">
          <input type="number" min={0} max={120} value={value.graceMinutes} onChange={(event) => update("graceMinutes", Number(event.target.value))} className={inputClass(errors?.graceMinutes)} />
          <FieldError message={errors?.graceMinutes} />
        </SettingsField>

        <SettingsField label="Marcación anticipada" description="Minutos permitidos antes del inicio.">
          <input type="number" min={0} max={180} value={value.earlyCheckinMinutes} onChange={(event) => update("earlyCheckinMinutes", Number(event.target.value))} className={inputClass(errors?.earlyCheckinMinutes)} />
          <FieldError message={errors?.earlyCheckinMinutes} />
        </SettingsField>

        <SettingsField label="Límite de tardanza" description="Minutos antes de considerar ausencia.">
          <input type="number" min={1} max={240} value={value.lateLimitMinutes} onChange={(event) => update("lateLimitMinutes", Number(event.target.value))} className={inputClass(errors?.lateLimitMinutes)} />
          <FieldError message={errors?.lateLimitMinutes} />
        </SettingsField>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ToggleSetting label="Exigir marcación de salida" description="La asistencia requerirá una entrada y una salida válidas." checked={value.requireCheckout} onChange={(checked) => update("requireCheckout", checked)} />
        <ToggleSetting label="Permitir validación manual" description="Los administradores podrán registrar una marcación justificada." checked={value.allowManualValidation} onChange={(checked) => update("allowManualValidation", checked)} />
      </div>

      <div className={`mt-6 rounded-2xl border p-5 ${errors?.workingDays ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
        <p className="font-extrabold text-unsaac-text">Días laborales</p>
        <p className="mt-1 text-sm font-semibold text-unsaac-muted">Seleccione los días considerados para el control institucional.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {WORKING_DAYS.map((day) => {
            const active = value.workingDays.includes(day);
            return (
              <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-xl border px-4 py-2 text-sm font-extrabold transition ${active ? "border-unsaac-blue bg-unsaac-blue text-white" : "border-slate-200 bg-white text-unsaac-muted hover:border-blue-300"}`}>
                {day}
              </button>
            );
          })}
        </div>
        <FieldError message={errors?.workingDays} />
      </div>
    </SectionCard>
  );
}

function inputClass(error?: string) {
  return `${settingsFieldClass} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""}`;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-xs font-bold text-red-600">{message}</p> : null;
}
