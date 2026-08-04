"use client";

import type { ConfigurationSection } from "@/types/configuration";

interface Props {
  activeSection: ConfigurationSection;
  onChange: (section: ConfigurationSection) => void;
}

const sections: Array<{
  id: ConfigurationSection;
  label: string;
  description: string;
}> = [
  {
    id: "general",
    label: "General",
    description: "Institución y periodo activo",
  },
  {
    id: "asistencia",
    label: "Asistencia",
    description: "Horario, tolerancias y días",
  },
];

export default function ConfigurationNavigation({ activeSection, onChange }: Props) {
  return (
    <nav
      aria-label="Secciones de configuración institucional"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sections.map((section) => {
          const active = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={`rounded-xl px-4 py-3 text-left transition ${
                active
                  ? "bg-unsaac-blue text-white shadow-sm"
                  : "text-unsaac-text hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-extrabold">{section.label}</span>
              <span className={`mt-1 block text-xs font-semibold ${active ? "text-blue-100" : "text-unsaac-muted"}`}>
                {section.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
