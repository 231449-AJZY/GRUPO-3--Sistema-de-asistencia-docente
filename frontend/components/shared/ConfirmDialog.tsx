"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import ModalShell from "./ModalShell";

export type ConfirmDialogVariant =
  | "danger"
  | "warning"
  | "info";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  autoCloseOnSuccess?: boolean;
  icon?: ReactNode;
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  {
    iconContainer: string;
    iconColor: string;
    confirmButton: string;
    focusRing: string;
  }
> = {
  danger: {
    iconContainer:
      "border-red-200 bg-red-50",
    iconColor:
      "text-red-600",
    confirmButton:
      "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
    focusRing:
      "focus-visible:ring-red-200",
  },

  warning: {
    iconContainer:
      "border-amber-200 bg-amber-50",
    iconColor:
      "text-amber-600",
    confirmButton:
      "bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300",
    focusRing:
      "focus-visible:ring-amber-200",
  },

  info: {
    iconContainer:
      "border-blue-200 bg-blue-50",
    iconColor:
      "text-unsaac-blue",
    confirmButton:
      "bg-unsaac-blue text-white hover:brightness-90 disabled:opacity-50",
    focusRing:
      "focus-visible:ring-blue-200",
  },
};

function DialogIcon({
  variant,
}: {
  variant: ConfirmDialogVariant;
}) {
  if (variant === "danger") {
    return (
      <svg
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "warning") {
    return (
      <svg
        className="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 4 3.5 19h17L12 4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        <path
          d="M12 9v4M12 16.5v.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
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

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
  autoCloseOnSuccess = true,
  icon,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] =
    useState(false);

  const busy =
    loading ||
    internalLoading;

  const config =
    VARIANT_CONFIG[variant];

  useEffect(() => {
    if (!open) {
      setInternalLoading(false);
    }
  }, [open]);

  async function handleConfirm() {
    if (busy) {
      return;
    }

    try {
      setInternalLoading(true);

      await onConfirm();

      if (autoCloseOnSuccess) {
        onClose();
      }
    } catch (error) {
      console.error(
        "Error al confirmar la acción:",
        error
      );
    } finally {
      setInternalLoading(false);
    }
  }

  function handleClose() {
    if (!busy) {
      onClose();
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      showCloseButton={!busy}
      contentClassName="py-7"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`inline-flex min-h-11 min-w-[130px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${config.confirmButton} ${config.focusRing}`}
          >
            {busy && <LoadingSpinner />}

            <span>
              {busy
                ? "Procesando..."
                : confirmText}
            </span>
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-3xl border ${config.iconContainer} ${config.iconColor}`}
        >
          {icon ?? (
            <DialogIcon variant={variant} />
          )}
        </div>

        <p className="mt-5 max-w-md text-sm font-medium leading-6 text-unsaac-muted">
          Revisa la información antes de continuar. Esta acción puede afectar los datos registrados en el sistema.
        </p>
      </div>
    </ModalShell>
  );
}