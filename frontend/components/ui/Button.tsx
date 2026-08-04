"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "ghost";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
}

const VARIANT_CLASSES: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-unsaac-orange text-white shadow-sm hover:bg-orange-500 active:bg-orange-600 focus-visible:ring-orange-200",

  secondary:
    "bg-unsaac-blue text-white shadow-sm hover:bg-blue-600 active:bg-blue-700 focus-visible:ring-blue-200",

  success:
    "bg-unsaac-green text-white shadow-sm hover:bg-green-600 active:bg-green-700 focus-visible:ring-green-200",

  warning:
    "bg-unsaac-yellow text-white shadow-sm hover:bg-yellow-500 active:bg-yellow-600 focus-visible:ring-yellow-200",

  danger:
    "bg-unsaac-red text-white shadow-sm hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-200",

  outline:
    "border border-unsaac-border bg-white text-unsaac-text shadow-sm hover:border-slate-300 hover:bg-unsaac-content-soft focus-visible:ring-blue-200",

  ghost:
    "bg-transparent text-unsaac-muted hover:bg-unsaac-content-soft hover:text-unsaac-text focus-visible:ring-blue-200",
};

const SIZE_CLASSES: Record<
  ButtonSize,
  string
> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const ICON_SIZE_CLASSES: Record<
  ButtonSize,
  string
> = {
  sm: "[&>svg]:h-4 [&>svg]:w-4",
  md: "[&>svg]:h-5 [&>svg]:w-5",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
};

function LoadingSpinner({
  size,
}: {
  size: ButtonSize;
}) {
  return (
    <svg
      className={cn(
        "shrink-0 animate-spin",
        size === "sm"
          ? "h-4 w-4"
          : "h-5 w-5"
      )}
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

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  loadingText,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled =
    disabled ||
    loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-extrabold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? (
        <LoadingSpinner size={size} />
      ) : (
        leftIcon && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center",
              ICON_SIZE_CLASSES[size]
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )
      )}

      <span>
        {loading && loadingText
          ? loadingText
          : children}
      </span>

      {!loading && rightIcon && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center",
            ICON_SIZE_CLASSES[size]
          )}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
}