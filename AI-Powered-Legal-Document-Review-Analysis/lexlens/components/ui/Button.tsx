import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "cream" | "pill";
  size?: "default" | "sm";
  children: React.ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-normal transition-all active:opacity-80 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-charcoal text-off-white rounded-standard shadow-[var(--shadow-button-inset)] focus:shadow-[var(--shadow-focus-soft)] outline-none",
    ghost:
      "bg-transparent text-charcoal border border-border-interactive rounded-standard focus:shadow-[var(--shadow-focus-soft)] outline-none",
    cream:
      "bg-cream text-charcoal rounded-standard",
    pill:
      "bg-cream text-charcoal rounded-pill shadow-[var(--shadow-button-inset)] opacity-50 hover:opacity-100",
  };

  const sizes = {
    default: "px-4 py-2 text-base",
    sm: "px-3 py-1.5 text-sm",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
