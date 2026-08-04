import type { ReactNode } from "react";

export type EmptyStateSize =
  | "sm"
  | "md"
  | "lg";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

const SIZE_CLASSES: Record<
  EmptyStateSize,
  {
    container: string;
    icon: string;
    title: string;
    description: string;
  }
> = {
  sm: {
    container: "px-5 py-8",
    icon: "h-12 w-12",
    title: "text-base",
    description: "text-sm",
  },

  md: {
    container: "px-6 py-12",
    icon: "h-16 w-16",
    title: "text-lg",
    description: "text-sm",
  },

  lg: {
    container: "px-8 py-16",
    icon: "h-20 w-20",
    title: "text-xl",
    description: "text-base",
  },
};

function DefaultEmptyIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const styles = SIZE_CLASSES[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}
      role="status"
    >
      <div
        className={`flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-400 ${styles.icon}`}
      >
        {icon ?? <DefaultEmptyIcon />}
      </div>

      <h3
        className={`mt-5 font-extrabold tracking-tight text-unsaac-text ${styles.title}`}
      >
        {title}
      </h3>

      {description && (
        <p
          className={`mt-2 max-w-md font-medium leading-6 text-unsaac-muted ${styles.description}`}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryAction}
          {action}
        </div>
      )}
    </div>
  );
}