"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import Button from "@/components/ui/Button";

import type {
  RolSistema,
  Usuario,
  UsuarioFormValues,
  UsuarioRolId,
} from "@/types/usuario";

type UsuarioFormMode =
  | "create"
  | "edit";

type FormErrors = Partial<
  Record<
    keyof UsuarioFormValues,
    string
  >
>;

interface UsuarioFormModalProps {
  open: boolean;
  mode: UsuarioFormMode;
  usuario: Usuario | null;
  usuarios: Usuario[];
  roles: RolSistema[];
  currentUserId: number;
  submitting?: boolean;
  serverError?: string | null;
  serverFieldErrors?: FormErrors;
  onClose: () => void;
  onSave: (
    values: UsuarioFormValues
  ) => void | Promise<void>;
}

const EMPTY_VALUES: UsuarioFormValues = {
  codigo: "",
  nombres: "",
  apellidos: "",
  email: "",
  rolId: 2,
  activo: true,
  password: "",
};

export default function UsuarioFormModal({
  open,
  mode,
  usuario,
  usuarios,
  roles,
  currentUserId,
  submitting = false,
  serverError = null,
  serverFieldErrors,
  onClose,
  onSave,
}: UsuarioFormModalProps) {
  const [values, setValues] =
    useState<UsuarioFormValues>(
      EMPTY_VALUES
    );

  const [errors, setErrors] =
    useState<FormErrors>({});

  const editingCurrentUser =
    mode === "edit" &&
    usuario?.id === currentUserId;

  const editingDocente =
    mode === "edit" &&
    usuario?.rol === "Docente";

  const availableRoles = roles.filter((role) => {
    if (editingDocente) {
      return role.nombre === "Docente";
    }

    return role.nombre !== "Docente";
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      mode === "edit" &&
      usuario
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues({
        codigo: usuario.codigo,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rolId: usuario.rolId,
        activo: usuario.activo,
        password: "",
      });
    } else {
      const defaultRole =
        roles.find((role) => role.nombre === "Supervisor") ??
        roles.find((role) => role.nombre !== "Docente");

      setValues({
        ...EMPTY_VALUES,
        rolId: defaultRole?.id ?? 1,
      });
    }

    setErrors({});
  }, [
    open,
    mode,
    usuario,
    roles,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!serverFieldErrors) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors((current) => ({
      ...current,
      ...serverFieldErrors,
    }));
  }, [open, serverFieldErrors]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, onClose, submitting]);

  if (!open) {
    return null;
  }

  function updateText(
    field:
      | "codigo"
      | "nombres"
      | "apellidos"
      | "email"
      | "password",
    value: string
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function validate() {
    const nextErrors: FormErrors = {};

    const codigo =
      values.codigo.trim().toUpperCase();

    const nombres =
      values.nombres.trim();

    const apellidos =
      values.apellidos.trim();

    const email =
      values.email.trim().toLowerCase();

    if (!codigo) {
      nextErrors.codigo =
        "El código institucional es obligatorio.";
    } else if (codigo.length > 20) {
      nextErrors.codigo =
        "El código no puede superar 20 caracteres.";
    }

    if (!nombres) {
      nextErrors.nombres =
        "Los nombres son obligatorios.";
    } else if (nombres.length > 100) {
      nextErrors.nombres =
        "Los nombres no pueden superar 100 caracteres.";
    }

    if (!apellidos) {
      nextErrors.apellidos =
        "Los apellidos son obligatorios.";
    } else if (
      apellidos.length > 100
    ) {
      nextErrors.apellidos =
        "Los apellidos no pueden superar 100 caracteres.";
    }

    if (!email) {
      nextErrors.email =
        "El correo es obligatorio.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      nextErrors.email =
        "Ingrese un correo válido.";
    } else if (email.length > 150) {
      nextErrors.email =
        "El correo no puede superar 150 caracteres.";
    }

    if (
      mode === "create" &&
      !values.password.trim()
    ) {
      nextErrors.password =
        "La contraseña inicial es obligatoria.";
    } else if (
      values.password &&
      values.password.length < 8
    ) {
      nextErrors.password =
        "La contraseña debe contener al menos 8 caracteres.";
    }

    const duplicatedCode =
      usuarios.some((item) => {
        return (
          item.id !== usuario?.id &&
          item.codigo
            .trim()
            .toUpperCase() === codigo
        );
      });

    if (duplicatedCode) {
      nextErrors.codigo =
        "Ya existe un usuario con este código.";
    }

    const duplicatedEmail =
      usuarios.some((item) => {
        return (
          item.id !== usuario?.id &&
          item.email
            .trim()
            .toLowerCase() === email
        );
      });

    if (duplicatedEmail) {
      nextErrors.email =
        "Ya existe un usuario con este correo.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    await onSave({
      codigo:
        values.codigo
          .trim()
          .toUpperCase(),

      nombres:
        values.nombres.trim(),

      apellidos:
        values.apellidos.trim(),

      email:
        values.email
          .trim()
          .toLowerCase(),

      rolId:
        editingCurrentUser &&
        usuario
          ? usuario.rolId
          : values.rolId,

      activo:
        editingCurrentUser &&
        usuario
          ? usuario.activo
          : values.activo,

      password:
        values.password,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="usuario-form-title"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-5 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-unsaac-blue">
              Gestión de usuarios
            </p>

            <h2
              id="usuario-form-title"
              className="mt-2 text-2xl font-extrabold text-unsaac-text"
            >
              {mode === "create"
                ? "Registrar nuevo usuario"
                : "Editar usuario"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-unsaac-muted">
              {mode === "create"
                ? "Complete los datos de la cuenta institucional y asigne su rol."
                : "Actualice la información permitida de la cuenta seleccionada."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {serverError && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
              >
                <p className="font-extrabold text-red-800">
                  No se pudo guardar el usuario
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-red-700">
                  {serverError}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldContainer
                label="Código institucional"
                error={errors.codigo}
                required
              >
                <input
                  type="text"
                  value={values.codigo}
                  onChange={(event) =>
                    updateText(
                      "codigo",
                      event.target.value
                    )
                  }
                  maxLength={20}
                  placeholder="Ejemplo: DOC-006"
                  autoComplete="off"
                  className={getFieldClasses(
                    Boolean(errors.codigo)
                  )}
                />
              </FieldContainer>

              <FieldContainer
                label="Correo institucional"
                error={errors.email}
                required
              >
                <input
                  type="email"
                  value={values.email}
                  onChange={(event) =>
                    updateText(
                      "email",
                      event.target.value
                    )
                  }
                  maxLength={150}
                  placeholder="usuario@unsaac.edu.pe"
                  autoComplete="email"
                  className={getFieldClasses(
                    Boolean(errors.email)
                  )}
                />
              </FieldContainer>

              <FieldContainer
                label="Nombres"
                error={errors.nombres}
                required
              >
                <input
                  type="text"
                  value={values.nombres}
                  onChange={(event) =>
                    updateText(
                      "nombres",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Nombres del usuario"
                  autoComplete="given-name"
                  className={getFieldClasses(
                    Boolean(errors.nombres)
                  )}
                />
              </FieldContainer>

              <FieldContainer
                label="Apellidos"
                error={errors.apellidos}
                required
              >
                <input
                  type="text"
                  value={values.apellidos}
                  onChange={(event) =>
                    updateText(
                      "apellidos",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Apellidos del usuario"
                  autoComplete="family-name"
                  className={getFieldClasses(
                    Boolean(errors.apellidos)
                  )}
                />
              </FieldContainer>

              <FieldContainer
                label="Rol del sistema"
                error={errors.rolId}
                required
              >
                <select
                  value={values.rolId}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      rolId: Number(
                        event.target.value
                      ) as UsuarioRolId,
                    }));
                  }}
                  disabled={editingCurrentUser}
                  className={getFieldClasses(
                    Boolean(errors.rolId)
                  )}
                >
                  {availableRoles.map((rol) => (
                    <option
                      key={rol.id}
                      value={rol.id}
                    >
                      {rol.nombre}
                    </option>
                  ))}
                </select>

                {editingCurrentUser && (
                  <p className="mt-2 text-xs font-bold text-orange-700">
                    No puede modificar el rol de la sesión actual.
                  </p>
                )}

                {!editingDocente && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-unsaac-muted">
                    Las cuentas docentes se registran desde Gestión de docentes para conservar su información académica.
                  </p>
                )}
              </FieldContainer>

              <FieldContainer
                label={
                  mode === "create"
                    ? "Contraseña inicial"
                    : "Nueva contraseña"
                }
                error={errors.password}
                required={
                  mode === "create"
                }
              >
                <input
                  type="password"
                  value={values.password}
                  onChange={(event) =>
                    updateText(
                      "password",
                      event.target.value
                    )
                  }
                  placeholder={
                    mode === "create"
                      ? "Contraseña temporal"
                      : "Dejar vacío para conservar"
                  }
                  autoComplete="new-password"
                  className={getFieldClasses(
                    Boolean(errors.password)
                  )}
                />

                <p className="mt-2 text-xs font-semibold leading-5 text-unsaac-muted">
                  La contraseña se procesa de forma segura y no se muestra después de guardar la cuenta.
                </p>
              </FieldContainer>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <input
                  id="usuario-activo"
                  type="checkbox"
                  checked={values.activo}
                  disabled={editingCurrentUser}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      activo:
                        event.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-unsaac-blue focus:ring-unsaac-blue"
                />

                <label
                  htmlFor="usuario-activo"
                  className="cursor-pointer"
                >
                  <span className="block font-extrabold text-unsaac-text">
                    Usuario activo
                  </span>

                  <span className="mt-1 block text-sm font-semibold leading-6 text-unsaac-muted">
                    Los usuarios inactivos no podrán iniciar sesión en el sistema.
                  </span>
                </label>
              </div>

              {editingCurrentUser && (
                <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
                  La sesión actual no puede desactivarse desde este formulario.
                </p>
              )}
            </div>

            {roles.find((role) => role.id === values.rolId)?.nombre === "Docente" && (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <p className="font-extrabold text-unsaac-blue">
                  Cuenta de docente
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-unsaac-muted">
                  Este formulario administra la cuenta de acceso. DNI, departamento, categoría, condición y teléfono corresponden al perfil extendido del módulo de Docentes.
                </p>
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
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
              leftIcon={<SaveIcon />}
              disabled={submitting}
            >
              {submitting
                ? "Guardando..."
                : mode === "create"
                  ? "Registrar usuario"
                  : "Guardar cambios"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function FieldContainer({
  label,
  error,
  required = false,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-unsaac-text">
        {label}

        {required && (
          <span className="ml-1 text-red-600">
            *
          </span>
        )}
      </span>

      {children}

      {error && (
        <span className="mt-2 block text-xs font-bold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

function getFieldClasses(
  hasError: boolean
) {
  return [
    "h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold",
    "text-unsaac-text outline-none transition",
    "placeholder:text-slate-400",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
      : "border-slate-200 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100",
  ].join(" ");
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 4h12l2 2v14H5V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M8 4v6h8V4M8 20v-6h8v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}