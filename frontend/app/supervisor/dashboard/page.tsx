import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_SUPERVISOR } from "@/lib/constants";

export default function SupervisorDashboardPage() {
  return (
    <DashboardLayout user={MOCK_SUPERVISOR} active="dashboard">
      <div className="mb-8">
        <h1 className="text-[34px] font-extrabold text-unsaac-text">
          Dashboard supervisor
        </h1>
        <p className="mt-2 text-base font-semibold text-unsaac-muted">
          Monitoreo operativo de asistencia, inconsistencias y alertas.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">
            Docentes monitoreados
          </p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-blue">84</p>
        </div>

        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">
            Alertas nuevas
          </p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-yellow">18</p>
        </div>

        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">
            Inconsistencias
          </p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-red">7</p>
        </div>

        <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">
            Registros validados
          </p>
          <p className="mt-4 text-4xl font-extrabold text-unsaac-green">312</p>
        </div>
      </div>
    </DashboardLayout>
  );
}