"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type InputSize =
  | "sm"
  | "md"
  | "lg";

export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size"
  > {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: InputSize;
  fullWidth?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
}

const SIZE_CLASSES: Record<
  InputSize,
  string
> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

const ICON_SIZE_CLASSES: Record<
  InputSize,
  string
> = {
  sm: "[&>svg]:h-4 [&>svg]:w-4",
  md: "[&>svg]:h-5 [&>svg]:w-5",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
};

const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(function Input(
  {
    id,
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    inputSize = "md",
    fullWidth = true,
    wrapperClassName,
    inputClassName,
    className,
    required,
    disabled,
    type = "text",
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref
) {
  const generatedId = useId();

  const inputId =
    id ??
    `input-${generatedId.replace(/:/g, "")}`;

  const helperId =
    helperText && !error
      ? `${inputId}-helper`
      : undefined;

  const errorId =
    error
      ? `${inputId}-error`
      : undefined;

  const describedBy = [
    ariaDescribedBy,
    errorId,
    helperId,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn(
        "flex flex-col",
        fullWidth ? "w-full" : "w-fit",
        wrapperClassName
      )}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 text-sm font-extrabold text-unsaac-text"
        >
          {label}

          {required && (
            <span
              className="ml-1 text-red-500"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-slate-400",
              ICON_SIZE_CLASSES[inputSize]
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          {...props}
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={
            error
              ? true
              : undefined
          }
          aria-describedby={
            describedBy || undefined
          }
          className={cn(
            "w-full rounded-xl border bg-white font-semibold text-unsaac-text outline-none transition duration-200",
            "placeholder:font-medium placeholder:text-slate-400",
            "focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100/70",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70",
            error
              ? "border-red-400 pr-11 focus:border-red-500 focus:ring-red-100"
              : "border-unsaac-border",
            leftIcon
              ? "pl-10"
              : "pl-4",
            rightIcon || error
              ? "pr-10"
              : "pr-4",
            SIZE_CLASSES[inputSize],
            inputClassName,
            className
          )}
        />

        {error ? (
          <span
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-red-500"
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="M12 8v5M12 16.5v.1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : (
          rightIcon && (
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-slate-400",
                ICON_SIZE_CLASSES[inputSize]
              )}
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-2 text-xs font-bold text-red-600"
        >
          {error}
        </p>
      ) : (
        helperText && (
          <p
            id={helperId}
            className="mt-2 text-xs font-medium leading-5 text-unsaac-muted"
          >
            {helperText}
          </p>
        )
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;