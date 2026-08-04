"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, []);

  // Determine active route for sidebar
  let activeTab = "dashboard";
  if (pathname?.includes("/horarios")) {
    activeTab = "mis_horarios";
  } else if (pathname?.includes("/calendario")) {
    activeTab = "calendario";
  } else if (pathname?.includes("/tardanzas")) {
    activeTab = "tardanzas";
  } else if (pathname?.includes("/asistencia")) {
    activeTab = "mi_asistencia";
  }

  const displayUser = user || {
    id: 2,
    nombre: "Docente Universitario",
    correo: "docente@unsaac.edu.pe",
    rol: "DOCENTE",
  };

  return (
    <DashboardLayout user={displayUser} active={activeTab}>
      {children}
    </DashboardLayout>
  );
}
