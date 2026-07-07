import DashboardLayout from "@/components/layout/DashboardLayout";
import PagePlaceholder from "@/components/shared/PagePlaceholder";
import { MOCK_ADMIN } from "@/lib/constants";

export default function AdminRolesPage() {
  return (
    <DashboardLayout user={MOCK_ADMIN} active="roles">
      <PagePlaceholder
        moduleName="ADMINISTRADOR"
        title="Gestión de roles"
        description="Configuración de permisos para administradores, docentes y supervisores."
      />
    </DashboardLayout>
  );
}