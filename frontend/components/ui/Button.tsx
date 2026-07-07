"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-unsaac-orange text-white shadow-sm hover:bg-orange-500 active:bg-orange-600",
  secondary:
    "bg-unsaac-blue text-white shadow-sm hover:bg-blue-600 active:bg-blue-700",
  success:
    "bg-unsaac-green text-white shadow-sm hover:bg-green-600 active:bg-green-700",
  warning:
    "bg-unsaac-yellow text-white shadow-sm hover:bg-yellow-500 active:bg-yellow-600",
  danger:
    "bg-unsaac-red text-white shadow-sm hover:bg-red-600 active:bg-red-700",
  outline:
    "border border-unsaac-border bg-white text-unsaac-text hover:bg-unsaac-content-soft",
  ghost:
    "bg-transparent text-unsaac-muted hover:bg-unsaac-content-soft hover:text-unsaac-text",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}