"use client";

import { useMemo, useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocenteFormModal from "@/components/admin/docentes/DocenteFormModal";
import DocentesTable from "@/components/admin/docentes/DocentesTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import { MOCK_ADMIN } from "@/lib/constants";
import type { Docente, DocenteFormData, EstadoDocente } from "@/types/docente";

type ModalMode = "create" | "edit" | "view";

export default function AdminDocentesPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departamentoFilter, setDepartamentoFilter] = useState("Todos");
  const [estadoFilter, setEstadoFilter] = useState<EstadoDocente | "Todos">("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);

  // Cargar docentes desde la API
  useEffect(() => {
    async function fetchDocentes() {
      try {
        const token = localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token");
        const res = await fetch("/api/docentes", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar docentes");
        const data = await res.json();

        // Mapear al formato del frontend
        const mapped: Docente[] = data.docentes.map((d: any) => ({
          id:               d.id,
          codigo:           d.codigo,
          nombres:          d.nombres,
          apellidos:        d.apellidos,
          dni:              d.dni || "—",
          correo:           d.email,
          departamento:     d.departamento,
          categoria:        d.categoria || "—",
          condicion:        d.condicion || "—",
          estado:           d.activo ? "Activo" : "Inactivo",
          estadoBiometrico: "Pendiente",
          fechaRegistro:    new Date().toISOString().slice(0, 10),
        }));

        setDocentes(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocentes();
  }, []);

  const departamentos = useMemo(() => {
    return Array.from(new Set(docentes.map((d) => d.departamento))).filter(Boolean).sort();
  }, [docentes]);

  const filteredDocentes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return docentes.filter((d) => {
      const fullName = `${d.nombres} ${d.apellidos}`.toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        fullName.includes(normalizedSearch) ||
        d.codigo.toLowerCase().includes(normalizedSearch) ||
        d.dni.includes(normalizedSearch) ||
        d.correo.toLowerCase().includes(normalizedSearch);
      const matchesDepartamento = departamentoFilter === "Todos" || d.departamento === departamentoFilter;
      const matchesEstado = estadoFilter === "Todos" || d.estado === estadoFilter;
      return matchesSearch && matchesDepartamento && matchesEstado;
    });
  }, [docentes, searchTerm, departamentoFilter, estadoFilter]);

  const stats = useMemo(() => ({
    total:       docentes.length,
    activos:     docentes.filter((d) => d.estado === "Activo").length,
    biometricos: docentes.filter((d) => d.estadoBiometrico === "Registrado").length,
    pendientes:  docentes.filter((d) => d.estadoBiometrico === "Pendiente" || d.estado !== "Activo").length,
  }), [docentes]);

  function openCreateModal() { setModalMode("create"); setSelectedDocente(null); setModalOpen(true); }
  function openViewModal(d: Docente) { setModalMode("view"); setSelectedDocente(d); setModalOpen(true); }
  function openEditModal(d: Docente) { setModalMode("edit"); setSelectedDocente(d); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setSelectedDocente(null); }

  function handleSubmitDocente(data: DocenteFormData) {
    if (modalMode === "edit" && selectedDocente) {
      setDocentes((cur) => cur.map((d) => d.id === selectedDocente.id ? { ...d, ...data } : d));
      closeModal();
      return;
    }
    const nextId = Math.max(...docentes.map((d) => d.id), 0) + 1;
    setDocentes((cur) => [{ id: nextId, codigo: `DOC-${String(nextId).padStart(3,"0")}`, ...data, fechaRegistro: new Date().toISOString().slice(0,10) }, ...cur]);
    closeModal();
  }

  function handleToggleStatus(docente: Docente) {
    setDocentes((cur) => cur.map((d) => d.id === docente.id ? { ...d, estado: d.estado === "Inactivo" ? "Activo" : "Inactivo" } : d));
  }

  function clearFilters() { setSearchTerm(""); setDepartamentoFilter("Todos"); setEstadoFilter("Todos"); }

  return (
    <DashboardLayout user={MOCK_ADMIN} active="docentes">
      <div className="admin-dashboard-animated">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Badge variant="info">Administrador</Badge>
              <Badge variant="primary">Módulo académico</Badge>
            </div>
            <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">Gestión de docentes</h1>
            <p className="mt-2 text-base font-semibold text-unsaac-muted">Administre el registro, actualización, estado y control biométrico de los docentes institucionales.</p>
          </div>
          <Button variant="primary" size="lg" className="min-w-[240px]" onClick={openCreateModal}>+ Nuevo docente</Button>
        </div>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-4">
          {[
            { title: "Docentes registrados", value: stats.total,       desc: "Total del padrón docente",         variant: "blue"   },
            { title: "Docentes activos",     value: stats.activos,     desc: "Disponibles para asistencia",      variant: "green"  },
            { title: "Biometría registrada", value: stats.biometricos, desc: "Docentes con huella activa",       variant: "yellow" },
            { title: "Pendientes",           value: stats.pendientes,  desc: "Requieren regularización",         variant: "red"    },
          ].map((s) => (
            <Card key={s.title} className="p-5">
              <p className="text-sm font-extrabold text-unsaac-muted">{s.title}</p>
              <p className={`mt-3 text-4xl font-extrabold text-unsaac-${s.variant === "blue" ? "blue" : s.variant === "green" ? "green" : s.variant === "yellow" ? "yellow" : "red"}`}>{s.value}</p>
              <p className="mt-1 text-sm font-semibold text-unsaac-muted">{s.desc}</p>
            </Card>
          ))}
        </section>

        <Card className="mb-5">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-unsaac-text">Búsqueda y filtros</h2>
              <p className="text-sm font-extrabold text-unsaac-muted">{filteredDocentes.length} resultado(s)</p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_0.9fr_0.55fr_0.45fr]">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                placeholder="Buscar por nombre, DNI, correo o código" />
              <select value={departamentoFilter} onChange={(e) => setDepartamentoFilter(e.target.value)}
                className="h-[46px] rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none">
                <option>Todos</option>
                {departamentos.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value as EstadoDocente | "Todos")}
                className="h-[46px] rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none">
                <option>Todos</option><option>Activo</option><option>Inactivo</option>
              </select>
              <Button variant="outline" className="h-[46px]" onClick={clearFilters}>Limpiar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-unsaac-text">Listado de docentes</h2>
                <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                  {loading ? "Cargando datos..." : `${docentes.length} docentes en el sistema`}
                </p>
              </div>
              <Button variant="secondary" onClick={openCreateModal}>Registrar docente</Button>
            </div>
            {loading ? (
              <p className="py-10 text-center text-unsaac-muted">Cargando docentes...</p>
            ) : docentes.length === 0 ? (
              <p className="py-10 text-center text-unsaac-muted">No hay docentes registrados aún.</p>
            ) : (
              <DocentesTable docentes={filteredDocentes} onView={openViewModal} onEdit={openEditModal} onToggleStatus={handleToggleStatus} />
            )}
          </CardContent>
        </Card>
      </div>

      <DocenteFormModal open={modalOpen} mode={modalMode} docente={selectedDocente} onClose={closeModal} onSubmit={handleSubmitDocente} />
    </DashboardLayout>
  );
}
