import DashboardLayout from "@/components/layout/DashboardLayout";
import PagePlaceholder from "@/components/shared/PagePlaceholder";
import { MOCK_ADMIN } from "@/lib/constants";

export default function AdminConfiguracionPage() {
  return (
    <DashboardLayout user={MOCK_ADMIN} active="configuracion">
      <PagePlaceholder
        moduleName="ADMINISTRADOR"
        title="Configuración del sistema"
        description="Parámetros generales, horarios institucionales, seguridad y preferencias del sistema."
      />
    </DashboardLayout>
  );
}