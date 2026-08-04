"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearSession,
  getDashboardPathByRole,
} from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

import type {
  UsuarioActivo,
  UserRole,
} from "@/types/usuario";

interface UserDropdownProps {
  user: UsuarioActivo;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: "Administrador del sistema",
  DOCENTE: "Docente",
  SUPERVISOR: "Supervisor",
};

function getInitials(nombre: string): string {
  const words = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function UserDropdown({
  user,
}: UserDropdownProps) {
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const initials = getInitials(user.nombre);
  const roleLabel = ROLE_LABELS[user.rol];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  function handleMainPanel() {
    setOpen(false);

    router.push(
      getDashboardPathByRole(user.rol)
    );
  }

  function handleLogout() {
    setOpen(false);
    clearSession();

    router.replace(ROUTES.login);
    router.refresh();
  }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-dropdown-menu"
        className="flex h-16 min-w-[64px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-2.5 text-left transition duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 xl:min-w-[235px] xl:px-4"
      >
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-unsaac-sidebar text-sm font-extrabold text-white">
          {initials}

          <span
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-unsaac-top bg-unsaac-green"
            aria-label="Usuario conectado"
          />
        </div>

        <div className="hidden min-w-0 flex-1 xl:block">
          <p className="truncate text-sm font-extrabold text-white">
            {user.nombre}
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-blue-100">
            {roleLabel}
          </p>
        </div>

        <svg
          className={`hidden h-5 w-5 shrink-0 text-white transition-transform duration-200 xl:block ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id="user-dropdown-menu"
          role="menu"
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-unsaac-primary text-sm font-extrabold text-white">
                {initials}

                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-unsaac-green" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-unsaac-text">
                  {user.nombre}
                </p>

                <p className="mt-1 truncate text-xs font-semibold text-unsaac-muted">
                  {user.correo}
                </p>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-extrabold text-unsaac-blue">
              {roleLabel}
            </div>
          </div>

          <div className="p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleMainPanel}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-unsaac-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unsaac-blue/30"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-unsaac-blue">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="4"
                    width="6"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="4"
                    width="6"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="4"
                    y="14"
                    width="6"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="14"
                    width="6"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>

              <span>
                <span className="block">
                  Panel principal
                </span>

                <span className="mt-0.5 block text-xs font-semibold text-unsaac-muted">
                  Volver al dashboard de su rol
                </span>
              </span>
            </button>

            <div className="my-2 h-px bg-slate-100" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
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
              </span>

              <span>
                <span className="block">
                  Cerrar sesión
                </span>

                <span className="mt-0.5 block text-xs font-semibold text-red-400">
                  Salir de forma segura
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
