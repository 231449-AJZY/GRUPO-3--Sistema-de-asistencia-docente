"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import ModalShell from "@/components/shared/ModalShell";
import StatusBadge from "@/components/shared/StatusBadge";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

import type {
  CategoriaDocente,
  Docente,
  DocenteFormData,
  EstadoBiometrico,
  EstadoDocente,
} from "@/types/docente";

interface DocenteFormModalProps {
  open: boolean;
  mode: "create" | "edit" | "view";
  docente: Docente | null;
  submitting?: boolean;
  departamentos?: string[];
  onClose: () => void;
  onSubmit: (
    data: DocenteFormData
  ) => void | Promise<void>;
}

type FormErrors = Partial<
  Record<keyof DocenteFormData, string>
>;

const FORM_ID = "docente-form";

const DEFAULT_FORM: DocenteFormData = {
  dni: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  departamento: "",
  categoria: "Contratado",
  estadoBiometrico: "Pendiente",
  estado: "Activo",
};



const CATEGORIAS: CategoriaDocente[] = [
  "Principal",
  "Asociado",
  "Auxiliar",
  "Contratado",
];

const ESTADOS_BIOMETRICOS: EstadoBiometrico[] = [
  "Registrado",
  "Pendiente",
];

const ESTADOS_DOCENTE: EstadoDocente[] = [
  "Activo",
  "Inactivo",
];

