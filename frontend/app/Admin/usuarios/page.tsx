import DashboardLayout from "@/components/layout/DashboardLayout";
import PagePlaceholder from "@/components/shared/PagePlaceholder";
import { MOCK_ADMIN } from "@/lib/constants";

export default function AdminUsuariosPage() {
  return (
    <DashboardLayout user={MOCK_ADMIN} active="usuarios">
      <PagePlaceholder
        moduleName="ADMINISTRADOR"
        title="Gestión de usuarios"
        description="Administración de cuentas, credenciales, estados de acceso y perfiles del sistema."
      />
    </DashboardLayout>
  );
}