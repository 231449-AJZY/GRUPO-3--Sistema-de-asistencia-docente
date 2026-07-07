"use client";

import type { ReactNode } from "react";
import type { UsuarioActivo } from "@/types/usuario";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  user: UsuarioActivo;
  active?: string;
  children: ReactNode;
}

export default function DashboardLayout({
  user,
  active = "dashboard",
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-unsaac-bg">
      <Header user={user} />
      <Sidebar role={user.rol} active={active} />

      <main className="ml-[300px] pt-[108px]">
        <section className="min-h-[calc(100vh-108px)] bg-gradient-to-b from-unsaac-content to-unsaac-content-soft p-8">
          {children}
        </section>
      </main>
    </div>
  );
}