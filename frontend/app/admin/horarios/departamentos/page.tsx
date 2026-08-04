"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AcademicSubNavigation from "@/components/admin/horarios/AcademicSubNavigation";
import DepartamentoFormModal from "@/components/admin/horarios/DepartamentoFormModal";
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
  ApiAcademicoError,
  changeDepartmentStatus,
  createDepartment,
  deleteDepartment,
  getAcademicCatalogs,
  updateDepartment,
} from "@/lib/services/academico.service";

import type {
  DepartamentoAcademico,
  DepartamentoFormValues,
} from "@/types/academico";
import type { UsuarioActivo } from "@/types/usuario";

type FieldErrors = Partial<Record<keyof DepartamentoFormValues, string>>;

export default function DepartamentosPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioActivo>(MOCK_ADMIN);
  const [departments, setDepartments] = useState<DepartamentoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartamentoAcademico | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingStatus, setPendingStatus] = useState<DepartamentoAcademico | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DepartamentoAcademico | null>(null);

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
      setDepartments(catalogs.departamentos);
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los departamentos.");
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments.filter((item) => !term || item.codigo.toLowerCase().includes(term) || item.nombre.toLowerCase().includes(term));
  }, [departments, search]);

  const summary = useMemo(() => ({
    total: departments.length,
    active: departments.filter((item) => item.activo).length,
    teachers: departments.reduce((sum, item) => sum + item.docentes, 0),
    courses: departments.reduce((sum, item) => sum + item.cursos, 0),
  }), [departments]);

  function openCreate() { setEditing(null); setFormError(null); setFieldErrors({}); setFormOpen(true); }
  function openEdit(item: DepartamentoAcademico) { setEditing(item); setFormError(null); setFieldErrors({}); setFormOpen(true); }

  async function handleSave(values: DepartamentoFormValues) {
    setSubmitting(true); setFormError(null); setFieldErrors({}); setOperationError(null);
    try {
      if (editing) {
        const updated = await updateDepartment(editing.id, values);
        setDepartments((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await createDepartment(values);
        setDepartments((current) => [created, ...current]);
      }
      setFormOpen(false); setEditing(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiAcademicoError) { setFormError(error.message); setFieldErrors((error.fields ?? {}) as FieldErrors); }
      else setFormError("No se pudo guardar el departamento.");
    } finally { setSubmitting(false); }
  }

  async function handleStatus() {
    if (!pendingStatus) return;
    setOperationError(null);
    try {
      const updated = await changeDepartmentStatus(pendingStatus.id, !pendingStatus.activo);
      setDepartments((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPendingStatus(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo cambiar el estado del departamento.");
      throw error;
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setOperationError(null);
    try {
      await deleteDepartment(pendingDelete.id);
      setDepartments((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo eliminar el departamento.");
      throw error;
    }
  }

  if (loading) return <DashboardLayout user={currentUser}><LoadingState title="Cargando departamentos académicos" /></DashboardLayout>;
  if (loadError) return <DashboardLayout user={currentUser}><ErrorState title="No se pudieron cargar las unidades académicas" description={loadError} retryText="Reintentar" onRetry={() => void loadData()} /></DashboardLayout>;

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader eyebrow="Gestión académica" title="Departamentos académicos" description="Administre las unidades responsables de docentes y cursos institucionales." badge={<StatusBadge status="operativo" label={`${summary.active} departamentos activos`} size="md" showDot />} actions={<Button type="button" onClick={openCreate}>Nuevo departamento</Button>} />
        <AcademicSubNavigation />
        {operationError && <ErrorBanner message={operationError} />}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Departamentos" value={summary.total} description="Unidades registradas" tone="blue" />
          <SummaryCard title="Unidades activas" value={summary.active} description="Disponibles en el sistema" tone="green" />
          <SummaryCard title="Docentes vinculados" value={summary.teachers} description="Perfiles académicos" tone="orange" />
          <SummaryCard title="Cursos vinculados" value={summary.courses} description="Catálogo institucional" tone="purple" />
        </section>

        <SectionCard title="Buscar departamentos" description="Consulte por código o denominación académica.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código o nombre del departamento" className={`${fieldClass} flex-1`} />
            <Button type="button" variant="outline" onClick={() => setSearch("")} disabled={!search}>Limpiar</Button>
          </div>
        </SectionCard>

        <SectionCard title="Unidades académicas" description="Los departamentos con docentes o cursos vinculados se conservan y pueden desactivarse." contentClassName="p-0">
          {filtered.length === 0 ? <div className="p-6"><EmptyState title="No se encontraron departamentos" description="Registre una unidad académica o ajuste la búsqueda." /></div> : (
            <div className="overflow-x-auto"><table className="min-w-[930px] w-full text-left"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-unsaac-muted"><tr><Th>Departamento</Th><Th>Docentes</Th><Th>Cursos</Th><Th>Estado</Th><Th>Acciones</Th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((department) => <tr key={department.id} className="bg-white"><Td><p className="font-extrabold text-unsaac-text">{department.nombre}</p><p className="mt-1 text-xs font-bold text-unsaac-blue">{department.codigo}</p></Td><Td>{department.docentes}</Td><Td><span className="font-extrabold text-unsaac-text">{department.cursos}</span><span className="ml-2 text-xs text-unsaac-muted">({department.cursosActivos} activos)</span></Td><Td><StatusPill active={department.activo} /></Td><Td><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openEdit(department)}>Editar</Button><Button type="button" size="sm" variant={department.activo ? "warning" : "success"} onClick={() => setPendingStatus(department)}>{department.activo ? "Desactivar" : "Activar"}</Button><Button type="button" size="sm" variant="danger" onClick={() => setPendingDelete(department)}>Eliminar</Button></div></Td></tr>)}</tbody></table></div>
          )}
        </SectionCard>
      </div>

      <DepartamentoFormModal open={formOpen} department={editing} submitting={submitting} serverError={formError} fieldErrors={fieldErrors} onClose={() => { if (!submitting) setFormOpen(false); }} onSave={handleSave} />
      <ConfirmDialog open={Boolean(pendingStatus)} onClose={() => setPendingStatus(null)} onConfirm={handleStatus} title={pendingStatus?.activo ? "Desactivar departamento" : "Activar departamento"} description={pendingStatus?.activo ? "Solo podrá desactivarse cuando no tenga docentes ni cursos activos." : "La unidad volverá a estar disponible para docentes y cursos."} confirmText={pendingStatus?.activo ? "Desactivar" : "Activar"} variant={pendingStatus?.activo ? "warning" : "info"} autoCloseOnSuccess={false} />
      <ConfirmDialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={handleDelete} title="Eliminar departamento" description="La eliminación definitiva solo se realizará cuando no existan docentes ni cursos vinculados." confirmText="Eliminar" variant="danger" autoCloseOnSuccess={false} />
    </DashboardLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 font-extrabold">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-6 py-4 text-sm font-semibold text-unsaac-muted">{children}</td>; }
function StatusPill({ active }: { active: boolean }) { return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{active ? "Activo" : "Inactivo"}</span>; }
function ErrorBanner({ message }: { message: string }) { return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{message}</div>; }
function SummaryCard({ title, value, description, tone }: { title: string; value: number; description: string; tone: "blue" | "green" | "orange" | "purple" }) { const styles = { blue: "border-blue-100 bg-blue-50 text-unsaac-blue", green: "border-emerald-100 bg-emerald-50 text-emerald-700", orange: "border-orange-100 bg-orange-50 text-orange-700", purple: "border-violet-100 bg-violet-50 text-violet-700" }; return <Card className="p-5"><span className={`inline-flex rounded-xl border px-3 py-2 text-xs font-extrabold ${styles[tone]}`}>{title}</span><p className="mt-4 text-4xl font-extrabold text-unsaac-text">{value}</p><p className="mt-2 text-sm font-semibold text-unsaac-muted">{description}</p></Card>; }
const fieldClass = "h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-2 focus:ring-blue-100";
