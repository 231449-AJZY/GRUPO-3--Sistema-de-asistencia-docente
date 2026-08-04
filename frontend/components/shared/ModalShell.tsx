"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

export type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

const FOCUSABLE_ELEMENTS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = "",
  contentClassName = "",
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(
    null
  );

  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    previousActiveElement.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const focusableElements =
        modalRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_ELEMENTS
        );

      if (
        focusableElements &&
        focusableElements.length > 0
      ) {
        focusableElements[0].focus();
      } else {
        modalRef.current?.focus();
      }
    }, 0);

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.key === "Escape" &&
        closeOnEscape
      ) {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.clearTimeout(focusTimer);

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;

      previousActiveElement.current?.focus();
    };
  }, [
    open,
    mounted,
    closeOnEscape,
    onClose,
  ]);

  function handleBackdropMouseDown(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (
      closeOnBackdrop &&
      event.target === event.currentTarget
    ) {
      onClose();
    }
  }

  function handleModalKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements =
      modalRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_ELEMENTS
      );

    if (
      !focusableElements ||
      focusableElements.length === 0
    ) {
      event.preventDefault();
      modalRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement =
      focusableElements[
        focusableElements.length - 1
      ];

    if (
      event.shiftKey &&
      document.activeElement === firstElement
    ) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement === lastElement
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description
            ? descriptionId
            : undefined
        }
        tabIndex={-1}
        onKeyDown={handleModalKeyDown}
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.38)] outline-none ${SIZE_CLASSES[size]} ${className}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-100 px-6 py-5 sm:px-7">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-extrabold tracking-tight text-unsaac-text sm:text-2xl"
            >
              {title}
            </h2>

            {description && (
              <p
                id={descriptionId}
                className="mt-2 max-w-3xl text-sm font-medium leading-6 text-unsaac-muted"
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              title="Cerrar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unsaac-blue/30"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-7 ${contentClassName}`}
        >
          {children}
        </div>

        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-7">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}