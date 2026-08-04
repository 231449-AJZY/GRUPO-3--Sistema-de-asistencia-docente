"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AcademicSubNavigation from "@/components/admin/horarios/AcademicSubNavigation";
import CursoFormModal from "@/components/admin/horarios/CursoFormModal";
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
  changeCourseStatus,
  createCourse,
  deleteCourse,
  getAcademicCatalogs,
  updateCourse,
} from "@/lib/services/academico.service";

import type {
  CursoCatalogo,
  CursoFormValues,
  DepartamentoAcademico,
} from "@/types/academico";
import type { UsuarioActivo } from "@/types/usuario";

type FieldErrors = Partial<Record<keyof CursoFormValues, string>>;

export default function CursosPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UsuarioActivo>(MOCK_ADMIN);
  const [courses, setCourses] = useState<CursoCatalogo[]>([]);
  const [departments, setDepartments] = useState<DepartamentoAcademico[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Activos" | "Inactivos">("Todos");
  const [departmentFilter, setDepartmentFilter] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CursoCatalogo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingStatus, setPendingStatus] = useState<CursoCatalogo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CursoCatalogo | null>(null);

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiAcademicoError && error.status === 401) {
        clearSession();
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const catalogs = await getAcademicCatalogs();
      setCourses(catalogs.cursos);
      setDepartments(catalogs.departamentos);
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el catálogo de cursos.");
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
    return courses.filter((course) => {
      const matchesSearch =
        !term ||
        course.codigo.toLowerCase().includes(term) ||
        course.nombre.toLowerCase().includes(term) ||
        course.departamento.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" && course.activo) ||
        (statusFilter === "Inactivos" && !course.activo);
      const matchesDepartment = !departmentFilter || course.departamentoId === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [courses, search, statusFilter, departmentFilter]);

  const summary = useMemo(
    () => ({
      total: courses.length,
      active: courses.filter((item) => item.activo).length,
      scheduled: courses.filter((item) => item.horarios > 0).length,
      credits: courses.filter((item) => item.activo).reduce((sum, item) => sum + item.creditos, 0),
    }),
    [courses]
  );

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(course: CursoCatalogo) {
    setEditing(course);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSave(values: CursoFormValues) {
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    setOperationError(null);
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, values);
        setCourses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createCourse(values);
        setCourses((current) => [created, ...current]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      if (error instanceof ApiAcademicoError) {
        setFormError(error.message);
        setFieldErrors((error.fields ?? {}) as FieldErrors);
      } else {
        setFormError("No se pudo guardar el curso.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus() {
    if (!pendingStatus) return;
    setOperationError(null);
    try {
      const updated = await changeCourseStatus(pendingStatus.id, !pendingStatus.activo);
      setCourses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPendingStatus(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo cambiar el estado del curso.");
      throw error;
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setOperationError(null);
    try {
      await deleteCourse(pendingDelete.id);
      setCourses((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(error instanceof Error ? error.message : "No se pudo eliminar el curso.");
      throw error;
    }
  }

  if (loading) {
    return <DashboardLayout user={currentUser}><LoadingState title="Cargando cursos académicos" /></DashboardLayout>;
  }

  if (loadError) {
    return (
      <DashboardLayout user={currentUser}>
        <ErrorState title="No se pudo cargar el catálogo" description={loadError} retryText="Reintentar" onRetry={() => void loadData()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Gestión académica"
          title="Cursos institucionales"
          description="Administre el catálogo de asignaturas y su relación con los departamentos académicos."
          badge={<StatusBadge status="operativo" label={`${summary.active} cursos activos`} size="md" showDot />}
          actions={<Button type="button" onClick={openCreate} disabled={!departments.some((item) => item.activo)}>Nuevo curso</Button>}
        />

        <AcademicSubNavigation />

        {operationError && <ErrorBanner message={operationError} />}

        {!departments.some((item) => item.activo) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            Registre o active un departamento académico antes de crear cursos.
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Cursos registrados" value={summary.total} description="Catálogo institucional" tone="blue" />
          <SummaryCard title="Cursos activos" value={summary.active} description="Disponibles para horarios" tone="green" />
          <SummaryCard title="Cursos programados" value={summary.scheduled} description="Con al menos un horario" tone="orange" />
          <SummaryCard title="Créditos activos" value={summary.credits} description="Suma del catálogo activo" tone="purple" />
        </section>

        <SectionCard title="Filtros del catálogo" description="Busque por código, nombre, departamento o estado.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px_200px_auto]">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, curso o departamento" className={fieldClass} />
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(Number(event.target.value))} className={fieldClass}>
              <option value={0}>Todos los departamentos</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={fieldClass}>
              <option value="Todos">Todos los estados</option>
              <option value="Activos">Activos</option>
              <option value="Inactivos">Inactivos</option>
            </select>
            <Button type="button" variant="outline" onClick={() => { setSearch(""); setDepartmentFilter(0); setStatusFilter("Todos"); }}>Limpiar</Button>
          </div>
        </SectionCard>

        <SectionCard title="Catálogo de cursos" description="Información académica disponible para la programación de horarios." contentClassName="p-0">
          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState title="No se encontraron cursos" description="Registre un curso o ajuste los filtros de búsqueda." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-unsaac-muted">
                  <tr><Th>Curso</Th><Th>Departamento</Th><Th>Créditos</Th><Th>Horarios</Th><Th>Estado</Th><Th>Acciones</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((course) => (
                    <tr key={course.id} className="bg-white">
                      <Td><p className="font-extrabold text-unsaac-text">{course.nombre}</p><p className="mt-1 text-xs font-bold text-unsaac-blue">{course.codigo}</p></Td>
                      <Td>{course.departamento}</Td>
                      <Td>{course.creditos}</Td>
                      <Td><span className="font-extrabold text-unsaac-text">{course.horarios}</span><span className="ml-2 text-xs text-unsaac-muted">({course.horariosActivos} activos)</span></Td>
                      <Td><StatusPill active={course.activo} /></Td>
                      <Td><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openEdit(course)}>Editar</Button><Button type="button" size="sm" variant={course.activo ? "warning" : "success"} onClick={() => setPendingStatus(course)}>{course.activo ? "Desactivar" : "Activar"}</Button><Button type="button" size="sm" variant="danger" onClick={() => setPendingDelete(course)}>Eliminar</Button></div></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <CursoFormModal
        open={formOpen}
        course={editing}
        departments={departments}
        submitting={submitting}
        serverError={formError}
        fieldErrors={fieldErrors}
        onClose={() => { if (!submitting) setFormOpen(false); }}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        onConfirm={handleStatus}
        title={pendingStatus?.activo ? "Desactivar curso" : "Activar curso"}
        description={pendingStatus?.activo ? "El curso dejará de estar disponible para nuevas programaciones. Los horarios históricos se conservarán." : "El curso volverá a estar disponible para la programación académica."}
        confirmText={pendingStatus?.activo ? "Desactivar" : "Activar"}
        variant={pendingStatus?.activo ? "warning" : "info"}
        autoCloseOnSuccess={false}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar curso"
        description="La eliminación definitiva solo se realizará cuando el curso no tenga horarios vinculados."
        confirmText="Eliminar"
        variant="danger"
        autoCloseOnSuccess={false}
      />
    </DashboardLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-6 py-4 font-extrabold">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-6 py-4 text-sm font-semibold text-unsaac-muted">{children}</td>; }
function StatusPill({ active }: { active: boolean }) { return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{active ? "Activo" : "Inactivo"}</span>; }
function ErrorBanner({ message }: { message: string }) { return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{message}</div>; }
function SummaryCard({ title, value, description, tone }: { title: string; value: number; description: string; tone: "blue" | "green" | "orange" | "purple" }) {
  const styles = { blue: "border-blue-100 bg-blue-50 text-unsaac-blue", green: "border-emerald-100 bg-emerald-50 text-emerald-700", orange: "border-orange-100 bg-orange-50 text-orange-700", purple: "border-violet-100 bg-violet-50 text-violet-700" };
  return <Card className="p-5"><span className={`inline-flex rounded-xl border px-3 py-2 text-xs font-extrabold ${styles[tone]}`}>{title}</span><p className="mt-4 text-4xl font-extrabold text-unsaac-text">{value}</p><p className="mt-2 text-sm font-semibold text-unsaac-muted">{description}</p></Card>;
}
const fieldClass = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-2 focus:ring-blue-100";
