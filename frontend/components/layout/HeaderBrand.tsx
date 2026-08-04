import Image from "next/image";

interface HeaderBrandProps {
  compact?: boolean;
}

export default function HeaderBrand({
  compact = false,
}: HeaderBrandProps) {
  return (
    <div className="flex min-w-0 items-center">
      <div className="flex shrink-0 items-center">
        <Image
          src="/images/logo-unsaac.png"
          alt="Universidad Nacional de San Antonio Abad del Cusco"
          width={300}
          height={100}
          priority
          className={
            compact
              ? "h-[50px] w-auto max-w-[190px] object-contain sm:h-[56px] sm:max-w-[220px] xl:h-[70px] xl:max-w-none"
              : "h-[70px] w-auto object-contain"
          }
        />
      </div>

      <div
        className={
          compact
            ? "mx-5 hidden h-12 w-[3px] shrink-0 rounded-full bg-unsaac-orange lg:block xl:mx-7 xl:h-14"
            : "mx-7 hidden h-14 w-[3px] shrink-0 rounded-full bg-unsaac-orange lg:block"
        }
      />

      <div className="hidden min-w-0 lg:block">
        <h1
          className={
            compact
              ? "truncate text-[22px] font-extrabold text-white xl:text-[30px]"
              : "truncate text-[26px] font-extrabold text-white xl:text-[30px]"
          }
        >
          Control de Asistencia Docente
        </h1>

        <p className="mt-1 hidden truncate text-sm font-semibold text-blue-100 xl:block">
          Sistema de Control de Asistencia Biometrica - UNSAAC
        </p>
      </div>
    </div>
  );
}
