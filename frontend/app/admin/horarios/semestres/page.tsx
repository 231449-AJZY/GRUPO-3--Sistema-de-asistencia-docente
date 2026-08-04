"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AcademicSubNavigation from "@/components/admin/horarios/AcademicSubNavigation";
import SemestreFormModal from "@/components/admin/horarios/SemestreFormModal";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  activateSemester,
  ApiAcademicoError,
  createSemester,
  deleteSemester,
  getAcademicCatalogs,
  updateSemester,
} from "@/lib/services/academico.service";

import type { SemestreCatalogo, SemestreFormValues } from "@/types/academico";
import type { UsuarioActivo } from "@/types/usuario";

type FieldErrors = Partial<Record<keyof SemestreFormValues, string>>;

export default function SemestresPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioActivo>(MOCK_ADMIN);
  const [semesters, setSemesters] = useState<SemestreCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SemestreCatalogo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingActivate, setPendingActivate] = useState<SemestreCatalogo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SemestreCatalogo | null>(null);

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiAcademicoError && error.status === 401) {
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
      const catalogs = await getAcademicCatalogs();
      setSemesters(catalogs.semestres);
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los semestres.");
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

  const summary = useMemo(() => {
    const active = semesters.find((item) => item.activo);
    return {
      total: semesters.length,
      activeCode: active?.codigo ?? "Sin periodo activo",
      scheduled: semesters.filter((item) => item.horarios > 0).length,
      totalSchedules: semesters.reduce((sum, item) => sum + item.horarios, 0),
    };
  }, [semesters]);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(semester: SemestreCatalogo) {
    setEditing(semester);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSave(values: SemestreFormValues) {
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    setOperationError(null);
    try {
      if (editing) {
        const updated = await updateSemester(editing.id, values);
        setSemesters((current) =>
          current.map((item) => ({
            ...item,
            activo: updated.activo ? item.id === updated.id : item.activo,
            ...(item.id === updated.id ? updated : {}),
          }))
        );
      } else {
        const created = await createSemester(values);
        setSemesters((current) => [
          created,
          ...current.map((item) => ({ ...item, activo: created.activo ? false : item.activo })),
        ]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiAcademicoError) {
        setFormError(error.message);
        setFieldErrors((error.fields ?? {}) as FieldErrors);
      } else {
        setFormError("No se pudo guardar el semestre.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate() {
    if (!pendingActivate) return;
    setOperationError(null);
    try {
      const updated = await activateSemester(pendingActivate.id);
      setSemesters((current) => current.map((item) => ({ ...item, activo: item.id === updated.id })));
      setPendingActivate(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo activar el semestre.");
      throw error;
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setOperationError(null);
    try {
      await deleteSemester(pendingDelete.id);
      setSemesters((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo eliminar el semestre.");
      throw error;
    }
  }

  if (loading) return <DashboardLayout user={currentUser}><LoadingState title="Cargando semestres académicos" /></DashboardLayout>;
  if (loadError) return <DashboardLayout user={currentUser}><ErrorState title="No se pudieron cargar los periodos" description={loadError} retryText="Reintentar" onRetry={() => void loadData()} /></DashboardLayout>;

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Gestión académica"
          title="Semestres académicos"
          description="Administre los periodos institucionales y determine el semestre activo del sistema."
          badge={<StatusBadge status={semesters.some((item) => item.activo) ? "operativo" : "advertencia"} label={summary.activeCode} size="md" showDot />}
          actions={<Button type="button" onClick={openCreate}>Nuevo semestre</Button>}
        />

        <AcademicSubNavigation />
        {operationError && <ErrorBanner message={operationError} />}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Periodos registrados" value={String(summary.total)} description="Historial académico" tone="blue" />
          <SummaryCard title="Periodo activo" value={summary.activeCode} description="Referencia institucional" tone="green" />
          <SummaryCard title="Periodos programados" value={String(summary.scheduled)} description="Con horarios asociados" tone="orange" />
          <SummaryCard title="Horarios históricos" value={String(summary.totalSchedules)} description="En todos los periodos" tone="purple" />
        </section>

        <SectionCard title="Periodos institucionales" description="Solo un semestre puede estar activo. Los periodos con horarios se conservan como historial." contentClassName="p-0">
          {semesters.length === 0 ? (
            <div className="p-6"><EmptyState title="No existen semestres registrados" description="Cree el primer periodo académico para habilitar la programación de horarios." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-unsaac-muted"><tr><Th>Periodo</Th><Th>Fechas</Th><Th>Horarios</Th><Th>Estado</Th><Th>Acciones</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {semesters.map((semester) => (
                    <tr key={semester.id} className="bg-white">
                      <Td><p className="font-extrabold text-unsaac-text">{semester.codigo}</p><p className="mt-1 text-xs font-semibold text-unsaac-muted">Registrado {formatDate(semester.creadoEn)}</p></Td>
                      <Td>{formatDate(semester.fechaInicio)} – {formatDate(semester.fechaFin)}</Td>
                      <Td><span className="font-extrabold text-unsaac-text">{semester.horarios}</span><span className="ml-2 text-xs text-unsaac-muted">({semester.horariosActivos} activos)</span></Td>
                      <Td>{semester.activo ? <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">Periodo activo</span> : <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">Histórico</span>}</Td>
                      <Td><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openEdit(semester)}>Editar</Button>{!semester.activo && <Button type="button" size="sm" variant="success" onClick={() => setPendingActivate(semester)}>Activar</Button>}<Button type="button" size="sm" variant="danger" disabled={semester.activo} onClick={() => setPendingDelete(semester)}>Eliminar</Button></div></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SemestreFormModal open={formOpen} semester={editing} submitting={submitting} serverError={formError} fieldErrors={fieldErrors} onClose={() => { if (!submitting) setFormOpen(false); }} onSave={handleSave} />

      <ConfirmDialog open={Boolean(pendingActivate)} onClose={() => setPendingActivate(null)} onConfirm={handleActivate} title="Activar periodo académico" description="El semestre activo actual pasará a estado histórico y este periodo será utilizado por el sistema." confirmText="Activar periodo" variant="info" autoCloseOnSuccess={false} />
      <ConfirmDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={handleDelete} title="Eliminar semestre" description="Solo puede eliminarse un periodo inactivo que no tenga horarios asociados." confirmText="Eliminar" variant="danger" autoCloseOnSuccess={false} />
    </DashboardLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 font-extrabold">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-6 py-4 text-sm font-semibold text-unsaac-muted">{children}</td>; }
function ErrorBanner({ message }: { message: string }) { return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{message}</div>; }
function SummaryCard({ title, value, description, tone }: { title: string; value: string; description: string; tone: "blue" | "green" | "orange" | "purple" }) { const styles = { blue: "border-blue-100 bg-blue-50 text-unsaac-blue", green: "border-emerald-100 bg-emerald-50 text-emerald-700", orange: "border-orange-100 bg-orange-50 text-orange-700", purple: "border-violet-100 bg-violet-50 text-violet-700" }; return <Card className="p-5"><span className={`inline-flex rounded-xl border px-3 py-2 text-xs font-extrabold ${styles[tone]}`}>{title}</span><p className="mt-4 truncate text-2xl font-extrabold text-unsaac-text">{value}</p><p className="mt-2 text-sm font-semibold text-unsaac-muted">{description}</p></Card>; }
function formatDate(value: string) { if (!value) return "—"; const date = new Date(`${value.slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
