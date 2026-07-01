"use client";

import { useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocenteFormModal from "@/components/admin/docentes/DocenteFormModal";
import DocentesTable from "@/components/admin/docentes/DocentesTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import { mockDocentes } from "@/data/mockDocentes";
import { MOCK_ADMIN } from "@/lib/constants";
import type {
  Docente,
  DocenteFormData,
  EstadoDocente,
} from "@/types/docente";

type ModalMode = "create" | "edit" | "view";

export default function AdminDocentesPage() {
  const [docentes, setDocentes] = useState<Docente[]>(mockDocentes);
  const [searchTerm, setSearchTerm] = useState("");
  const [departamentoFilter, setDepartamentoFilter] = useState("Todos");
  const [estadoFilter, setEstadoFilter] = useState<EstadoDocente | "Todos">(
    "Todos"
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);

  const departamentos = useMemo(() => {
    return Array.from(new Set(docentes.map((docente) => docente.departamento)))
      .filter(Boolean)
      .sort();
  }, [docentes]);

  const filteredDocentes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return docentes.filter((docente) => {
      const fullName = `${docente.nombres} ${docente.apellidos}`.toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        fullName.includes(normalizedSearch) ||
        docente.codigo.toLowerCase().includes(normalizedSearch) ||
        docente.dni.includes(normalizedSearch) ||
        docente.correo.toLowerCase().includes(normalizedSearch);

      const matchesDepartamento =
        departamentoFilter === "Todos" ||
        docente.departamento === departamentoFilter;

      const matchesEstado =
        estadoFilter === "Todos" || docente.estado === estadoFilter;

      return matchesSearch && matchesDepartamento && matchesEstado;
    });
  }, [docentes, searchTerm, departamentoFilter, estadoFilter]);

  const stats = useMemo(() => {
    const total = docentes.length;
    const activos = docentes.filter(
      (docente) => docente.estado === "Activo"
    ).length;
    const biometricos = docentes.filter(
      (docente) => docente.estadoBiometrico === "Registrado"
    ).length;
    const pendientes = docentes.filter(
      (docente) =>
        docente.estadoBiometrico === "Pendiente" ||
        docente.estado !== "Activo"
    ).length;

    return {
      total,
      activos,
      biometricos,
      pendientes,
    };
  }, [docentes]);

  function openCreateModal() {
    setModalMode("create");
    setSelectedDocente(null);
    setModalOpen(true);
  }

  function openViewModal(docente: Docente) {
    setModalMode("view");
    setSelectedDocente(docente);
    setModalOpen(true);
  }

  function openEditModal(docente: Docente) {
    setModalMode("edit");
    setSelectedDocente(docente);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedDocente(null);
  }

  function handleSubmitDocente(data: DocenteFormData) {
    if (modalMode === "edit" && selectedDocente) {
      setDocentes((current) =>
        current.map((docente) =>
          docente.id === selectedDocente.id
            ? {
                ...docente,
                ...data,
              }
            : docente
        )
      );

      closeModal();
      return;
    }

    const nextId = Math.max(...docentes.map((docente) => docente.id), 0) + 1;

    const newDocente: Docente = {
      id: nextId,
      codigo: `DOC-${String(nextId).padStart(3, "0")}`,
      ...data,
      fechaRegistro: new Date().toISOString().slice(0, 10),
    };

    setDocentes((current) => [newDocente, ...current]);
    closeModal();
  }

  function handleToggleStatus(docente: Docente) {
    setDocentes((current) =>
      current.map((item) =>
        item.id === docente.id
          ? {
              ...item,
              estado: item.estado === "Inactivo" ? "Activo" : "Inactivo",
            }
          : item
      )
    );
  }

  function clearFilters() {
    setSearchTerm("");
    setDepartamentoFilter("Todos");
    setEstadoFilter("Todos");
  }

  return (
    <DashboardLayout user={MOCK_ADMIN} active="docentes">
      <div className="admin-dashboard-animated">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Badge variant="info">Administrador</Badge>
              <Badge variant="primary">Módulo académico</Badge>
            </div>

            <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">
              Gestión de docentes
            </h1>

            <p className="mt-2 text-base font-semibold text-unsaac-muted">
              Administre el registro, actualización, estado y control biométrico
              de los docentes institucionales.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="min-w-[240px]"
            leftIcon={<PlusIcon className="h-5 w-5" />}
            onClick={openCreateModal}
          >
            Nuevo docente
          </Button>
        </div>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-4">
          <SummaryCard
            title="Docentes registrados"
            value={stats.total}
            description="Total del padrón docente"
            variant="blue"
          />

          <SummaryCard
            title="Docentes activos"
            value={stats.activos}
            description="Disponibles para asistencia"
            variant="green"
          />

          <SummaryCard
            title="Biometría registrada"
            value={stats.biometricos}
            description="Docentes con huella activa"
            variant="yellow"
          />

          <SummaryCard
            title="Pendientes"
            value={stats.pendientes}
            description="Requieren regularización"
            variant="red"
          />
        </section>

        <Card className="mb-5">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-unsaac-text">
                Búsqueda y filtros
              </h2>

              <p className="text-sm font-extrabold text-unsaac-muted">
                {filteredDocentes.length} resultado(s)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_0.9fr_0.55fr_0.45fr]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-unsaac-muted" />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-[46px] w-full rounded-xl border border-unsaac-border bg-unsaac-content px-4 pl-12 text-sm font-bold text-unsaac-text outline-none transition placeholder:text-unsaac-muted focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                  placeholder="Buscar por nombre, DNI, correo o código"
                />
              </div>

              <select
                value={departamentoFilter}
                onChange={(event) => setDepartamentoFilter(event.target.value)}
                className="h-[46px] rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
              >
                <option>Todos</option>
                {departamentos.map((departamento) => (
                  <option key={departamento}>{departamento}</option>
                ))}
              </select>

              <select
                value={estadoFilter}
                onChange={(event) =>
                  setEstadoFilter(event.target.value as EstadoDocente | "Todos")
                }
                className="h-[46px] rounded-xl border border-unsaac-border bg-unsaac-content px-4 text-sm font-bold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
              >
                <option>Todos</option>
                <option>Activo</option>
                <option>En pausa</option>
                <option>Inactivo</option>
              </select>

              <Button variant="outline" className="h-[46px]" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-unsaac-text">
                  Listado de docentes
                </h2>
                <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                  Registros preparados para conexión posterior con backend.
                </p>
              </div>

              <Button variant="secondary" onClick={openCreateModal}>
                Registrar docente
              </Button>
            </div>

            <DocentesTable
              docentes={filteredDocentes}
              onView={openViewModal}
              onEdit={openEditModal}
              onToggleStatus={handleToggleStatus}
            />

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-extrabold text-unsaac-muted">
                Página 1 de 1
              </p>

              <div className="flex items-center gap-2">
                <PaginationButton active>1</PaginationButton>
                <PaginationButton>Anterior</PaginationButton>
                <PaginationButton>Siguiente</PaginationButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DocenteFormModal
        open={modalOpen}
        mode={modalMode}
        docente={selectedDocente}
        onClose={closeModal}
        onSubmit={handleSubmitDocente}
      />
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  description,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  variant: "blue" | "green" | "yellow" | "red";
}) {
  const styles = {
    blue: {
      bg: "bg-blue-100",
      text: "text-unsaac-blue",
    },
    green: {
      bg: "bg-green-100",
      text: "text-unsaac-green",
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-unsaac-yellow",
    },
    red: {
      bg: "bg-red-100",
      text: "text-unsaac-red",
    },
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-unsaac-muted">{title}</p>
          <p className={`mt-3 text-4xl font-extrabold ${styles[variant].text}`}>
            {value}
          </p>
          <p className="mt-1 text-sm font-semibold text-unsaac-muted">
            {description}
          </p>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles[variant].bg}`}
        >
          <UsersIcon className={`h-7 w-7 ${styles[variant].text}`} />
        </div>
      </div>
    </Card>
  );
}

function PaginationButton({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-extrabold transition ${
        active
          ? "border-unsaac-blue bg-unsaac-blue text-white"
          : "border-unsaac-border bg-white text-unsaac-muted hover:bg-unsaac-content-soft"
      }`}
    >
      {children}
    </button>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}