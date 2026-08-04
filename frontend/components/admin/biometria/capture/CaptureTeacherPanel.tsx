"use client";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

import type {
  CaptureTeacher,
} from "@/types/biometricCapture";

interface CaptureTeacherPanelProps {
  teachers: CaptureTeacher[];
  selectedTeacher: CaptureTeacher;
  selectedTeacherId: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onTeacherChange: (teacherId: number) => void;
}

export default function CaptureTeacherPanel({
  teachers,
  selectedTeacher,
  selectedTeacherId,
  searchTerm,
  onSearchChange,
  onTeacherChange,
}: CaptureTeacherPanelProps) {
  const fullName =
    `${selectedTeacher.nombres} ${selectedTeacher.apellidos}`;

  const progress = Math.round(
    (
      selectedTeacher.huellasRegistradas /
      selectedTeacher.totalHuellas
    ) * 100
  );

  return (
    <SectionCard
      title="Selección del docente"
      description="Identifique al docente antes de iniciar el registro."
      action={
        <StatusBadge
          status={
            selectedTeacher.estadoBiometrico
          }
          label={
            selectedTeacher.estadoBiometrico
          }
          showDot
        />
      }
    >
      <div className="space-y-5">
        <Input
          type="search"
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(
              event.target.value
            )
          }
          label="Buscar docente"
          placeholder="Nombre, código o DNI"
          leftIcon={<SearchIcon />}
        />

        <Select
          label="Docente seleccionado"
          value={selectedTeacherId}
          onChange={(event) =>
            onTeacherChange(
              Number(event.target.value)
            )
          }
          helperText={`${teachers.length} resultado(s) disponibles.`}
        >
          {teachers.map((teacher) => (
            <option
              key={teacher.id}
              value={teacher.id}
            >
              {teacher.codigo} ·{" "}
              {teacher.nombres}{" "}
              {teacher.apellidos}
            </option>
          ))}
        </Select>

        <article className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-unsaac-blue text-lg font-extrabold text-white shadow-sm">
              {getInitials(fullName)}
            </span>

            <div className="min-w-0">
              <p className="text-base font-extrabold leading-6 text-unsaac-text">
                {fullName}
              </p>

              <p className="mt-1 text-sm font-extrabold text-unsaac-blue">
                {selectedTeacher.codigo}
              </p>

              <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                DNI: {selectedTeacher.dni}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <InformationItem
              label="Facultad"
              value={selectedTeacher.facultad}
            />

            <InformationItem
              label="Departamento"
              value={
                selectedTeacher.departamento
              }
            />

            <InformationItem
              label="Categoría"
              value={selectedTeacher.categoria}
            />

            <InformationItem
              label="Correo institucional"
              value={selectedTeacher.correo}
            />
          </dl>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
                Huellas registradas
              </p>

              <p className="text-sm font-extrabold text-unsaac-blue">
                {
                  selectedTeacher.huellasRegistradas
                }
                /
                {selectedTeacher.totalHuellas}
              </p>
            </div>

            <div
              className="h-2.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-label="Progreso biométrico"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-unsaac-blue transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-right text-xs font-bold text-unsaac-muted">
              {progress}% completado
            </p>
          </div>
        </article>
      </div>
    </SectionCard>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-extrabold text-unsaac-text">
        {value}
      </dd>
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "D"
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}