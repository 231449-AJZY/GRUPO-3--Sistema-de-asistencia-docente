"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_SUPERVISOR } from "@/lib/constants";

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout user={MOCK_SUPERVISOR} active="dashboard">
      {children}
    </DashboardLayout>
  );
}

