"use client";

import { useState, useRef, useEffect } from "react";
import type { UsuarioActivo } from "@/types/usuario";

interface UserDropdownProps {
  user: UsuarioActivo;
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.nombre
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentRole = (user.rol || "ADMINISTRADOR").toUpperCase();

  const roleDisplayLabel =
    currentRole === "ADMINISTRADOR"
      ? "Administrador general"
      : currentRole === "DOCENTE"
      ? "Docente universitario"
      : "Supervisor de control";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 min-w-[250px] items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 px-3.5 text-left transition hover:bg-white/15 focus:outline-none"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-unsaac-sidebar text-xs font-black text-white shadow-sm">
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-unsaac-top bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black leading-tight text-white">
            {user.nombre}
          </p>
          <p className="truncate text-xs font-semibold text-blue-100/80 mt-0.5">
            {roleDisplayLabel}
          </p>
        </div>

        <svg
          className={`h-4 w-4 text-white/80 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Opened Dropdown Container */}
      {open && (
        <div className="absolute right-0 top-[68px] z-50 w-[280px] rounded-[24px] border border-[#e2e8f0] bg-white shadow-xl overflow-visible animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Top Caret */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t border-[#e2e8f0] bg-[#f8fafc] z-[-1]" />

          <div className="flex flex-col p-2">
            {/* Header User Summary */}
            <div className="bg-[#f8fafc] rounded-[20px] p-4 flex items-center gap-3 mb-2">
              <div className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#0f2e4a] text-sm font-bold text-white">
                {initials}
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-[#f8fafc] bg-[#16a34a]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-[#1e293b] leading-tight">
                  {user.nombre}
                </p>
                <p className="truncate text-xs font-semibold text-[#64748b] mt-0.5">
                  {roleDisplayLabel}
                </p>
                <p className="truncate text-xs font-semibold text-[#64748b] mt-0.5">
                  {user.correo}
                </p>
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex flex-col gap-1 px-1">
              <button className="group flex h-10 w-full items-center gap-3 rounded-xl bg-[#f1f5f9] px-3 text-sm font-bold text-[#0f2e4a] transition hover:bg-[#e2e8f0]">
                <DropdownIcon name="user" className="h-5 w-5 text-[#3b82f6]" />
                Mi perfil
              </button>
              
              <button className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#1e293b] transition hover:bg-[#f1f5f9]">
                <DropdownIcon name="sun" className="h-5 w-5 text-[#475569]" />
                Configuración de cuenta
              </button>

              <button className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#1e293b] transition hover:bg-[#f1f5f9]">
                <DropdownIcon name="lock" className="h-5 w-5 text-[#475569]" />
                Cambiar contraseña
              </button>

              <button className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#1e293b] transition hover:bg-[#f1f5f9]">
                <DropdownIcon name="sliders" className="h-5 w-5 text-[#475569]" />
                Preferencias
              </button>

              <button className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#1e293b] transition hover:bg-[#f1f5f9]">
                <DropdownIcon name="help-circle" className="h-5 w-5 text-[#475569]" />
                Ayuda / Soporte
              </button>
            </div>

            <div className="my-2 border-t border-[#e2e8f0] mx-1" />

            {/* Logout Action */}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("unsaac_token");
                sessionStorage.removeItem("unsaac_token");
                localStorage.removeItem("user");
                sessionStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="flex h-11 w-full items-center gap-3 rounded-[14px] bg-[#fef2f2] px-4 text-[13px] font-bold text-[#dc2626] transition hover:bg-[#fee2e2] mx-1"
              style={{ width: "calc(100% - 8px)" }}
            >
              <DropdownIcon name="logout" className="h-[18px] w-[18px] text-[#dc2626]" />
              Cerrar sesión
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function DropdownIcon({ name, className }: { name: string; className?: string }) {
  if (name === "user") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "sun") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  if (name === "sliders") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    );
  }

  if (name === "help-circle") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }

  return null;
}