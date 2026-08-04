export type LoadingStateSize =
  | "sm"
  | "md"
  | "lg";

interface LoadingStateProps {
  title?: string;
  description?: string;
  size?: LoadingStateSize;
  fullHeight?: boolean;
  compact?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<
  LoadingStateSize,
  {
    spinner: string;
    ring: string;
    title: string;
    description: string;
    spacing: string;
  }
> = {
  sm: {
    spinner: "h-8 w-8",
    ring: "border-[3px]",
    title: "text-sm",
    description: "text-xs",
    spacing: "py-5",
  },

  md: {
    spinner: "h-12 w-12",
    ring: "border-4",
    title: "text-base",
    description: "text-sm",
    spacing: "py-10",
  },

  lg: {
    spinner: "h-16 w-16",
    ring: "border-[5px]",
    title: "text-lg",
    description: "text-sm",
    spacing: "py-16",
  },
};

export default function LoadingState({
  title = "Cargando información",
  description = "Espere un momento mientras obtenemos los datos.",
  size = "md",
  fullHeight = false,
  compact = false,
  className = "",
}: LoadingStateProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center text-center ${
        fullHeight
          ? "min-h-[calc(100vh-172px)]"
          : compact
            ? "py-4"
            : config.spacing
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={`${config.spinner} ${config.ring} animate-spin rounded-full border-blue-100 border-t-unsaac-blue`}
          aria-hidden="true"
        />

        <span
          className="absolute h-2.5 w-2.5 rounded-full bg-unsaac-orange"
          aria-hidden="true"
        />
      </div>

      {title && (
        <p
          className={`mt-5 font-extrabold tracking-tight text-unsaac-text ${config.title}`}
        >
          {title}
        </p>
      )}

      {description && (
        <p
          className={`mt-2 max-w-md font-medium leading-6 text-unsaac-muted ${config.description}`}
        >
          {description}
        </p>
      )}

      <span className="sr-only">
        Cargando
      </span>
    </div>
  );
}