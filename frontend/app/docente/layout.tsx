"use client";

import { useEffect, useState, type ReactNode } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { getSession } from "@/lib/auth";

import type { UsuarioActivo } from "@/types/usuario";

export default function DocenteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<UsuarioActivo | null>(null);

  useEffect(() => {
    const session = getSession();

    if (session?.user?.rol === "DOCENTE") {
      setUser(session.user);
    }
  }, []);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unsaac-bg px-6">
        <section className="rounded-3xl border border-unsaac-border bg-white px-8 py-7 text-center shadow-lg">
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-unsaac-blue" />
          <p className="mt-4 text-sm font-extrabold text-unsaac-text">
            Cargando panel docente...
          </p>
        </section>
      </main>
    );
  }

  return (
    <DashboardLayout user={user}>
      {children}
    </DashboardLayout>
  );
}