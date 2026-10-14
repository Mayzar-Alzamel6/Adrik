import React from "react";
import { cn } from "@/lib/utils";

/** Brand mark: an open ring (the "flywheel") closing on a single point of focus. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path
        d="M22.5 11.2A8 8 0 1 0 24 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="text-brand-ink"
      />
      <circle cx="16" cy="16" r="2.6" className="fill-accent" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-title-sm font-semibold tracking-tight text-ink">أدرك عمرك</span>
      )}
    </span>
  );
}
