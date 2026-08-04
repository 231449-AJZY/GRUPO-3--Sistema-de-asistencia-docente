"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type CheckboxSize =
  | "sm"
  | "md"
  | "lg";

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size"
  > {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  checkboxSize?: CheckboxSize;
  indeterminate?: boolean;
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const BOX_SIZE_CLASSES: Record<
  CheckboxSize,
  string
> = {
  sm: "h-4 w-4 rounded",
  md: "h-5 w-5 rounded-md",
  lg: "h-6 w-6 rounded-md",
};

const ICON_SIZE_CLASSES: Record<
  CheckboxSize,
  string
> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

const LABEL_SIZE_CLASSES: Record<
  CheckboxSize,
  string
> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function assignRef<T>(
  ref: React.ForwardedRef<T>,
  value: T
) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

const Checkbox = forwardRef<
  HTMLInputElement,
  CheckboxProps
>(function Checkbox(
  {
    id,
    label,
    description,
    error,
    checkboxSize = "md",
    indeterminate = false,
    wrapperClassName,
    labelClassName,
    inputClassName,
    className,
    required,
    disabled,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  forwardedRef
) {
  const generatedId = useId();
  const internalRef = useRef<HTMLInputElement | null>(
    null
  );

  const checkboxId =
    id ??
    `checkbox-${generatedId.replace(/:/g, "")}`;

  const descriptionId =
    description && !error
      ? `${checkboxId}-description`
      : undefined;

  const errorId =
    error
      ? `${checkboxId}-error`
      : undefined;

  const describedBy = [
    ariaDescribedBy,
    errorId,
    descriptionId,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate =
        indeterminate;
    }
  }, [indeterminate]);

  return (
    <div
      className={cn(
        "flex flex-col",
        wrapperClassName
      )}
    >
      <label
        htmlFor={checkboxId}
        className={cn(
          "group flex items-start gap-3",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
          labelClassName
        )}
      >
        <span className="relative mt-0.5 shrink-0">
          <input
            {...props}
            ref={(element) => {
              internalRef.current = element;
              assignRef(forwardedRef, element);
            }}
            id={checkboxId}
            type="checkbox"
            required={required}
            disabled={disabled}
            aria-invalid={
              error
                ? true
                : undefined
            }
            aria-checked={
              indeterminate
                ? "mixed"
                : undefined
            }
            aria-describedby={
              describedBy || undefined
            }
            className={cn(
              "peer absolute h-px w-px overflow-hidden opacity-0",
              inputClassName,
              className
            )}
          />

          <span
            className={cn(
              "flex items-center justify-center border bg-white text-white transition duration-200",
              "border-unsaac-border",
              "peer-checked:border-unsaac-blue peer-checked:bg-unsaac-blue",
              "peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100",
              "peer-disabled:bg-slate-100",
              Boolean(error)
                ? "border-red-400 peer-focus-visible:ring-red-100"
                : undefined,
              indeterminate &&
                "border-unsaac-blue bg-unsaac-blue",
              BOX_SIZE_CLASSES[checkboxSize]
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              <svg
                className={ICON_SIZE_CLASSES[checkboxSize]}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M6 12h12"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className={cn(
                  "opacity-0 transition-opacity peer-checked:opacity-100",
                  ICON_SIZE_CLASSES[checkboxSize]
                )}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="m5 12 4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </span>

        {(label || description) && (
          <span className="min-w-0">
            {label && (
              <span
                className={cn(
                  "block font-extrabold leading-5 text-unsaac-text",
                  LABEL_SIZE_CLASSES[checkboxSize]
                )}
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
              </span>
            )}

            {description && !error && (
              <span
                id={descriptionId}
                className="mt-1 block text-xs font-medium leading-5 text-unsaac-muted"
              >
                {description}
              </span>
            )}
          </span>
        )}
      </label>

      {error && (
        <p
          id={errorId}
          className="ml-8 mt-2 text-xs font-bold text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;