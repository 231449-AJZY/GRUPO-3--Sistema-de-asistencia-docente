"use client";

import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export type SelectSize =
  | "sm"
  | "md"
  | "lg";

export interface SelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "size"
  > {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  placeholderDisabled?: boolean;
  leftIcon?: ReactNode;
  selectSize?: SelectSize;
  fullWidth?: boolean;
  wrapperClassName?: string;
  selectClassName?: string;
}

const SIZE_CLASSES: Record<
  SelectSize,
  string
> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-12 text-base",
};

const ICON_SIZE_CLASSES: Record<
  SelectSize,
  string
> = {
  sm: "[&>svg]:h-4 [&>svg]:w-4",
  md: "[&>svg]:h-5 [&>svg]:w-5",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
};

const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    id,
    label,
    helperText,
    error,
    placeholder,
    placeholderDisabled = true,
    leftIcon,
    selectSize = "md",
    fullWidth = true,
    wrapperClassName,
    selectClassName,
    className,
    children,
    required,
    disabled,
    multiple,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref
) {
  const generatedId = useId();

  const selectId =
    id ??
    `select-${generatedId.replace(/:/g, "")}`;

  const helperId =
    helperText && !error
      ? `${selectId}-helper`
      : undefined;

  const errorId =
    error
      ? `${selectId}-error`
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
          htmlFor={selectId}
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
              "pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center justify-center pl-3 text-slate-400",
              ICON_SIZE_CLASSES[selectSize]
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <select
          {...props}
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          multiple={multiple}
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
            "focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100/70",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70",
            !multiple && "appearance-none",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-unsaac-border",
            leftIcon
              ? "pl-10"
              : "pl-4",
            multiple
              ? "pr-4"
              : "pr-11",
            SIZE_CLASSES[selectSize],
            selectClassName,
            className
          )}
        >
          {placeholder && !multiple && (
            <option
              value=""
              disabled={placeholderDisabled}
            >
              {placeholder}
            </option>
          )}

          {children}
        </select>

        {!multiple && (
          <span
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3",
              error
                ? "text-red-500"
                : "text-slate-400"
            )}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="m7 10 5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
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

Select.displayName = "Select";

export default Select;