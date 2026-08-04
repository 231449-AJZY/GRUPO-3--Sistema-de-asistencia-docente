"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export type TextareaSize =
  | "sm"
  | "md"
  | "lg";

export type TextareaResize =
  | "none"
  | "vertical"
  | "horizontal"
  | "both";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  textareaSize?: TextareaSize;
  resize?: TextareaResize;
  fullWidth?: boolean;
  showCount?: boolean;
  wrapperClassName?: string;
  textareaClassName?: string;
}

const SIZE_CLASSES: Record<
  TextareaSize,
  string
> = {
  sm: "min-h-[90px] px-3 py-2 text-xs",
  md: "min-h-[120px] px-4 py-3 text-sm",
  lg: "min-h-[150px] px-4 py-3.5 text-base",
};

const RESIZE_CLASSES: Record<
  TextareaResize,
  string
> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

function getTextLength(
  value: TextareaHTMLAttributes<HTMLTextAreaElement>["value"]
): number {
  if (value === undefined || value === null) {
    return 0;
  }

  return String(value).length;
}

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function Textarea(
  {
    id,
    label,
    helperText,
    error,
    textareaSize = "md",
    resize = "vertical",
    fullWidth = true,
    showCount = false,
    wrapperClassName,
    textareaClassName,
    className,
    required,
    disabled,
    value,
    defaultValue,
    maxLength,
    rows = 4,
    onChange,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref
) {
  const generatedId = useId();

  const textareaId =
    id ??
    `textarea-${generatedId.replace(/:/g, "")}`;

  const helperId =
    helperText && !error
      ? `${textareaId}-helper`
      : undefined;

  const errorId =
    error
      ? `${textareaId}-error`
      : undefined;

  const counterId =
    showCount
      ? `${textareaId}-counter`
      : undefined;

  const describedBy = [
    ariaDescribedBy,
    errorId,
    helperId,
    counterId,
  ]
    .filter(Boolean)
    .join(" ");

  const isControlled = value !== undefined;

  const [internalLength, setInternalLength] =
    useState(() => getTextLength(defaultValue));

  const currentLength = isControlled
    ? getTextLength(value)
    : internalLength;

  useEffect(() => {
    if (isControlled) {
      setInternalLength(getTextLength(value));
    }
  }, [isControlled, value]);

  function handleChange(
    event: ChangeEvent<HTMLTextAreaElement>
  ) {
    if (!isControlled) {
      setInternalLength(event.target.value.length);
    }

    onChange?.(event);
  }

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
          htmlFor={textareaId}
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
        <textarea
          {...props}
          ref={ref}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          onChange={handleChange}
          aria-invalid={
            error
              ? true
              : undefined
          }
          aria-describedby={
            describedBy || undefined
          }
          className={cn(
            "block w-full rounded-xl border bg-white font-semibold leading-6 text-unsaac-text outline-none transition duration-200",
            "placeholder:font-medium placeholder:text-slate-400",
            "focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100/70",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-unsaac-border",
            SIZE_CLASSES[textareaSize],
            RESIZE_CLASSES[resize],
            showCount && "pb-9",
            textareaClassName,
            className
          )}
        />

        {showCount && (
          <span
            id={counterId}
            className={cn(
              "pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
              maxLength &&
                currentLength >= maxLength
                ? "text-red-600"
                : "text-unsaac-muted"
            )}
            aria-live="polite"
          >
            {currentLength}
            {maxLength
              ? ` / ${maxLength}`
              : ""}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-start justify-between gap-4">
        {error ? (
          <p
            id={errorId}
            className="text-xs font-bold text-red-600"
          >
            {error}
          </p>
        ) : (
          helperText && (
            <p
              id={helperId}
              className="text-xs font-medium leading-5 text-unsaac-muted"
            >
              {helperText}
            </p>
          )
        )}

        {!error && !helperText && showCount && (
          <span aria-hidden="true" />
        )}
      </div>
    </div>
  );
});

Textarea.displayName = "Textarea";

export default Textarea;