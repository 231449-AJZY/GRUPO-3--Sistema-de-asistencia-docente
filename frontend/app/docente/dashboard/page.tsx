import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_DOCENTE } from "@/lib/constants";

export default function DocenteDashboardPage() {
  return (
    <DashboardLayout user={MOCK_DOCENTE} active="dashboard">
      <div className="mb-8">
        <h1 className="text-[34px] font-extrabold text-unsaac-text">
          Dashboard docente
        </h1>
        <p className="mt-2 text-base font-semibold text-unsaac-muted">
          Vista personal de asistencia, horarios y calendario académico.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">
            Asistencias del mes
          </p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-green">22</p>
        </div>

        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">Tardanzas</p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-yellow">2</p>
        </div>

        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">Inasistencias</p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-red">0</p>
        </div>
      </div>
    </DashboardLayout>
  );
}