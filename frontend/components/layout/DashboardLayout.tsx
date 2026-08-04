"use client";

import type { ReactNode } from "react";
import type { UsuarioActivo } from "@/types/usuario";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  user: UsuarioActivo;

  /**
   * Compatibilidad con paginas integradas.
   * El Sidebar determina la ruta activa automaticamente.
   */
  active?: string;

  children: ReactNode;
}

export default function DashboardLayout({
  user,
  children,
}: DashboardLayoutProps) {
  const isTeacher =
    user.rol === "DOCENTE";

  return (
    <div
      data-role={user.rol}
      className={`dashboard-shell min-h-screen bg-unsaac-bg ${
        isTeacher
          ? "docente-module-scope"
          : ""
      }`}
    >
      <a
        href="#dashboard-main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-unsaac-primary shadow-xl transition focus:translate-y-0"
      >
        Saltar al contenido principal
      </a>

      <Header user={user} />
      <Sidebar role={user.rol} />

      <main
        id="dashboard-main-content"
        tabIndex={-1}
        className={
          isTeacher
            ? "ml-0 pt-[88px] md:ml-[92px] md:pt-[96px] xl:ml-[300px] xl:pt-[108px]"
            : "ml-[300px] pt-[108px]"
        }
      >
        <section
          className={
            isTeacher
              ? "docente-module-content min-h-[calc(100vh-88px)] bg-gradient-to-b from-unsaac-content to-unsaac-content-soft p-4 pb-28 sm:p-5 sm:pb-28 md:min-h-[calc(100vh-96px)] md:p-6 md:pb-6 xl:min-h-[calc(100vh-108px)] xl:p-8"
              : "min-h-[calc(100vh-108px)] bg-gradient-to-b from-unsaac-content to-unsaac-content-soft p-8"
          }
        >
          {children}
        </section>
      </main>
    </div>
  );
}
