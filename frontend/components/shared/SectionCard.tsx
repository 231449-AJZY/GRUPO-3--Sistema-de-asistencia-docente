import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export default function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  headerClassName = "",
  contentClassName = "p-6",
}: SectionCardProps) {
  const hasHeader = Boolean(
    title ||
      description ||
      action
  );

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {hasHeader && (
        <header
          className={`flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${headerClassName}`}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-extrabold tracking-tight text-unsaac-text">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm font-medium leading-6 text-unsaac-muted">
                {description}
              </p>
            )}
          </div>

          {action && (
            <div className="flex shrink-0 items-center gap-2">
              {action}
            </div>
          )}
        </header>
      )}

      <div className={contentClassName}>
        {children}
      </div>
    </section>
  );
}