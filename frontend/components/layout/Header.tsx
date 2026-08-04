"use client";

import type { UsuarioActivo } from "@/types/usuario";
import HeaderBrand from "./HeaderBrand";
import LiveDateTime from "./LiveDateTime";
import SystemBadge from "./SystemBadge";
import UserDropdown from "./UserDropdown";

interface HeaderProps {
  user: UsuarioActivo;
}

export default function Header({
  user,
}: HeaderProps) {
  const isTeacher =
    user.rol === "DOCENTE";

  return (
    <header
      className={
        isTeacher
          ? "fixed left-0 top-0 z-40 flex h-[88px] w-full items-center border-b border-white/10 bg-gradient-to-r from-unsaac-primary to-unsaac-top px-4 text-white sm:px-5 md:h-[96px] md:px-6 xl:h-[108px] xl:px-7"
          : "fixed left-0 top-0 z-40 flex h-[108px] w-full items-center border-b border-white/10 bg-gradient-to-r from-unsaac-primary to-unsaac-top px-7 text-white"
      }
    >
      <HeaderBrand
        compact={isTeacher}
      />

      <div
        className={
          isTeacher
            ? "ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 xl:gap-5"
            : "ml-auto flex shrink-0 items-center gap-5"
        }
      >
        <div className="hidden 2xl:block">
          <SystemBadge status="connected" />
        </div>

        <div
          className={
            isTeacher
              ? "hidden xl:block"
              : ""
          }
        >
          <LiveDateTime />
        </div>

        <UserDropdown user={user} />
      </div>
    </header>
  );
}
