"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import type {
  CategoriaDocente,
  Docente,
  DocenteFormData,
  EstadoBiometrico,
  EstadoDocente,
} from "@/types/docente";

interface DocenteFormModalProps {
  open: boolean;
  mode: "create" | "edit" | "view";
  docente: Docente | null;
  onClose: () => void;
  onSubmit: (data: DocenteFormData) => void;
}

const DEFAULT_FORM: DocenteFormData = {
  dni: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  departamento: "Ingeniería Informática y de Sistemas",
  categoria: "Contratado",
  estadoBiometrico: "Pendiente",
  estado: "Activo",
};

function getToken() {
  return localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token") || "";
}

export default function DocenteFormModal({
  open, mode, docente, onClose, onSubmit,
}: DocenteFormModalProps) {
  const [form, setForm]                   = useState<DocenteFormData>(DEFAULT_FORM);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const readonly = mode === "view";

  // Cargar departamentos desde la BD
  useEffect(() => {
    fetch("/api/docentes/departamentos", {
      headers: { "Authorization": `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => setDepartamentos(d.departamentos.map((dep: any) => dep.nombre)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (docente) {
      setForm({
        dni:              docente.dni,
        nombres:          docente.nombres,
        apellidos:        docente.apellidos,
        correo:           docente.correo,
        telefono:         docente.telefono,
        departamento:     docente.departamento,
        categoria:        docente.categoria,
        estadoBiometrico: docente.estadoBiometrico,
        estado:           docente.estado,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, docente]);

  if (!open) return null;

  function update<K extends keyof DocenteFormData>(key: K, value: DocenteFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readonly) return;
    onSubmit(form);
  }

  const title =
    mode === "create" ? "Registrar nuevo docente" :
    mode === "edit"   ? "Editar docente" :
                        "Detalle del docente";

  const description =
    mode === "create" ? "Complete los datos institucionales del nuevo docente." :
    mode === "edit"   ? "Actualice la información registrada del docente." :
                        "Consulta de información institucional del docente.";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-unsaac-primary/60 p-6">
      <div className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-3xl border border-unsaac-border bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-5">
          <div>
            <h2 className="text-2xl font-extrabold text-unsaac-text">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-unsaac-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-unsaac-border text-unsaac-muted transition hover:bg-unsaac-content-soft hover:text-unsaac-red">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nombres"   value={form.nombres}   placeholder="Ingrese nombres"   disabled={readonly} onChange={(v) => update("nombres", v)} />
            <FormField label="Apellidos" value={form.apellidos} placeholder="Ingrese apellidos" disabled={readonly} onChange={(v) => update("apellidos", v)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="DNI"      value={form.dni}      placeholder="00000000"   disabled={readonly} onChange={(v) => update("dni", v)} />
            <FormField label="Teléfono" value={form.telefono} placeholder="999999999" disabled={readonly} onChange={(v) => update("telefono", v)} />
          </div>

          <FormField label="Correo institucional" value={form.correo} placeholder="correo@unsaac.edu.pe" disabled={readonly} onChange={(v) => update("correo", v)} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                Departamento académico
              </label>
              <select value={form.departamento} disabled={readonly}
                onChange={(e) => update("departamento", e.target.value)}
                className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition disabled:opacity-70 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100">
                {departamentos.length === 0 ? (
                  <option>Cargando departamentos...</option>
                ) : (
                  departamentos.map((dep) => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                Categoría docente
              </label>
              <select value={form.categoria} disabled={readonly}
                onChange={(e) => update("categoria", e.target.value as CategoriaDocente)}
                className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition disabled:opacity-70 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100">
                <option>Principal</option>
                <option>Asociado</option>
                <option>Auxiliar</option>
                <option>Contratado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                Estado biométrico
              </label>
              <select value={form.estadoBiometrico} disabled={readonly}
                onChange={(e) => update("estadoBiometrico", e.target.value as EstadoBiometrico)}
                className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition disabled:opacity-70 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100">
                <option>Registrado</option>
                <option>Pendiente</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                Estado del docente
              </label>
              <select value={form.estado} disabled={readonly}
                onChange={(e) => update("estado", e.target.value as EstadoDocente)}
                className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition disabled:opacity-70 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100">
                <option>Activo</option>
                <option>En pausa</option>
                <option>Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {readonly ? "Cerrar" : "Cancelar"}
            </Button>
            {!readonly && (
              <Button variant="primary" type="submit">
                {mode === "edit" ? "Guardar cambios" : "Registrar docente"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, value, placeholder, disabled, onChange }: {
  label: string; value: string; placeholder: string; disabled?: boolean; onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-extrabold text-unsaac-text">{label}</label>
      <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition placeholder:text-unsaac-muted disabled:opacity-70 focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
        placeholder={placeholder} />
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
