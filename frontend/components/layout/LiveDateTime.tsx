"use client";

import { useEffect, useState } from "react";

export default function LiveDateTime() {
  const [fechaHora, setFechaHora] = useState<Date | null>(null);

  useEffect(() => {
    const actualizarFechaHora = () => {
      setFechaHora(new Date());
    };

    actualizarFechaHora();

    const intervalo = window.setInterval(actualizarFechaHora, 1000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  const fecha = fechaHora
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Lima",
      }).format(fechaHora)
    : "--/--/----";

  const horaOriginal = fechaHora
    ? new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "America/Lima",
      }).format(fechaHora)
    : "--:--:-- --";

  const hora = horaOriginal
    .replace("a. m.", "a.m.")
    .replace("p. m.", "p.m.");

  return (
    <div className="flex items-center gap-8">
      <div className="hidden min-w-[110px] text-left lg:block">
        <p className="text-sm font-bold tracking-wide text-blue-100">
          FECHA
        </p>

        <p className="mt-1 text-base font-bold text-white tabular-nums">
          {fecha}
        </p>
      </div>

      <div className="hidden min-w-[135px] text-left lg:block">
        <p className="text-sm font-bold tracking-wide text-blue-100">
          HORA
        </p>

        <p className="mt-1 text-base font-bold text-white tabular-nums">
          {hora}
        </p>
      </div>
    </div>
  );
}