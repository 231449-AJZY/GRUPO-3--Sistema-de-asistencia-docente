"use client";

import type {
  ReactNode,
} from "react";

export const settingsFieldClass = [
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4",
  "text-sm font-semibold text-unsaac-text outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100",
  "disabled:cursor-not-allowed disabled:bg-slate-100",
].join(" ");

export function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-extrabold text-unsaac-text">
        {label}
      </span>

      {description && (
        <span className="mt-1 block text-xs font-semibold leading-5 text-unsaac-muted">
          {description}
        </span>
      )}

      <span className="mt-2 block">
        {children}
      </span>
    </label>
  );
}

export function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
      <span className="min-w-0">
        <span className="block font-extrabold text-unsaac-text">
          {label}
        </span>

        <span className="mt-1 block text-sm font-semibold leading-6 text-unsaac-muted">
          {description}
        </span>
      </span>

      <span className="relative mt-1 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          className="peer sr-only"
        />

        <span className="block h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-unsaac-blue peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />

        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function SettingsCallout({
  title,
  description,
  tone = "blue",
}: {
  title: string;
  description: string;
  tone?: "blue" | "orange" | "red";
}) {
  const styles = {
    blue:
      "border-blue-100 bg-blue-50 text-unsaac-blue",
    orange:
      "border-orange-200 bg-orange-50 text-orange-800",
    red:
      "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${styles[tone]}`}
    >
      <p className="font-extrabold">
        {title}
      </p>

      <p className="mt-1 text-sm font-semibold leading-6 text-unsaac-muted">
        {description}
      </p>
    </div>
  );
}