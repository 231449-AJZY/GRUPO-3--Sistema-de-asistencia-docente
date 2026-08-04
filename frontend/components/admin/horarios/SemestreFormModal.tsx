"use client";

import { useEffect, useState, type FormEvent } from "react";

import ModalShell from "@/components/shared/ModalShell";
import Button from "@/components/ui/Button";

import type { SemestreCatalogo, SemestreFormValues } from "@/types/academico";

interface Props {
  open: boolean;
  semester: SemestreCatalogo | null;
  submitting: boolean;
  serverError: string | null;
  fieldErrors: Partial<Record<keyof SemestreFormValues, string>>;
  onClose: () => void;
  onSave: (values: SemestreFormValues) => void | Promise<void>;
}

const emptyForm: SemestreFormValues = {
  codigo: "",
  fechaInicio: "",
  fechaFin: "",
  activo: false,
};

export default function SemestreFormModal({
  open,
  semester,
  submitting,
  serverError,
  fieldErrors,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<SemestreFormValues>(emptyForm);
  const [localErrors, setLocalErrors] = useState<
    Partial<Record<keyof SemestreFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalErrors({});
    setForm(
      semester
        ? {
            codigo: semester.codigo,
            fechaInicio: semester.fechaInicio,
            fechaFin: semester.fechaFin,
            activo: semester.activo,
          }
        : emptyForm
    );
  }, [open, semester]);

  function update<K extends keyof SemestreFormValues>(
    field: K,
    value: SemestreFormValues[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Partial<Record<keyof SemestreFormValues, string>> = {};

    if (!form.codigo.trim()) errors.codigo = "Ingrese el código del semestre.";
    if (!form.fechaInicio) errors.fechaInicio = "Ingrese la fecha de inicio.";
    if (!form.fechaFin) errors.fechaFin = "Ingrese la fecha de finalización.";
    if (form.fechaInicio && form.fechaFin && form.fechaFin <= form.fechaInicio) {
      errors.fechaFin = "La fecha final debe ser posterior a la fecha de inicio.";
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    await onSave({ ...form, codigo: form.codigo.trim().toUpperCase() });
  }

  const errors = { ...localErrors, ...fieldErrors };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={semester ? "Editar semestre" : "Nuevo semestre"}
      description="Defina las fechas del periodo académico institucional."
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
            form="semestre-catalogo-form"
            loading={submitting}
            loadingText="Guardando"
          >
            Guardar semestre
          </Button>
        </>
      }
    >
      <form id="semestre-catalogo-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && <ErrorBanner message={serverError} />}

        <Field label="Código del periodo" error={errors.codigo}>
          <input
            value={form.codigo}
            maxLength={15}
            onChange={(event) => update("codigo", event.target.value.toUpperCase())}
            className={fieldClass(errors.codigo)}
            placeholder="2026-I"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Fecha de inicio" error={errors.fechaInicio}>
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(event) => update("fechaInicio", event.target.value)}
              className={fieldClass(errors.fechaInicio)}
            />
          </Field>

          <Field label="Fecha de finalización" error={errors.fechaFin}>
            <input
              type="date"
              value={form.fechaFin}
              onChange={(event) => update("fechaFin", event.target.value)}
              className={fieldClass(errors.fechaFin)}
            />
          </Field>
        </div>

        {!semester?.activo && (
          <label className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(event) => update("activo", event.target.checked)}
              className="h-5 w-5 rounded border-slate-300"
            />
            <span>
              <span className="block text-sm font-extrabold text-unsaac-blue">
                Establecer como periodo activo
              </span>
              <span className="mt-1 block text-xs font-semibold text-blue-700">
                El periodo activo anterior quedará desactivado automáticamente.
              </span>
            </span>
          </label>
        )}
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
