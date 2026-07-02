"use client";

import type { ReactNode } from "react";
import Button from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "success" | "warning" | "danger";
  onConfirm?: () => void;
  onClose: () => void;
}

export default function Modal({
  open,
  title,
  description,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
  onConfirm,
  onClose,
}: ModalProps) {
  if (!open) return null;

  const iconClasses = {
    primary: "bg-blue-100 text-unsaac-blue",
    success: "bg-green-100 text-unsaac-green",
    warning: "bg-yellow-100 text-unsaac-yellow",
    danger: "bg-red-100 text-unsaac-red",
  };

  const buttonVariant = {
    primary: "secondary",
    success: "success",
    warning: "warning",
    danger: "danger",
  } as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-unsaac-primary/60 p-6">
      <div className="w-full max-w-[460px] rounded-2xl border border-unsaac-border bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              iconClasses[variant]
            )}
          >
            <ModalIcon variant={variant} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-unsaac-text">
              {title}
            </h2>

            {description && (
              <p className="mt-2 text-sm font-semibold leading-6 text-unsaac-muted">
                {description}
              </p>
            )}
          </div>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-7 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>

          <Button variant={buttonVariant[variant]} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalIcon({ variant }: { variant: ModalProps["variant"] }) {
  if (variant === "success") {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "danger") {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
        <path
          d="M10.3 4 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 4a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4M12 17h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (variant === "warning") {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 7v6M12 17h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4M12 16h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}