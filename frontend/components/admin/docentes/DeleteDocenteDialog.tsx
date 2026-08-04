"use client";

import {
  useState,
  type FormEvent,
} from "react";

import ModalShell from "@/components/shared/ModalShell";
import Button from "@/components/ui/Button";

import type { Docente } from "@/types/docente";

interface DeleteDocenteDialogProps {
  open: boolean;
  docente: Docente | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const CONFIRMATION_TEXT = "ELIMINAR";

export default function DeleteDocenteDialog({
  open,
  docente,
  onClose,
  onConfirm,
}: DeleteDocenteDialogProps) {
  const [confirmation, setConfirmation] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  const confirmed =
    confirmation.trim().toUpperCase() ===
    CONFIRMATION_TEXT;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!confirmed || loading) {
      return;
    }

    try {
      setLoading(true);
      await onConfirm();
      setConfirmation("");
    } catch (error) {
      console.error(
        "No se pudo eliminar el docente:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setConfirmation("");
      onClose();
    }
  }

  const fullName = docente
    ? `${docente.nombres} ${docente.apellidos}`.trim()
    : "el docente seleccionado";

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Eliminar docente"
      description={`Se verificará si ${fullName} posee información institucional vinculada antes de realizar la eliminación.`}
      size="sm"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            form="delete-docente-form"
            variant="danger"
            leftIcon={<TrashIcon />}
            loading={loading}
            loadingText="Verificando..."
            disabled={!confirmed}
          >
            Eliminar definitivamente
          </Button>
        </div>
      }
    >
      <form
        id="delete-docente-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <TrashIcon />
            </span>

            <div>
              <p className="font-extrabold text-red-800">
                Acción definitiva
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-red-700">
                Solo se eliminará la cuenta cuando no tenga horarios,
                asistencias, alertas ni otra información institucional.
                Cuando exista historial, el sistema ofrecerá dar de baja
                al docente sin borrar sus registros.
              </p>
            </div>
          </div>
        </div>

        {docente && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-extrabold text-unsaac-text">
              {fullName}
            </p>
            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              {docente.codigo} · DNI {docente.dni}
            </p>
            <p className="mt-1 break-all text-sm font-medium text-slate-500">
              {docente.correo}
            </p>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-extrabold text-unsaac-text">
            Escriba{" "}
            <span className="text-red-600">
              {CONFIRMATION_TEXT}
            </span>{" "}
            para confirmar
          </span>

          <input
            type="text"
            value={confirmation}
            onChange={(event) =>
              setConfirmation(event.target.value)
            }
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            placeholder={CONFIRMATION_TEXT}
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-unsaac-text outline-none transition placeholder:text-slate-300 focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-describedby="delete-docente-help"
          />

          <span
            id="delete-docente-help"
            className="mt-2 block text-xs font-semibold leading-5 text-unsaac-muted"
          >
            Esta confirmación evita eliminaciones accidentales.
          </span>
        </label>
      </form>
    </ModalShell>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
