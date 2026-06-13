import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "standard" | "compact" | "featured";
}

export function Card({ className, variant = "standard", children, ...props }: CardProps) {
  const variants = {
    compact: "rounded-comfortable p-4",
    standard: "rounded-card p-6",
    featured: "rounded-container p-8",
  };

  return (
    <div
      className={cn(
        "bg-cream border border-border-subtle backdrop-blur-md",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
