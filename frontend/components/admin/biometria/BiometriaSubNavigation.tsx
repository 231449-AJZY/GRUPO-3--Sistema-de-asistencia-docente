"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  label: string;
  description: string;
  href: string;
  exact?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Resumen",
    description: "Estado general",
    href: "/admin/biometria",
    exact: true,
  },
  {
    label: "Captura",
    description: "Registro de huellas",
    href: "/admin/biometria/captura",
  },
  {
    label: "Dispositivos",
    description: "Lectores biométricos",
    href: "/admin/biometria/dispositivos",
  },
  {
    label: "Móviles",
    description: "Celulares vinculados",
    href: "/admin/biometria/movil",
  },
  {
    label: "Estaciones BLE",
    description: "Proximidad por aula",
    href: "/admin/biometria/estaciones-ble",
  },
  {
    label: "Sincronización",
    description: "Transferencia de registros",
    href: "/admin/biometria/sincronizacion",
  },
  {
    label: "Reportes",
    description: "Excel, CSV y PDF",
    href: "/admin/biometria/reportes",
  },
  {
    label: "Historial",
    description: "Registros reales",
    href: "/admin/biometria/historial",
  },
];

export default function BiometriaSubNavigation() {
  const pathname = usePathname();

  function isActive(item: NavigationItem) {
    if (item.exact) {
      return pathname === item.href;
    }

    return pathname.startsWith(item.href);
  }

  return (
    <nav
      aria-label="Navegación del módulo de Biometría"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-stretch p-2">
          {navigationItems.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={`group relative flex min-w-[170px] items-center gap-3 rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-unsaac-blue text-white shadow-md"
                    : "text-unsaac-muted hover:bg-blue-50 hover:text-unsaac-blue"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-unsaac-blue"
                  }`}
                >
                  <NavigationIcon
                    section={item.label}
                  />
                </span>

                <span className="min-w-0">
                  <span
                    className={`block text-sm font-extrabold ${
                      active
                        ? "text-white"
                        : "text-unsaac-text group-hover:text-unsaac-blue"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span
                    className={`mt-0.5 block text-[11px] font-semibold ${
                      active
                        ? "text-blue-100"
                        : "text-unsaac-muted"
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function NavigationIcon({
  section,
}: {
  section: string;
}) {
  if (section === "Captura") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7.5 11a4.5 4.5 0 0 1 9 0c0 4-1.3 6.5-2.7 8.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M5 12a7 7 0 0 1 14 0c0 3.7-.8 6-1.8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M10 12a2 2 0 0 1 4 0c0 3-1 5.2-2 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (section === "Dispositivos") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="5"
          y="3"
          width="14"
          height="18"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />

        <circle
          cx="12"
          cy="12"
          r="2.3"
          stroke="currentColor"
          strokeWidth="2"
        />

        <path
          d="M9 7h6M9 17h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (section === "Móviles") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="7"
          y="2.5"
          width="10"
          height="19"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10 5h4M11 18.5h2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 12.2 11.2 14l3.5-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (section === "Estaciones BLE") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 7.5 16 16M8 16.5 16 8l-4-4v16l4-4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (section === "Sincronización") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 7v5h-5M4 17v-5h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M6.2 9a7 7 0 0 1 11.3-2L20 9M4 15l2.5 2A7 7 0 0 0 18 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (section === "Historial") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 12a9 9 0 1 0 3-6.7L3 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M3 3v5h5M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
