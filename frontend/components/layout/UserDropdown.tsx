"use client";

import { useState } from "react";
import type { UsuarioActivo } from "@/types/usuario";

interface UserDropdownProps {
  user: UsuarioActivo;
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);

  const initials = user.nombre
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    user.rol === "ADMINISTRADOR"
      ? "Administrador general"
      : user.rol === "DOCENTE"
      ? "Docente"
      : "Supervisor";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 min-w-[270px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 text-left transition hover:bg-white/15"
      >
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-unsaac-sidebar text-sm font-extrabold text-white">
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-unsaac-top bg-unsaac-green" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-white">
            {user.nombre}
          </p>
          <p className="truncate text-xs font-semibold text-blue-100">
            {roleLabel}
          </p>
        </div>

        <svg
          className={`h-5 w-5 text-white transition ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[74px] z-50 w-[340px] rounded-2xl border border-unsaac-border bg-white shadow-2xl">
          <div className="absolute right-10 -top-3 h-6 w-6 rotate-45 border-l border-t border-unsaac-border bg-white" />

          <div className="rounded-t-2xl bg-unsaac-content px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-unsaac-sidebar text-base font-extrabold text-white">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-unsaac-green" />
              </div>

              <div>
                <p className="text-[15px] font-extrabold text-unsaac-text">
                  {user.nombre}
                </p>
                <p className="text-xs font-semibold text-unsaac-muted">
                  {roleLabel}
                </p>
                <p className="text-xs font-semibold text-unsaac-muted">
                  {user.correo}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <DropdownItem icon="user" label="Mi perfil" active />
            <DropdownItem icon="settings" label="Configuración de cuenta" />
            <DropdownItem icon="lock" label="Cambiar contraseña" />
            <DropdownItem icon="sliders" label="Preferencias" />
            <DropdownItem icon="help" label="Ayuda / Soporte" />

            <div className="my-2 border-t border-unsaac-border" />

            <button className="flex h-11 w-full items-center gap-3 rounded-xl bg-red-50 px-4 text-sm font-extrabold text-unsaac-red transition hover:bg-red-100">
              <Icon name="logout" className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  active = false,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
        active
          ? "bg-unsaac-content-soft text-unsaac-text"
          : "text-unsaac-text hover:bg-unsaac-content-soft"
      }`}
    >
      <Icon
        name={icon}
        className={`h-5 w-5 ${active ? "text-unsaac-blue" : "text-unsaac-muted"}`}
      />
      {label}
    </button>
  );
}

type IconName = "user" | "settings" | "lock" | "sliders" | "help" | "logout";

function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  if (name === "user") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4 21v-1a8 8 0 0 1 16 0v1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8 10V7a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "sliders") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M4 17h16" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="15" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "help") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M9.5 9a3 3 0 1 1 4.8 2.4c-1.2.8-2.3 1.6-2.3 3.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="18" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 16l4-4-4-4M21 12H10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}