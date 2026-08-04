"use client";


import Link from "next/link";
import { useCallback, useEffect, useState } from "react";


import { getToken } from "@/lib/auth";
import type { UserRole } from "@/types/usuario";


export default function AlertNotificationBell({ role }: { role: UserRole }) {
  const [count, setCount] = useState(0);
  const [urgent, setUrgent] = useState(0);


  const loadCount = useCallback(async () => {
    if (role !== "ADMINISTRADOR") return;


    const token = getToken();
    if (!token) return;


    try {
      const response = await fetch("/api/alertas/contador", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });


      if (!response.ok) return;


      const data = (await response.json()) as {
        nuevas?: number;
        urgentes?: number;
      };


      setCount(Number(data.nuevas ?? 0));
      setUrgent(Number(data.urgentes ?? 0));
    } catch {
      // El encabezado continúa funcionando aunque el contador no responda.
    }
  }, [role]);


  useEffect(() => {
    if (role !== "ADMINISTRADOR") return;


    void loadCount();
    const interval = window.setInterval(() => void loadCount(), 60000);
    const onFocus = () => void loadCount();
    window.addEventListener("focus", onFocus);


    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadCount, role]);


  if (role !== "ADMINISTRADOR") return null;


  return (
    <Link
      href="/admin/alertas"
      title={`${count} alertas nuevas`}
      aria-label={`Centro de alertas: ${count} nuevas`}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>


      {count > 0 && (
        <span
          className={`absolute -right-1.5 -top-1.5 min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white ${
            urgent > 0 ? "bg-red-500" : "bg-amber-500"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}