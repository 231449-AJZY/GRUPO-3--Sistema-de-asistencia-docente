import DashboardLayout from "@/components/layout/DashboardLayout";
import PagePlaceholder from "@/components/shared/PagePlaceholder";
import { MOCK_ADMIN } from "@/lib/constants";

export default function AdminBiometriaPage() {
  return (
    <DashboardLayout user={MOCK_ADMIN} active="biometria">
      <PagePlaceholder
        moduleName="ADMINISTRADOR"
        title="Gestión biométrica"
        description="Administración de dispositivos biométricos, captura de huellas y sincronización de registros."
      />
    </DashboardLayout>
  );
}