export default function DocenteFormModal({
  open,
  mode,
  docente,
  submitting = false,
  departamentos = [],
  onClose,
  onSubmit,
}: DocenteFormModalProps) {
  const [form, setForm] =
    useState<DocenteFormData>(DEFAULT_FORM);

  const [errors, setErrors] =
    useState<FormErrors>({});

  const readonly = mode === "view";

  const departmentOptions = departamentos;

  const firstDepartment =
    departmentOptions[0] ?? "";

  const hasDepartments =
    departmentOptions.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    // El formulario se reinicializa cuando cambia el registro mostrado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({});

    if (docente) {
      setForm({
        dni: docente.dni,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        correo: docente.correo,
        telefono: docente.telefono,
        departamento: docente.departamento,
        categoria: docente.categoria,
        estadoBiometrico:
          docente.estadoBiometrico,
        estado: docente.estado,
      });

      return;
    }

    setForm({
      ...DEFAULT_FORM,
      departamento:
        firstDepartment,
    });
  }, [open, docente, firstDepartment]);

  function update<
    K extends keyof DocenteFormData
  >(
    key: K,
    value: DocenteFormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];

      return next;
    });
  }

  function validateForm(
    data: DocenteFormData
  ): FormErrors {
    const nextErrors: FormErrors = {};

    if (!data.nombres.trim()) {
      nextErrors.nombres =
        "Ingrese los nombres del docente.";
    }

    if (!data.apellidos.trim()) {
      nextErrors.apellidos =
        "Ingrese los apellidos del docente.";
    }

    if (!/^\d{8}$/.test(data.dni.trim())) {
      nextErrors.dni =
        "El DNI debe contener exactamente 8 dígitos.";
    }

    if (
      data.telefono.trim() &&
      !/^\d{9}$/.test(data.telefono.trim())
    ) {
      nextErrors.telefono =
        "El teléfono debe contener 9 dígitos.";
    }

    if (!data.correo.trim()) {
      nextErrors.correo =
        "Ingrese el correo institucional.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        data.correo.trim()
      )
    ) {
      nextErrors.correo =
        "Ingrese un correo electrónico válido.";
    }

    if (!data.departamento.trim()) {
      nextErrors.departamento =
        "Seleccione un departamento académico.";
    }

    return nextErrors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (readonly) {
      return;
    }

    const cleanedForm: DocenteFormData = {
      ...form,
      dni: form.dni.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      correo: form.correo.trim().toLowerCase(),
      telefono: form.telefono.trim(),
      departamento:
        form.departamento.trim(),
    };

    const nextErrors =
      validateForm(cleanedForm);

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    await onSubmit(cleanedForm);
  }

  const title =
    mode === "create"
      ? "Registrar nuevo docente"
      : mode === "edit"
        ? "Editar docente"
        : "Detalle del docente";

  const description =
    mode === "create"
      ? "Complete la información personal e institucional del nuevo docente."
      : mode === "edit"
        ? "Actualice la información registrada del docente seleccionado."
        : "Consulte la información personal, institucional y biométrica del docente.";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      showCloseButton={!submitting}
      footer={
        readonly ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cerrar
          </Button>
        ) : (
          <>
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
              form={FORM_ID}
              variant="primary"
              disabled={!hasDepartments}
              loading={submitting}
              loadingText={
                mode === "edit"
                  ? "Guardando..."
                  : "Registrando..."
              }
            >
              {mode === "edit"
                ? "Guardar cambios"
                : "Registrar docente"}
            </Button>
          </>
        )
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-7"
      >
        {readonly && docente && (
          <section className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-unsaac-blue">
                Código institucional
              </p>

              <p className="mt-1 text-xl font-extrabold text-unsaac-text">
                {docente.codigo}
              </p>

              <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                Registrado el{" "}
                {formatDate(
                  docente.fechaRegistro
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={form.estado}
                size="md"
              />

              <StatusBadge
                status={
                  form.estadoBiometrico
                }
                size="md"
              />
            </div>
          </section>
        )}

        <FormSection
          title="Información personal"
          description="Datos de identificación y contacto del docente."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Nombres"
              value={form.nombres}
              onChange={(event) =>
                update(
                  "nombres",
                  event.target.value
                )
              }
              placeholder="Ingrese los nombres"
              error={errors.nombres}
              disabled={readonly || submitting}
              autoComplete="given-name"
              required
            />

            <Input
              label="Apellidos"
              value={form.apellidos}
              onChange={(event) =>
                update(
                  "apellidos",
                  event.target.value
                )
              }
              placeholder="Ingrese los apellidos"
              error={errors.apellidos}
              disabled={readonly || submitting}
              autoComplete="family-name"
              required
            />

            <Input
              label="DNI"
              value={form.dni}
              onChange={(event) =>
                update(
                  "dni",
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 8)
                )
              }
              placeholder="00000000"
              error={errors.dni}
              helperText="Documento nacional de identidad de 8 dígitos."
              disabled={readonly || submitting}
              inputMode="numeric"
              maxLength={8}
              required
            />

            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(event) =>
                update(
                  "telefono",
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 9)
                )
              }
              placeholder="999999999"
              error={errors.telefono}
              helperText="Campo opcional de 9 dígitos."
              disabled={readonly || submitting}
              inputMode="tel"
              autoComplete="tel"
              maxLength={9}
            />
          </div>
        </FormSection>

        <FormSection
          title="Información institucional"
          description="Datos académicos asociados al docente."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Correo institucional"
                type="email"
                value={form.correo}
                onChange={(event) =>
                  update(
                    "correo",
                    event.target.value
                  )
                }
                placeholder="docente@unsaac.edu.pe"
                error={errors.correo}
                disabled={readonly || submitting}
                autoComplete="email"
                required
              />
            </div>

            <Select
              label="Departamento académico"
              value={form.departamento}
              onChange={(event) =>
                update(
                  "departamento",
                  event.target.value
                )
              }
              error={errors.departamento}
              disabled={
                readonly ||
                submitting ||
                !hasDepartments
              }
              required
            >
              {!hasDepartments && (
                <option value="">
                  No hay departamentos activos
                </option>
              )}

              {departmentOptions.map(
                (departamento) => (
                  <option
                    key={departamento}
                    value={departamento}
                  >
                    {departamento}
                  </option>
                )
              )}
            </Select>

            {!hasDepartments && !readonly && (
              <p className="md:col-span-2 -mt-2 text-sm font-semibold text-amber-700">
                Primero debe existir al menos un departamento académico activo en el sistema.
              </p>
            )}

            <Select
              label="Categoría docente"
              value={form.categoria}
              onChange={(event) =>
                update(
                  "categoria",
                  event.target
                    .value as CategoriaDocente
                )
              }
              disabled={readonly || submitting}
              required
            >
              {CATEGORIAS.map(
                (categoria) => (
                  <option
                    key={categoria}
                    value={categoria}
                  >
                    {categoria}
                  </option>
                )
              )}
            </Select>
          </div>
        </FormSection>

        <FormSection
          title="Estado y control biométrico"
          description="Situación operativa actual del docente dentro del sistema."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Select
              label="Estado biométrico"
              value={form.estadoBiometrico}
              onChange={(event) =>
                update(
                  "estadoBiometrico",
                  event.target
                    .value as EstadoBiometrico
                )
              }
              disabled
              helperText="El estado biométrico se actualiza desde el módulo de Biometría."
            >
              {ESTADOS_BIOMETRICOS.map(
                (estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </option>
                )
              )}
            </Select>

            <Select
              label="Estado del docente"
              value={form.estado}
              onChange={(event) =>
                update(
                  "estado",
                  event.target
                    .value as EstadoDocente
                )
              }
              disabled={readonly || submitting}
              helperText="Controla la disponibilidad del docente en el sistema."
            >
              {ESTADOS_DOCENTE.map(
                (estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </option>
                )
              )}
            </Select>
          </div>

          {!readonly && (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <InfoIcon />

                <div>
                  <p className="text-sm font-extrabold text-unsaac-blue">
                    Información importante
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-unsaac-muted">
                    El registro detallado de huellas se administrará desde el módulo de Biometría.
                  </p>
                </div>
              </div>
            </div>
          )}
        </FormSection>
      </form>
    </ModalShell>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-unsaac-text">
          {title}
        </h3>

        <p className="mt-1 text-sm font-medium text-unsaac-muted">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function InfoIcon() {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-unsaac-blue"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M12 11v5M12 8v.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatDate(value: string) {
  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}