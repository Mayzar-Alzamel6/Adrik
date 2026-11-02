import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Card ---------- */

export function Card({
  className,
  children,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "aside" }) {
  return (
    <Tag
      className={cn("bg-surface border border-line rounded-xl2 shadow-soft", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ---------- Badge ---------- */

type Tone = "neutral" | "brand" | "accent" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent-strong",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Section header ---------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-caption font-medium text-accent-strong mb-1">{eyebrow}</p>}
        <h2 className="font-display text-title sm:text-title-lg font-semibold text-ink">{title}</h2>
        {description && <p className="text-ui text-ink-2 mt-1 max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Icon tile ---------- */

export function IconTile({
  icon: Icon,
  tone = "brand",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "w-8 h-8 rounded-lg" : size === "lg" ? "w-12 h-12 rounded-xl2" : "w-10 h-10 rounded-xl";
  const glyph = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", box, tones[tone], className)}>
      <Icon className={glyph} strokeWidth={1.8} />
    </span>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-3 py-10 px-6", className)}>
      <IconTile icon={icon} tone="neutral" size="lg" />
      <div>
        <p className="font-display text-lead font-semibold text-ink">{title}</p>
        {description && <p className="text-ui text-ink-2 mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Form fields ---------- */

const fieldBase =
  "w-full bg-surface border border-line-strong rounded-xl px-3.5 text-body text-ink placeholder:text-ink-3 transition focus:outline-none focus:border-brand focus:shadow-ring";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "py-3 leading-relaxed resize-none", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function Label({
  children,
  htmlFor,
  hint,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block mb-1.5", className)}>
      <span className="text-ui font-medium text-ink">{children}</span>
      {hint && <span className="block text-small text-ink-3">{hint}</span>}
    </label>
  );
}

/* ---------- Segmented control ---------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; disabled?: boolean }[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-line", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
              size === "sm" ? "h-8 px-3 text-small" : "h-9 px-4 text-ui",
              active ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Switch ---------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand" : "bg-line-strong"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full shadow-soft transition-all",
          // Knob follows the theme: on-brand ink when on, the surface colour when off (≥3:1 on both tracks, both themes)
          checked ? "right-[22px] bg-brand-ink" : "right-0.5 bg-surface"
        )}
      />
    </button>
  );
}

/* ---------- Progress ring ---------- */

export function ProgressRing({
  value,
  size = 240,
  stroke = 6,
  children,
  className,
  tone = "brand",
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
  tone?: "brand" | "accent";
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset,stroke] duration-1000 ease-linear",
            tone === "accent" ? "stroke-accent" : "stroke-brand"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
