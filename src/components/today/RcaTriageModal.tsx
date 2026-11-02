"use client";

import React, { useState } from "react";
import { AlertTriangle, Brain, Compass, Wrench, Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type BugType = "BUG_A" | "BUG_B" | "BUG_C";

export interface BugData {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  patch: string;
  color: string;
}

export const BUGS_DATA: Record<BugType, BugData> = {
  BUG_A: {
    title: "Bug A: هندسة مفرطة وتشعب جانبي (Rabbit Hole)",
    icon: Compass,
    desc: "غرقت في تفاصيل معمارية، بحث جانبي، أو تحسينات تجميلية خارج العقد الأصلي.",
    patch: "قص الفرع المفتوح فوراً ونقله لمستودع الأفكار المعمارية، والعودة للحد الأدنى الصارم للـ DoD.",
    color: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  BUG_B: {
    title: "Bug B: ضبابية شرط الإنجاز (Vague Definition of Done)",
    icon: AlertTriangle,
    desc: "الشرط كان كبيراً جداً، غامضاً، أو غير ثنائي، مما شل القدرة على الإغلاق والحسم.",
    patch: "تقسيم المهمة لنصفين، وصياغة خطوة مجهرية تنتهي خلال 15 دقيقة فقط.",
    color: "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  BUG_C: {
    title: "Bug C: انهيار الطاقة الإدراكية (Cognitive Crash)",
    icon: Brain,
    desc: "محاولة الاستمرار والتركيز مستنزف تماماً؛ التشتت ناتج عن إرهاق عصبي وليس نقص إرادة.",
    patch: "إيقاف إجباري فوري لمدة 20 دقيقة (ماء، حركة، ابتعاد تام عن أي شاشات أو أجهزة).",
    color: "text-sky-700 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
  },
};

interface RcaTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPatch?: (bugType: BugType, patch: string) => void;
}

export function RcaTriageModal({ isOpen, onClose, onApplyPatch }: RcaTriageModalProps) {
  const [selectedBug, setSelectedBug] = useState<BugType>("BUG_A");
  const [customPatch, setCustomPatch] = useState("");

  const activeBug = BUGS_DATA[selectedBug];

  const handleApply = () => {
    const finalPatch = customPatch.trim() || activeBug.patch;
    onApplyPatch?.(selectedBug, finalPatch);
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="md"
      title="معالج الأعطال السريع (2-Min RCA Triage)"
      description="تشخيص فوري خوارزمي: تحديد السطر الفكري المعطوب وتطبيق الترقيع التنفيذي."
    >
      <div className="space-y-5 pt-2">
        {/* Bug Selector */}
        <div className="space-y-2">
          {(Object.keys(BUGS_DATA) as BugType[]).map((type) => {
            const item = BUGS_DATA[type];
            const Icon = item.icon;
            const isSelected = selectedBug === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedBug(type);
                  setCustomPatch("");
                }}
                className={cn(
                  "w-full text-right p-3.5 rounded-xl border transition flex items-start gap-3",
                  isSelected
                    ? "border-brand bg-brand-soft ring-1 ring-brand/40 shadow-sm"
                    : "border-line bg-surface hover:bg-surface-2"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0 mt-0.5",
                    item.color
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-small font-bold text-ink">{item.title}</div>
                  <div className="text-caption text-ink-2 mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Executable Patch Box */}
        <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-2">
          <div className="flex items-center gap-2 text-small font-bold text-ink">
            <Wrench className="w-4 h-4 text-brand" />
            <span>الترقيع التنفيذي المباشر (Executable Patch):</span>
          </div>
          <p className="text-small text-ink-2 leading-relaxed bg-surface p-3 rounded-lg border border-line/60">
            {activeBug.patch}
          </p>
          <input
            type="text"
            value={customPatch}
            onChange={(e) => setCustomPatch(e.target.value)}
            placeholder="أو اكتب ترقيعاً مخصصاً لجلسة الآن..."
            className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-small text-ink placeholder:text-ink-3 focus:outline-none focus:border-brand"
          />
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-line">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 ml-1.5" />
            تطبيق الترقيع واستئناف العمل
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
