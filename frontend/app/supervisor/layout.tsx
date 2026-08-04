"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  clearSession,
  getSession,
} from "@/lib/auth";

import type {
  UsuarioActivo,
} from "@/types/usuario";

export default function SupervisorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] =
    useState<UsuarioActivo | null>(
      null
    );

  useEffect(() => {
    const session =
      getSession();

    if (
      session?.user?.rol ===
      "SUPERVISOR"
    ) {
      setUser(session.user);
      return;
    }

    clearSession();
    router.replace("/login");
  }, [router]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-unsaac-bg px-6">
        <section className="rounded-3xl border border-unsaac-border bg-white px-8 py-7 text-center shadow-lg">
          <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-unsaac-blue" />

          <p className="mt-4 text-sm font-extrabold text-unsaac-text">
            Cargando panel del supervisor...
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
