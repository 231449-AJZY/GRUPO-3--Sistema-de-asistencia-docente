"use client";


import { useState, useEffect } from "react";
import Image from "next/image";
import type { UsuarioActivo } from "@/types/usuario";
import UserDropdown from "./UserDropdown";

interface HeaderProps {
  user: UsuarioActivo;
}

export default function Header({ user }: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="fixed left-0 top-0 z-40 flex h-[108px] w-full items-center bg-gradient-to-r from-unsaac-primary to-unsaac-top px-7 text-white">
      <div className="flex items-center gap-4">
        <Image
          src="/logo-unsaac.png"
          alt="UNSAAC - Universidad Nacional de San Antonio Abad del Cusco"
          width={191}
          height={68}
          priority
        />
      </div>

      <div className="ml-10 h-14 w-[3px] rounded-full bg-unsaac-orange" />

      <div className="ml-8">
        <h1 className="text-[30px] font-extrabold">
          Control de Asistencia Docente
        </h1>
        <p className="mt-1 text-sm font-semibold text-blue-100">
          Sistema de Control de Asistencia Biométrica - UNSAAC
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-bold text-blue-100 xl:block">
          Sistema biométrico
        </div>

        <div className="hidden text-right lg:block">
          <p className="text-xs font-bold text-blue-100">FECHA</p>
          <p className="text-sm font-bold min-w-[85px]">
            {now ? now.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "---"}
          </p>
        </div>

        <div className="hidden text-right lg:block">
          <p className="text-xs font-bold text-blue-100">HORA</p>
          <p className="text-sm font-bold min-w-[70px]">
            {now ? now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}
          </p>
        </div>

        <UserDropdown user={user} />
      </div>
    </header>
  );
}