import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  eyebrow,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white px-6 py-6 shadow-sm xl:flex-row xl:items-center xl:justify-between xl:px-8 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-unsaac-blue">
            {eyebrow}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-unsaac-text sm:text-3xl">
            {title}
          </h1>

          {badge && (
            <div className="shrink-0">
              {badge}
            </div>
          )}
        </div>

        {description && (
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-unsaac-muted sm:text-base">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </section>
  );
}