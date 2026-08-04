"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AttendanceSettingsPanel from "@/components/admin/configuracion/AttendanceSettingsPanel";
import ConfigurationNavigation from "@/components/admin/configuracion/ConfigurationNavigation";
import GeneralSettingsPanel from "@/components/admin/configuracion/GeneralSettingsPanel";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  ApiConfiguracionError,
  getInstitutionalConfiguration,
  saveInstitutionalConfiguration,
} from "@/lib/services/configuracion.service";

import type {
  ConfigurationSection,
  ConfigurationSemesterOption,
  InstitutionalConfiguration,
} from "@/types/configuration";
import type { UsuarioActivo } from "@/types/usuario";

const emptyConfiguration: InstitutionalConfiguration = {
  general: {
    systemName: "",
    institutionName: "",
    institutionCode: "",
    supportEmail: "",
    timezone: "America/Lima",
    language: "Español",
    activeAcademicPeriod: "",
  },
  attendance: {
    institutionalEntryTime: "09:00",
    graceMinutes: 10,
    earlyCheckinMinutes: 15,
    lateLimitMinutes: 20,
    requireCheckout: true,
    allowManualValidation: true,
    workingDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  },
};

type FieldErrors = Partial<Record<string, string>>;

export default function AdminConfiguracionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioActivo>(MOCK_ADMIN);
  const [activeSection, setActiveSection] = useState<ConfigurationSection>("general");
  const [configuration, setConfiguration] = useState<InstitutionalConfiguration>(emptyConfiguration);
  const [savedConfiguration, setSavedConfiguration] = useState<InstitutionalConfiguration>(emptyConfiguration);
  const [semesters, setSemesters] = useState<ConfigurationSemesterOption[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiConfiguracionError && error.status === 401) {
      clearSession();
      router.replace("/login");
      return true;
    }
    return false;
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await getInstitutionalConfiguration();
      setConfiguration(response.configuration);
      setSavedConfiguration(response.configuration);
      setSemesters(response.semestres);
      setLastSavedAt(response.updatedAt);
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar la configuración institucional.");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    const session = getSession();
    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUser(session.user);
    }
    void loadData();
  }, [loadData]);

  const hasChanges = useMemo(
    () => JSON.stringify(configuration) !== JSON.stringify(savedConfiguration),
    [configuration, savedConfiguration]
  );

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      const response = await saveInstitutionalConfiguration(configuration);
      setConfiguration(response.configuration);
      setSavedConfiguration(response.configuration);
      setSemesters(response.semestres);
      setLastSavedAt(response.updatedAt);
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiConfiguracionError) {
        setSaveError(error.message);
        setFieldErrors(error.fields ?? {});
      } else {
        setSaveError("No se pudo guardar la configuración institucional.");
      }
    } finally {
      setSaving(false);
    }
  }

  function exportConfiguration() {
    const blob = new Blob([JSON.stringify(configuration, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `configuracion-institucional-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return <DashboardLayout user={currentUser}><LoadingState title="Cargando configuración institucional" /></DashboardLayout>;
  if (loadError) return <DashboardLayout user={currentUser}><ErrorState title="No se pudo cargar la configuración" description={loadError} retryText="Reintentar" onRetry={() => void loadData()} /></DashboardLayout>;

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Administración institucional"
          title="Configuración del sistema"
          description="Administre los datos generales, el periodo activo y las reglas de asistencia."
          badge={<StatusBadge status={hasChanges ? "advertencia" : "operativo"} label={hasChanges ? "Cambios pendientes" : "Configuración actualizada"} size="md" showDot />}
          actions={<div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={exportConfiguration}>Exportar</Button><Button type="button" loading={saving} loadingText="Guardando" disabled={!hasChanges} onClick={handleSave}>Guardar cambios</Button></div>}
        />

        {saveError && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{saveError}</div>}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Periodo académico" value={configuration.general.activeAcademicPeriod || "Sin periodo"} description="Referencia institucional activa" tone="blue" />
          <SummaryCard title="Hora de ingreso" value={configuration.attendance.institutionalEntryTime} description="Horario institucional" tone="green" />
          <SummaryCard title="Tolerancia" value={`${configuration.attendance.graceMinutes} min`} description="Después de la hora de ingreso" tone="orange" />
          <SummaryCard title="Días laborales" value={String(configuration.attendance.workingDays.length)} description="Días habilitados" tone="purple" />
        </section>

        <ConfigurationNavigation activeSection={activeSection} onChange={setActiveSection} />

        {activeSection === "general" && (
          <GeneralSettingsPanel
            value={configuration.general}
            semestres={semesters}
            errors={fieldErrors}
            onChange={(general) => setConfiguration((current) => ({ ...current, general }))}
          />
        )}

        {activeSection === "asistencia" && (
          <AttendanceSettingsPanel
            value={configuration.attendance}
            errors={fieldErrors}
            onChange={(attendance) => setConfiguration((current) => ({ ...current, attendance }))}
          />
        )}

        <Card className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-extrabold text-unsaac-text">Estado de la configuración</p>
              <p className="mt-1 text-sm font-semibold text-unsaac-muted">Última actualización: {formatDateTime(lastSavedAt)}</p>
            </div>
            <Button type="button" loading={saving} loadingText="Guardando" disabled={!hasChanges} onClick={handleSave}>Guardar configuración</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ title, value, description, tone }: { title: string; value: string; description: string; tone: "blue" | "green" | "orange" | "purple" }) {
  const styles = { blue: "border-blue-100 bg-blue-50 text-unsaac-blue", green: "border-emerald-100 bg-emerald-50 text-emerald-700", orange: "border-orange-100 bg-orange-50 text-orange-700", purple: "border-violet-100 bg-violet-50 text-violet-700" };
  return <Card className="p-5"><span className={`inline-flex rounded-xl border px-3 py-2 text-xs font-extrabold ${styles[tone]}`}>{title}</span><p className="mt-4 truncate text-2xl font-extrabold text-unsaac-text">{value}</p><p className="mt-2 text-sm font-semibold text-unsaac-muted">{description}</p></Card>;
}

function formatDateTime(value: string) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
