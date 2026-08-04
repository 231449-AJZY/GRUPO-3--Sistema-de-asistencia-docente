"use client";

import Image from "next/image";

import ModalShell from "@/components/shared/ModalShell";
import Button from "@/components/ui/Button";

import type { GeneratedMobileLink } from "@/types/mobileDevice";

interface MobileLinkQrModalProps {
  open: boolean;
  link: GeneratedMobileLink | null;
  onClose: () => void;
  onCancel: () => void | Promise<void>;
  cancelling?: boolean;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MobileLinkQrModal({
  open,
  link,
  onClose,
  onCancel,
  cancelling = false,
}: MobileLinkQrModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Sincronizar y autorizar móvil"
      description="El docente debe iniciar sesión en la aplicación y escanear este QR desde la opción Sincronizar con la página."
      size="sm"
      closeOnBackdrop={false}
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cerrar
          </Button>

          <Button
            type="button"
            variant="danger"
            loading={cancelling}
            loadingText="Cancelando"
            onClick={() => void onCancel()}
            disabled={!link}
          >
            Cancelar QR
          </Button>
        </div>
      }
    >
      {link && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-900">
            QR administrativo para{" "}
            <strong>
              {link.names} {link.surnames}
            </strong>{" "}
            ({link.teacherCode}). Al escanearlo desde la sesión de ese
            docente, el celular quedará autorizado automáticamente. Vence el{" "}
            {formatDate(link.expiresAt)}.
          </div>

          <div className="mx-auto w-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <Image
              src={link.qrImage}
              alt={`QR de sincronización para ${link.names} ${link.surnames}`}
              width={360}
              height={360}
              unoptimized
              priority
              className="h-auto w-full max-w-[320px]"
            />
          </div>

          <ol className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
            <li>1. El docente inicia sesión en la aplicación móvil.</li>
            <li>2. Pulsa “Sincronizar con la página”.</li>
            <li>3. Escanea este QR con la cámara.</li>
            <li>4. El servidor vincula y autoriza el celular en un solo paso.</li>
          </ol>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold leading-5 text-blue-800">
            Si el docente ya tiene otro celular autorizado o suspendido,
            primero debe revocarlo desde esta misma página. Un dispositivo
            pendiente anterior sí puede ser reemplazado por la nueva
            sincronización.
          </div>

          <p className="text-center text-xs font-semibold text-slate-500">
            Vigencia: {link.validityMinutes} minutos. El QR es de un solo uso y
            solo funciona con la cuenta docente seleccionada.
          </p>
        </div>
      )}
    </ModalShell>
  );
}
