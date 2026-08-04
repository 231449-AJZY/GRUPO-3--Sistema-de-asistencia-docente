"use client";

import {
  useState,
  type ReactNode,
} from "react";

export type ErrorStateVariant =
  | "error"
  | "warning"
  | "info";

export type ErrorStateSize =
  | "sm"
  | "md"
  | "lg";

interface ErrorStateProps {
  title?: string;
  description?: string;
  variant?: ErrorStateVariant;
  size?: ErrorStateSize;
  icon?: ReactNode;
  onRetry?: () => void | Promise<void>;
  retryText?: string;
  secondaryAction?: ReactNode;
  fullHeight?: boolean;
  className?: string;
}

const VARIANT_CONFIG: Record<
  ErrorStateVariant,
  {
    iconContainer: string;
    iconColor: string;
    button: string;
  }
> = {
  error: {
    iconContainer:
      "border-red-200 bg-red-50",
    iconColor:
      "text-red-600",
    button:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200",
  },

  warning: {
    iconContainer:
      "border-amber-200 bg-amber-50",
    iconColor:
      "text-amber-600",
    button:
      "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-200",
  },

  info: {
    iconContainer:
      "border-blue-200 bg-blue-50",
    iconColor:
      "text-unsaac-blue",
    button:
      "bg-unsaac-blue text-white hover:brightness-90 focus-visible:ring-blue-200",
  },
};

const SIZE_CONFIG: Record<
  ErrorStateSize,
  {
    container: string;
    icon: string;
    title: string;
    description: string;
  }
> = {
  sm: {
    container: "px-5 py-7",
    icon: "h-12 w-12",
    title: "text-base",
    description: "text-sm",
  },

  md: {
    container: "px-6 py-12",
    icon: "h-16 w-16",
    title: "text-lg",
    description: "text-sm",
  },

  lg: {
    container: "px-8 py-16",
    icon: "h-20 w-20",
    title: "text-xl",
    description: "text-base",
  },
};

function DefaultErrorIcon({
  variant,
}: {
  variant: ErrorStateVariant;
}) {
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

  if (variant === "info") {
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
        d="M9 9l6 6M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RetrySpinner() {
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
      />
    </svg>
  );
}

export default function ErrorState({
  title = "No se pudo completar la operación",
  description = "Ocurrió un problema inesperado. Verifique la conexión e intente nuevamente.",
  variant = "error",
  size = "md",
  icon,
  onRetry,
  retryText = "Intentar nuevamente",
  secondaryAction,
  fullHeight = false,
  className = "",
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  const variantStyles =
    VARIANT_CONFIG[variant];

  const sizeStyles =
    SIZE_CONFIG[size];

  async function handleRetry() {
    if (!onRetry || retrying) {
      return;
    }

    try {
      setRetrying(true);
      await onRetry();
    } catch (error) {
      console.error(
        "Error durante el reintento:",
        error
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center text-center ${
        fullHeight
          ? "min-h-[calc(100vh-172px)]"
          : sizeStyles.container
      } ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-3xl border ${sizeStyles.icon} ${variantStyles.iconContainer} ${variantStyles.iconColor}`}
      >
        {icon ?? (
          <DefaultErrorIcon variant={variant} />
        )}
      </div>

      <h3
        className={`mt-5 font-extrabold tracking-tight text-unsaac-text ${sizeStyles.title}`}
      >
        {title}
      </h3>

      {description && (
        <p
          className={`mt-2 max-w-md font-medium leading-6 text-unsaac-muted ${sizeStyles.description}`}
        >
          {description}
        </p>
      )}

      {(onRetry || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryAction}

          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles.button}`}
            >
              {retrying && <RetrySpinner />}

              <span>
                {retrying
                  ? "Reintentando..."
                  : retryText}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}