"use client";

import { useEffect, useState, type FormEvent } from "react";

import ModalShell from "@/components/shared/ModalShell";
import Button from "@/components/ui/Button";

import type {
  DepartamentoAcademico,
  DepartamentoFormValues,
} from "@/types/academico";

interface Props {
  open: boolean;
  department: DepartamentoAcademico | null;
  submitting: boolean;
  serverError: string | null;
  fieldErrors: Partial<Record<keyof DepartamentoFormValues, string>>;
  onClose: () => void;
  onSave: (values: DepartamentoFormValues) => void | Promise<void>;
}

const emptyForm: DepartamentoFormValues = {
  codigo: "",
  nombre: "",
  activo: true,
};

export default function DepartamentoFormModal({
  open,
  department,
  submitting,
  serverError,
  fieldErrors,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<DepartamentoFormValues>(emptyForm);
  const [localErrors, setLocalErrors] = useState<
    Partial<Record<keyof DepartamentoFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalErrors({});
    setForm(
      department
        ? {
            codigo: department.codigo,
            nombre: department.nombre,
            activo: department.activo,
          }
        : emptyForm
    );
  }, [open, department]);

  function update<K extends keyof DepartamentoFormValues>(
    field: K,
    value: DepartamentoFormValues[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Partial<Record<keyof DepartamentoFormValues, string>> = {};

    if (!form.codigo.trim()) errors.codigo = "Ingrese el código del departamento.";
    if (!form.nombre.trim()) errors.nombre = "Ingrese el nombre del departamento.";

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
      title={department ? "Editar departamento" : "Nuevo departamento"}
      description="Administre la unidad académica responsable de docentes y cursos."
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
            form="departamento-catalogo-form"
            loading={submitting}
            loadingText="Guardando"
          >
            Guardar departamento
          </Button>
        </>
      }
    >
      <form id="departamento-catalogo-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && <ErrorBanner message={serverError} />}

        <Field label="Código" error={errors.codigo}>
          <input
            value={form.codigo}
            maxLength={20}
            onChange={(event) => update("codigo", event.target.value.toUpperCase())}
            className={fieldClass(errors.codigo)}
            placeholder="ING-SIS"
          />
        </Field>

        <Field label="Nombre del departamento" error={errors.nombre}>
          <input
            value={form.nombre}
            maxLength={150}
            onChange={(event) => update("nombre", event.target.value)}
            className={fieldClass(errors.nombre)}
            placeholder="Ingeniería de Sistemas"
          />
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
              Departamento activo
            </span>
            <span className="mt-1 block text-xs font-semibold text-unsaac-muted">
              Disponible para docentes y cursos institucionales.
            </span>
          </span>
        </label>
      </form>
    </ModalShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-unsaac-text">{label}</span>
      {children}
      {error && <span className="mt-2 block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</div>;
}

function fieldClass(error?: string) {
  return `h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:ring-2 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-unsaac-blue focus:ring-blue-100"
  }`;
}
