import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";

interface PagePlaceholderProps {
  title: string;
  description: string;
  moduleName: string;
}

export default function PagePlaceholder({
  title,
  description,
  moduleName,
}: PagePlaceholderProps) {
  return (
    <div className="admin-dashboard-animated">
      <div className="mb-8">
        <Badge variant="info">{moduleName}</Badge>

        <h1 className="mt-4 text-[34px] font-extrabold text-unsaac-text">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-base font-semibold leading-7 text-unsaac-muted">
          {description}
        </p>
      </div>

      <Card>
        <CardHeader
          title="Pantalla en construcción"
          description="Esta página ya está conectada al menú lateral y lista para implementar su contenido."
        />

        <CardContent>
          <div className="rounded-2xl border border-dashed border-unsaac-border bg-unsaac-content-soft p-10 text-center">
            <p className="text-lg font-extrabold text-unsaac-text">
              Módulo preparado correctamente
            </p>

            <p className="mt-2 text-sm font-semibold text-unsaac-muted">
              Aquí se agregarán tablas, formularios, filtros, botones y conexión
              futura con backend.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}