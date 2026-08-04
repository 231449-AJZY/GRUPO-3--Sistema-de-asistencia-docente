"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/admin/horarios",
    label: "Horarios",
    description: "Programación semanal",
  },
  {
    href: "/admin/horarios/cursos",
    label: "Cursos",
    description: "Catálogo académico",
  },
  {
    href: "/admin/horarios/semestres",
    label: "Semestres",
    description: "Periodos institucionales",
  },
  {
    href: "/admin/horarios/departamentos",
    label: "Departamentos",
    description: "Unidades académicas",
  },
] as const;

export default function AcademicSubNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Gestión académica"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const active =
            item.href === "/admin/horarios"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-3 transition ${
                active
                  ? "bg-unsaac-blue text-white shadow-sm"
                  : "text-unsaac-text hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-extrabold">
                {item.label}
              </span>
              <span
                className={`mt-1 block text-xs font-semibold ${
                  active ? "text-blue-100" : "text-unsaac-muted"
                }`}
              >
                {item.description}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
