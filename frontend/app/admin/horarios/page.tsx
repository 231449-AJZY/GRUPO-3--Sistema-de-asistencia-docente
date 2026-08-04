"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { useRouter } from "next/navigation";

import AcademicSubNavigation from "@/components/admin/horarios/AcademicSubNavigation";
import HorarioFormModal from "@/components/admin/horarios/HorarioFormModal";
import HorariosTable from "@/components/admin/horarios/HorariosTable";
import WeeklySchedule from "@/components/admin/horarios/WeeklySchedule";
import DashboardLayout from "@/components/layout/DashboardLayout";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
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
  ApiHorariosError,
  changeHorarioStatus,
  createHorario,
  deleteHorario,
  getHorarioCatalogos,
  getHorarios,
  updateHorario,
} from "@/lib/services/horarios.service";

import type {
  CursoAcademico,
  DiaSemana,
  DocenteHorario,
  HorarioCurso,
  HorarioFormValues,
  SemestreAcademico,
} from "@/types/horario";
import type { UsuarioActivo } from "@/types/usuario";

type StatusFilter = "Todos" | "Activos" | "Inactivos";
type DayFilter = "Todos" | DiaSemana;
type FormFieldErrors = Partial<Record<keyof HorarioFormValues, string>>;

export default function AdminHorariosPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UsuarioActivo>(MOCK_ADMIN);
  const [horarios, setHorarios] = useState<HorarioCurso[]>([]);
  const [docentes, setDocentes] = useState<DocenteHorario[]>([]);
  const [cursos, setCursos] = useState<CursoAcademico[]>([]);
  const [semestres, setSemestres] = useState<SemestreAcademico[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalFieldErrors, setModalFieldErrors] = useState<FormFieldErrors>({});

  const [selectedSemesterId, setSelectedSemesterId] = useState(0);
  const [selectedCareerId, setSelectedCareerId] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState<DayFilter>("Todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingSchedule, setEditingSchedule] = useState<HorarioCurso | null>(null);
  const [pendingStatus, setPendingStatus] = useState<HorarioCurso | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HorarioCurso | null>(null);

  const handleAuthError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiHorariosError && error.status === 401) {
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
      const [scheduleResponse, catalogs] = await Promise.all([
        getHorarios(),
        getHorarioCatalogos(),
      ]);

      setHorarios(scheduleResponse);
      setDocentes(catalogs.docentes);
      setCursos(catalogs.cursos);
      setSemestres(catalogs.semestres);

      const activeSemester =
        catalogs.semestres.find((item) => item.activo) ?? catalogs.semestres[0];

      setSelectedSemesterId((current) => current || activeSemester?.id || 0);
    } catch (error) {
      if (handleAuthError(error)) return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la programación académica."
      );
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

  const careerOptions = useMemo(() => {
    const uniqueCareers = new Map<number, string>();

    cursos.forEach((curso) => {
      if (curso.departamentoId > 0 && curso.departamento.trim()) {
        uniqueCareers.set(curso.departamentoId, curso.departamento.trim());
      }
    });

    return Array.from(uniqueCareers, ([id, nombre]) => ({ id, nombre })).sort(
      (first, second) => first.nombre.localeCompare(second.nombre, "es")
    );
  }, [cursos]);

  const filteredHorarios = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return horarios.filter((horario) => {
      const curso = cursos.find((item) => item.id === horario.cursoId);
      const docente = docentes.find((item) => item.id === horario.docenteId);

      const matchesSearch =
        !search ||
        curso?.nombre.toLowerCase().includes(search) ||
        curso?.codigo.toLowerCase().includes(search) ||
        docente?.nombre.toLowerCase().includes(search) ||
        docente?.codigo.toLowerCase().includes(search) ||
        horario.aula.toLowerCase().includes(search);

      const matchesSemester =
        selectedSemesterId === 0 || horario.semestreId === selectedSemesterId;
      const matchesCareer =
        selectedCareerId === 0 || curso?.departamentoId === selectedCareerId;
      const matchesDay = dayFilter === "Todos" || horario.diaSemana === dayFilter;
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" && horario.activo) ||
        (statusFilter === "Inactivos" && !horario.activo);

      return (
        matchesSearch &&
        matchesSemester &&
        matchesCareer &&
        matchesDay &&
        matchesStatus
      );
    });
  }, [
    horarios,
    cursos,
    docentes,
    searchTerm,
    selectedSemesterId,
    selectedCareerId,
    dayFilter,
    statusFilter,
  ]);

  const semesterSchedules = useMemo(
    () =>
      horarios.filter((item) => {
        const curso = cursos.find((catalogCourse) => catalogCourse.id === item.cursoId);
        const matchesSemester =
          selectedSemesterId === 0 || item.semestreId === selectedSemesterId;
        const matchesCareer =
          selectedCareerId === 0 || curso?.departamentoId === selectedCareerId;

        return matchesSemester && matchesCareer;
      }),
    [horarios, cursos, selectedSemesterId, selectedCareerId]
  );

  const summary = useMemo(
    () => ({
      total: semesterSchedules.length,
      active: semesterSchedules.filter((item) => item.activo).length,
      teachers: new Set(semesterSchedules.map((item) => item.docenteId)).size,
      courses: new Set(semesterSchedules.map((item) => item.cursoId)).size,
      conflicts: countConflicts(semesterSchedules),
    }),
    [semesterSchedules]
  );

  const catalogsReady =
    docentes.some((item) => item.activo) &&
    cursos.some((item) => item.activo) &&
    semestres.length > 0;

  const hasFilters =
    searchTerm.trim().length > 0 ||
    selectedCareerId !== 0 ||
    dayFilter !== "Todos" ||
    statusFilter !== "Todos";

  function openCreateModal() {
    setFormMode("create");
    setEditingSchedule(null);
    setModalError(null);
    setModalFieldErrors({});
    setFormOpen(true);
  }

  function openEditModal(horario: HorarioCurso) {
    setFormMode("edit");
    setEditingSchedule(horario);
    setModalError(null);
    setModalFieldErrors({});
    setFormOpen(true);
  }

  function closeFormModal() {
    if (submitting) return;
    setFormOpen(false);
    setEditingSchedule(null);
    setModalError(null);
    setModalFieldErrors({});
  }

  async function handleSave(values: HorarioFormValues) {
    setSubmitting(true);
    setModalError(null);
    setModalFieldErrors({});
    setOperationError(null);

    try {
      if (formMode === "create") {
        const created = await createHorario(values);
        setHorarios((current) => [created, ...current]);
        setSelectedSemesterId(created.semestreId);
      } else if (editingSchedule) {
        const updated = await updateHorario(editingSchedule.id, values);
        setHorarios((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
        setSelectedSemesterId(updated.semestreId);
      }

      setFormOpen(false);
      setEditingSchedule(null);
    } catch (error) {
      if (handleAuthError(error)) return;

      if (error instanceof ApiHorariosError) {
        setModalError(error.message);
        setModalFieldErrors((error.fields ?? {}) as FormFieldErrors);
      } else {
        setModalError("No se pudo guardar el horario.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmStatus() {
    const target = pendingStatus;
    if (!target) return;

    setOperationError(null);

    try {
      const updated = await changeHorarioStatus(target.id, !target.activo);
      setHorarios((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setPendingStatus(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del horario."
      );
      throw error;
    }
  }

  async function handleConfirmDelete() {
    const target = pendingDelete;
    if (!target) return;

    setOperationError(null);

    try {
      await deleteHorario(target.id);
      setHorarios((current) => current.filter((item) => item.id !== target.id));
      setPendingDelete(null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setOperationError(
        error instanceof Error ? error.message : "No se pudo eliminar el horario."
      );
      throw error;
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCareerId(0);
    setDayFilter("Todos");
    setStatusFilter("Todos");
  }

  if (loading) {
    return (
      <DashboardLayout user={currentUser}>
        <LoadingState title="Cargando horarios académicos" />
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout user={currentUser}>
        <ErrorState
          title="No se pudo cargar la programación"
          description={loadError}
          retryText="Reintentar"
          onRetry={() => void loadData()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Gestión académica"
          title="Horarios académicos"
          description="Administre la asignación institucional de docentes, cursos, aulas y bloques de clase por semestre."
          badge={
            <StatusBadge
              status={summary.conflicts > 0 ? "advertencia" : "operativo"}
              label={
                summary.conflicts > 0
                  ? `${summary.conflicts} conflicto(s) heredado(s)`
                  : "Programación validada"
              }
              size="md"
              showDot
            />
          }
          actions={
            <Button
              type="button"
              variant="primary"
              onClick={openCreateModal}
              disabled={!catalogsReady}
            >
              Nuevo horario
            </Button>
          }
        />

        <AcademicSubNavigation />

        {!catalogsReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            Para registrar horarios se requiere al menos un docente activo, un curso activo
            y un semestre académico. Utilice las secciones Cursos, Semestres y Departamentos
            para completar los catálogos institucionales.
          </div>
        )}

        {operationError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {operationError}
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Horarios registrados"
            value={summary.total}
            description={
              selectedCareerId === 0
                ? "En el semestre seleccionado"
                : "En la carrera seleccionada"
            }
            tone="blue"
          />
          <SummaryCard
            title="Docentes asignados"
            value={summary.teachers}
            description="Con carga académica"
            tone="green"
          />
          <SummaryCard
            title="Cursos programados"
            value={summary.courses}
            description={`${summary.active} bloques activos`}
            tone="orange"
          />
          <SummaryCard
            title="Conflictos detectados"
            value={summary.conflicts}
            description="Cruces de docente o aula"
            tone={summary.conflicts > 0 ? "red" : "green"}
          />
        </section>

        <SectionCard
          title="Filtros académicos"
          description="Consulte la programación por carrera, semestre, día, estado o término de búsqueda."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_210px_240px_180px_190px_auto]">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Curso, docente, código o aula"
              className={fieldClass}
            />

            <select
              value={selectedSemesterId}
              onChange={(event) => setSelectedSemesterId(Number(event.target.value))}
              className={fieldClass}
            >
              {semestres.length === 0 && <option value={0}>Sin semestres</option>}
              {semestres.map((semestre) => (
                <option key={semestre.id} value={semestre.id}>
                  {semestre.codigo}{semestre.activo ? " · Activo" : ""}
                </option>
              ))}
            </select>

            <select
              value={selectedCareerId}
              onChange={(event) => setSelectedCareerId(Number(event.target.value))}
              className={fieldClass}
              aria-label="Filtrar horarios por carrera"
            >
              <option value={0}>Todas las carreras</option>
              {careerOptions.map((career) => (
                <option key={career.id} value={career.id}>
                  {career.nombre}
                </option>
              ))}
            </select>

            <select
              value={String(dayFilter)}
              onChange={(event) =>
                setDayFilter(
                  event.target.value === "Todos"
                    ? "Todos"
                    : (Number(event.target.value) as DiaSemana)
                )
              }
              className={fieldClass}
            >
              <option value="Todos">Todos los días</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={fieldClass}
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activos">Activos</option>
              <option value="Inactivos">Inactivos</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpiar
            </Button>
          </div>
        </SectionCard>

        <WeeklySchedule
          horarios={semesterSchedules.filter((item) => item.activo)}
          cursos={cursos}
          docentes={docentes}
        />

        <HorariosTable
          horarios={filteredHorarios}
          cursos={cursos}
          docentes={docentes}
          semestres={semestres}
          onEdit={openEditModal}
          onToggleStatus={setPendingStatus}
          onDelete={setPendingDelete}
        />
      </div>

      <HorarioFormModal
        open={formOpen}
        mode={formMode}
        horario={editingSchedule}
        cursos={cursos}
        docentes={docentes}
        semestres={semestres}
        submitting={submitting}
        serverError={modalError}
        fieldErrors={modalFieldErrors}
        onClose={closeFormModal}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        onConfirm={handleConfirmStatus}
        title={pendingStatus?.activo ? "Desactivar horario" : "Activar horario"}
        description={
          pendingStatus?.activo
            ? "El bloque dejará de estar disponible para nuevas marcaciones, pero conservará su historial."
            : "El sistema validará nuevamente cruces, aula, docente y carga académica antes de activarlo."
        }
        confirmText={pendingStatus?.activo ? "Desactivar" : "Activar"}
        variant={pendingStatus?.activo ? "warning" : "info"}
        autoCloseOnSuccess={false}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar horario"
        description="La eliminación definitiva solo se realizará cuando el horario no tenga asistencias asociadas."
        confirmText="Eliminar"
        variant="danger"
        autoCloseOnSuccess={false}
      />
    </DashboardLayout>
  );
}

function countConflicts(horarios: HorarioCurso[]): number {
  let conflicts = 0;

  for (let firstIndex = 0; firstIndex < horarios.length; firstIndex += 1) {
    const first = horarios[firstIndex];
    if (!first.activo) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < horarios.length; secondIndex += 1) {
      const second = horarios[secondIndex];
      if (!second.activo) continue;

      const samePeriod =
        first.semestreId === second.semestreId &&
        first.diaSemana === second.diaSemana;
      const sameResource =
        first.docenteId === second.docenteId ||
        first.aula.trim().toLowerCase() === second.aula.trim().toLowerCase();
      const overlap =
        first.horaInicio < second.horaFin && second.horaInicio < first.horaFin;

      if (samePeriod && sameResource && overlap) conflicts += 1;
    }
  }

  return conflicts;
}

function SummaryCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  tone: "blue" | "green" | "orange" | "red";
}) {
  const toneClasses: Record<typeof tone, string> = {
    blue: "border-blue-100 bg-blue-50 text-unsaac-blue",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    red: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <Card className="p-5">
      <div className={`inline-flex rounded-xl border px-3 py-2 text-xs font-extrabold ${toneClasses[tone]}`}>
        {title}
      </div>
      <p className="mt-4 text-4xl font-extrabold tabular-nums text-unsaac-text">
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold text-unsaac-muted">{description}</p>
    </Card>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
