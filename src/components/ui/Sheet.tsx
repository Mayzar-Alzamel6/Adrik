"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered dialog on desktop, bottom sheet on phones.
 * Closes on Escape and backdrop click; moves focus inside on open.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Parents pass inline callbacks; keeping it in a ref stops every re-render from re-running the focus effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const width = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-scrim backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-surface border border-line shadow-lift outline-none animate-sheet-in",
          "rounded-t-4xl sm:rounded-4xl max-h-[92vh] overflow-y-auto",
          width
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 pb-3 bg-surface/95 backdrop-blur">
          <div className="min-w-0">
            {title && <h2 className="font-display text-title font-semibold text-ink">{title}</h2>}
            {description && <p className="text-ui text-ink-2 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-7 pb-7">{children}</div>
      </div>
    </div>
  );
}
