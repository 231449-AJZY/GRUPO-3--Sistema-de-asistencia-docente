"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import Button from "@/components/ui/Button";

import type {
  CursoAcademico,
  DiaSemana,
  DocenteHorario,
  HorarioCurso,
  HorarioFormValues,
  SemestreAcademico,
} from "@/types/horario";

interface HorarioFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  horario: HorarioCurso | null;
  cursos: CursoAcademico[];
  docentes: DocenteHorario[];
  semestres: SemestreAcademico[];
  submitting?: boolean;
  serverError?: string | null;
  fieldErrors?: Partial<Record<keyof HorarioFormValues, string>>;
  onClose: () => void;
  onSave: (values: HorarioFormValues) => void | Promise<void>;
}

function firstAvailableId<T extends { id: number; activo: boolean }>(
  items: T[]
): number {
  return items.find((item) => item.activo)?.id ?? items[0]?.id ?? 0;
}

export default function HorarioFormModal({
  open,
  mode,
  horario,
  cursos,
  docentes,
  semestres,
  submitting = false,
  serverError,
  fieldErrors = {},
  onClose,
  onSave,
}: HorarioFormModalProps) {
  const activeSemester = useMemo(
    () => semestres.find((item) => item.activo) ?? semestres[0],
    [semestres]
  );

  const [values, setValues] = useState<HorarioFormValues>({
    docenteId: 0,
    cursoId: 0,
    semestreId: 0,
    aula: "",
    diaSemana: 1,
    horaInicio: "08:00",
    horaFin: "10:00",
    activo: true,
  });
  const [localError, setLocalError] = useState("");

  const hasCatalogs =
    docentes.length > 0 && cursos.length > 0 && semestres.length > 0;

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalError("");

    if (mode === "edit" && horario) {
      setValues({
        docenteId: horario.docenteId,
        cursoId: horario.cursoId,
        semestreId: horario.semestreId,
        aula: horario.aula,
        diaSemana: horario.diaSemana,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        activo: horario.activo,
      });
      return;
    }

    setValues({
      docenteId: firstAvailableId(docentes),
      cursoId: firstAvailableId(cursos),
      semestreId: activeSemester?.id ?? 0,
      aula: "",
      diaSemana: 1,
      horaInicio: "08:00",
      horaFin: "10:00",
      activo: true,
    });
  }, [open, mode, horario, docentes, cursos, activeSemester]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  function update<K extends keyof HorarioFormValues>(
    key: K,
    value: HorarioFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setLocalError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasCatalogs) {
      setLocalError(
        "Primero debe registrar al menos un docente, un curso y un semestre académico."
      );
      return;
    }

    if (!values.aula.trim()) {
      setLocalError("El aula es obligatoria.");
      return;
    }

    if (values.horaFin <= values.horaInicio) {
      setLocalError("La hora final debe ser posterior a la hora de inicio.");
      return;
    }

    void onSave({
      ...values,
      aula: values.aula.trim().toUpperCase(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="horario-form-title"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-unsaac-blue">
              Gestión académica
            </p>
            <h2
              id="horario-form-title"
              className="mt-2 text-2xl font-extrabold text-unsaac-text"
            >
              {mode === "create" ? "Registrar horario" : "Editar horario"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-unsaac-muted">
              Asigne un docente, curso, semestre, aula y bloque horario.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar formulario"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          {!hasCatalogs && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              No existen catálogos suficientes para crear horarios. Registre docentes,
              cursos y semestres antes de continuar.
            </div>
          )}

          {(localError || serverError) && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {localError || serverError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Docente" error={fieldErrors.docenteId}>
              <select
                value={values.docenteId}
                onChange={(event) => update("docenteId", Number(event.target.value))}
                className={fieldClass}
                disabled={submitting}
              >
                {docentes.map((docente) => (
                  <option
                    key={docente.id}
                    value={docente.id}
                    disabled={!docente.activo && docente.id !== values.docenteId}
                  >
                    {docente.codigo} · {docente.nombre}
                    {!docente.activo ? " (Inactivo)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Curso" error={fieldErrors.cursoId}>
              <select
                value={values.cursoId}
                onChange={(event) => update("cursoId", Number(event.target.value))}
                className={fieldClass}
                disabled={submitting}
              >
                {cursos.map((curso) => (
                  <option
                    key={curso.id}
                    value={curso.id}
                    disabled={!curso.activo && curso.id !== values.cursoId}
                  >
                    {curso.codigo} · {curso.nombre}
                    {!curso.activo ? " (Inactivo)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Semestre" error={fieldErrors.semestreId}>
              <select
                value={values.semestreId}
                onChange={(event) => update("semestreId", Number(event.target.value))}
                className={fieldClass}
                disabled={submitting}
              >
                {semestres.map((semestre) => (
                  <option key={semestre.id} value={semestre.id}>
                    {semestre.codigo}{semestre.activo ? " · Activo" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Aula" error={fieldErrors.aula}>
              <input
                type="text"
                value={values.aula}
                onChange={(event) => update("aula", event.target.value)}
                maxLength={50}
                placeholder="Ej. LAB-02"
                className={fieldClass}
                disabled={submitting}
              />
            </Field>

            <Field label="Día" error={fieldErrors.diaSemana}>
              <select
                value={values.diaSemana}
                onChange={(event) =>
                  update("diaSemana", Number(event.target.value) as DiaSemana)
                }
                className={fieldClass}
                disabled={submitting}
              >
                <option value={1}>Lunes</option>
                <option value={2}>Martes</option>
                <option value={3}>Miércoles</option>
                <option value={4}>Jueves</option>
                <option value={5}>Viernes</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora de inicio" error={fieldErrors.horaInicio}>
                <input
                  type="time"
                  value={values.horaInicio}
                  onChange={(event) => update("horaInicio", event.target.value)}
                  className={fieldClass}
                  disabled={submitting}
                />
              </Field>

              <Field label="Hora final" error={fieldErrors.horaFin}>
                <input
                  type="time"
                  value={values.horaFin}
                  onChange={(event) => update("horaFin", event.target.value)}
                  className={fieldClass}
                  disabled={submitting}
                />
              </Field>
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-unsaac-text">
            <input
              type="checkbox"
              checked={values.activo}
              onChange={(event) => update("activo", event.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-slate-300"
            />
            Horario activo
          </label>

          <footer className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              loadingText="Guardando..."
              disabled={!hasCatalogs}
            >
              {mode === "create" ? "Registrar horario" : "Guardar cambios"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-unsaac-text">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
