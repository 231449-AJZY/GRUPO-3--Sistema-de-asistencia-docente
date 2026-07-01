"use client";


import type { UsuarioActivo } from "@/types/usuario";
import UserDropdown from "./UserDropdown";

interface HeaderProps {
  user: UsuarioActivo;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="fixed left-0 top-0 z-40 flex h-[108px] w-full items-center bg-gradient-to-r from-unsaac-primary to-unsaac-top px-7 text-white">
      <div className="flex items-center gap-4">
        <div className="flex h-[62px] w-[62px] items-center justify-center rounded-2xl border border-white/15 bg-white/10">
          <span className="text-xl font-extrabold">U</span>
        </div>

        <div>
          <h2 className="text-[28px] font-extrabold leading-7">UNSAAC</h2>
          <p className="text-sm font-bold tracking-[0.2em] text-blue-100">
            CUSCO
          </p>
        </div>
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
          <p className="text-sm font-bold">23/06/2026</p>
        </div>

        <div className="hidden text-right lg:block">
          <p className="text-xs font-bold text-blue-100">HORA</p>
          <p className="text-sm font-bold">12:18 p.m.</p>
        </div>

        <UserDropdown user={user} />
      </div>
    </header>
  );
}