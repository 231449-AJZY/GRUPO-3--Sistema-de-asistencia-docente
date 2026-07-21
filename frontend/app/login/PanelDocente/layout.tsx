"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_DOCENTE } from "@/lib/constants";

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout user={MOCK_DOCENTE} active="dashboard">
      {children}
    </DashboardLayout>
  );
}

