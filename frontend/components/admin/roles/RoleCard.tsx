"use client";

import type {
  ReactNode,
} from "react";

import StatusBadge from "@/components/shared/StatusBadge";

import type {
  SystemRole,
} from "@/types/rol";

interface RoleCardProps {
  role: SystemRole;
  selected: boolean;
  onSelect: (
    roleId: SystemRole["id"]
  ) => void;
}

export default function RoleCard({
  role,
  selected,
  onSelect,
}: RoleCardProps) {
  const styles = {
    blue: {
      icon: "bg-blue-100 text-unsaac-blue",
      value: "text-unsaac-blue",
      line: "bg-unsaac-blue",
      selected:
        "border-unsaac-blue ring-4 ring-blue-100",
    },
    green: {
      icon:
        "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
      line: "bg-emerald-500",
      selected:
        "border-emerald-500 ring-4 ring-emerald-100",
    },
    orange: {
      icon:
        "bg-orange-100 text-orange-700",
      value: "text-orange-700",
      line: "bg-orange-500",
      selected:
        "border-orange-500 ring-4 ring-orange-100",
    },
  };

  const current = styles[role.tone];

  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
        selected
          ? current.selected
          : "border-slate-200"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${current.icon}`}
          >
            <RoleIcon />
          </span>

          <StatusBadge
            status="activo"
            label="Rol activo"
            showDot
          />
        </div>

        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.1em] text-unsaac-muted">
          {role.code}
        </p>

        <h2 className="mt-2 text-xl font-extrabold text-unsaac-text">
          {role.name}
        </h2>

        <p className="mt-2 min-h-[72px] text-sm font-semibold leading-6 text-unsaac-muted">
          {role.description}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
          <RoleMetric
            label="Usuarios"
            value={role.userCount}
            valueClass={current.value}
          />

          <RoleMetric
            label="Activos"
            value={role.activeUserCount}
            valueClass={current.value}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p
            className={`text-sm font-extrabold ${current.value}`}
          >
            {role.permissionIds.length} permisos
          </p>

          <span className="text-xs font-extrabold text-unsaac-blue">
            {selected
              ? "Seleccionado"
              : "Ver detalle"}
          </span>
        </div>
      </div>

      <div className={`h-1 ${current.line}`} />
    </button>
  );
}

function RoleMetric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-unsaac-muted">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-extrabold tabular-nums ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function RoleIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}