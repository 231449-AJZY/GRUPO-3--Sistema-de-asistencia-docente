import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-unsaac-green",
  warning: "bg-yellow-100 text-unsaac-yellow",
  danger: "bg-red-100 text-unsaac-red",
  info: "bg-blue-100 text-unsaac-blue",
  neutral: "bg-slate-100 text-unsaac-muted",
  primary: "bg-orange-100 text-orange-700",
};

export default function Badge({
  children,
  variant = "neutral",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}