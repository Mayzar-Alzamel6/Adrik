"use client";

import React from "react";
import { Check, Eye, Footprints, MessageSquare, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Card, SectionHeader } from "@/components/ui/primitives";

const GATES = [
  {
    id: "khatarat" as const,
    name: "الخَطَرات",
    question: "هل طردت خواطر الكسل والتسويف قبل أن تصير عزيمة؟",
    icon: Sparkles,
  },
  {
    id: "nazharat" as const,
    name: "النَّظَرات",
    question: "هل حفظت بصرك من الشاشات العشوائية والمشتتات؟",
    icon: Eye,
  },
  {
    id: "lafadhat" as const,
    name: "اللَّفَظات",
    question: "هل أمسكت لسانك عن الجدال العقيم والكلام المستنزف؟",
    icon: MessageSquare,
  },
  {
    id: "khotuwat" as const,
    name: "الخُطُوات",
    question: "هل كان سعيك اليوم متجهاً نحو أولوياتك؟",
    icon: Footprints,
  },
];

export const FourGatesCheck: React.FC = () => {
  const fourGates = useAppStore((s) => s.fourGates);
  const toggleFourGate = useAppStore((s) => s.toggleFourGate);
  const guarded = Object.values(fourGates).filter(Boolean).length;

  return (
    <Card as="section" className="p-5 sm:p-7">
      <SectionHeader
        eyebrow="من منهج ابن القيّم"
        title="حراسة الأبواب الأربعة"
        description="يدخل التشتت إلى القلب من أربعة أبواب؛ فإذا أحكمت حراستها حفظت طاقتك."
        action={<span className="text-ui text-ink-2 tabular">{guarded} من 4</span>}
      />
      <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
        {GATES.map((g) => {
          const on = fourGates[g.id];
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleFourGate(g.id)}
              aria-pressed={on}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-right transition",
                on ? "bg-accent-soft/70 border-accent/30" : "bg-surface border-line hover:border-ink-3"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", on ? "text-accent-strong" : "text-ink-3")} strokeWidth={1.8} />
              <span className="flex-1 min-w-0">
                <span className="block font-display text-body font-semibold text-ink">{g.name}</span>
                <span className="block text-small text-ink-2 mt-0.5 leading-relaxed">{g.question}</span>
              </span>
              <span
                className={cn(
                  "w-5 h-5 shrink-0 rounded-full border-[1.5px] inline-flex items-center justify-center mt-0.5",
                  on ? "bg-accent border-accent text-accent-ink" : "border-ink-3/50 text-transparent"
                )}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
