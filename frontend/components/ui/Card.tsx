import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-unsaac-border bg-white shadow-sm",
        className
      )}
    >
      {children}
    </article>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-unsaac-border px-6 py-5",
        className
      )}
    >
      <div>
        <h2 className="text-xl font-extrabold text-unsaac-text">{title}</h2>

        {description && (
          <p className="mt-1 text-sm font-semibold text-unsaac-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}