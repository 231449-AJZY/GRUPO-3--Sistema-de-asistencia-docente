"use client";

import { useEffect, useState, type FormEvent } from "react";

import ModalShell from "@/components/shared/ModalShell";
import Button from "@/components/ui/Button";

import type {
  CursoCatalogo,
  CursoFormValues,
  DepartamentoAcademico,
} from "@/types/academico";

interface Props {
  open: boolean;
  course: CursoCatalogo | null;
  departments: DepartamentoAcademico[];
  submitting: boolean;
  serverError: string | null;
  fieldErrors: Partial<Record<keyof CursoFormValues, string>>;
  onClose: () => void;
  onSave: (values: CursoFormValues) => void | Promise<void>;
}

const emptyForm: CursoFormValues = {
  codigo: "",
  nombre: "",
  departamentoId: 0,
  creditos: 3,
  activo: true,
};

export default function CursoFormModal({
  open,
  course,
  departments,
  submitting,
  serverError,
  fieldErrors,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<CursoFormValues>(emptyForm);
  const [localErrors, setLocalErrors] = useState<
    Partial<Record<keyof CursoFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;

    const firstDepartment = departments.find((item) => item.activo);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalErrors({});
    setForm(
      course
        ? {
            codigo: course.codigo,
            nombre: course.nombre,
            departamentoId: course.departamentoId,
            creditos: course.creditos,
            activo: course.activo,
          }
        : {
            ...emptyForm,
            departamentoId: firstDepartment?.id ?? 0,
          }
    );
  }, [open, course, departments]);

  function update<K extends keyof CursoFormValues>(
    field: K,
    value: CursoFormValues[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Partial<Record<keyof CursoFormValues, string>> = {};
    if (!form.codigo.trim()) errors.codigo = "Ingrese el código del curso.";
    if (!form.nombre.trim()) errors.nombre = "Ingrese el nombre del curso.";
    if (!form.departamentoId) {
      errors.departamentoId = "Seleccione un departamento académico.";
    }
    if (!Number.isInteger(form.creditos) || form.creditos < 1 || form.creditos > 10) {
      errors.creditos = "Ingrese entre 1 y 10 créditos.";
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    await onSave({
      ...form,
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
    });
  }

  const errors = { ...localErrors, ...fieldErrors };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={course ? "Editar curso" : "Nuevo curso"}
      description="Registre el curso y su unidad académica responsable."
      size="md"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      showCloseButton={!submitting}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="curso-catalogo-form"
            variant="primary"
            loading={submitting}
            loadingText="Guardando"
          >
            Guardar curso
          </Button>
        </>
      }
    >
      <form id="curso-catalogo-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && <ErrorBanner message={serverError} />}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Código" error={errors.codigo}>
            <input
              value={form.codigo}
              maxLength={20}
              onChange={(event) => update("codigo", event.target.value.toUpperCase())}
              className={fieldClass(errors.codigo)}
              placeholder="IS-301"
            />
          </Field>

          <Field label="Créditos" error={errors.creditos}>
            <input
              type="number"
              min={1}
              max={10}
              value={form.creditos}
              onChange={(event) => update("creditos", Number(event.target.value))}
              className={fieldClass(errors.creditos)}
            />
          </Field>
        </div>

        <Field label="Nombre del curso" error={errors.nombre}>
          <input
            value={form.nombre}
            maxLength={150}
            onChange={(event) => update("nombre", event.target.value)}
            className={fieldClass(errors.nombre)}
            placeholder="Ingeniería de Software"
          />
        </Field>

        <Field label="Departamento académico" error={errors.departamentoId}>
          <select
            value={form.departamentoId}
            onChange={(event) => update("departamentoId", Number(event.target.value))}
            className={fieldClass(errors.departamentoId)}
          >
            <option value={0}>Seleccione un departamento</option>
            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
                disabled={!department.activo && department.id !== form.departamentoId}
              >
                {department.codigo} · {department.nombre}
                {!department.activo ? " · Inactivo" : ""}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(event) => update("activo", event.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-extrabold text-unsaac-text">
              Curso activo
            </span>
            <span className="mt-1 block text-xs font-semibold text-unsaac-muted">
              Disponible para nuevas asignaciones de horario.
            </span>
          </span>
        </label>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-unsaac-text">{label}</span>
      {children}
      {error && <span className="mt-2 block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function fieldClass(error?: string) {
  return `h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:ring-2 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-unsaac-blue focus:ring-blue-100"
  }`;
}
