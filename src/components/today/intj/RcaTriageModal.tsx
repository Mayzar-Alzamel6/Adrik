"use client";

import React, { useState } from "react";
import { AlertTriangle, Wrench, X, Compass, Brain, RefreshCw } from "lucide-react";
import { useIntjProtocolStore, type BugType } from "@/stores/useIntjProtocolStore";

interface RcaTriageModalProps {
  blockId: number;
  isOpen: boolean;
  onClose: () => void;
}

const BUGS_DATA: Record<
  BugType,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    patch: string;
    color: string;
  }
> = {
  BUG_A: {
    title: "Bug A: هندسة مفرطة وتشعب جانبي (Rabbit Hole)",
    icon: Compass,
    desc: "غرقت في تفاصيل معمارية، بحث جانبي، أو تحسينات لم تكن مذكورة في العقد.",
    patch: "قص الفرع المفتوح فوراً ونقله لسلة الأفكار المؤجلة، والعودة للحد الأدنى المباشر للعقد.",
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  BUG_B: {
    title: "Bug B: ضبابية شرط الإنجاز (Vague Definition of Done)",
    icon: AlertTriangle,
    desc: "الشرط كان كبيراً جداً، غامضاً، أو غير ثنائي، مما شل القدرة على الإغلاق.",
    patch: "تقسيم المهمة لنصفين، وتحديد خطوة دقيقة جداً تنتهي في 15 دقيقة فقط.",
    color: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
  },
  BUG_C: {
    title: "Bug C: انهيار الطاقة الإدراكية (Cognitive Crash)",
    icon: Brain,
    desc: "محاولة الاستمرار والتركيز مستنزف تماماً؛ التشتت ناتج عن إرهاق عصبي حقيقي.",
    patch: "إيقاف إجباري فوري لمدة 20 دقيقة (مشي، ماء، ابتعاد تام عن أي شاشات أو أجهزة).",
    color: "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
  },
};

export function RcaTriageModal({ blockId, isOpen, onClose }: RcaTriageModalProps) {
  const { recordFailure, resetTimer } = useIntjProtocolStore();
  const [selectedBug, setSelectedBug] = useState<BugType>("BUG_A");
  const [customPatch, setCustomPatch] = useState("");

  if (!isOpen) return null;

  const activeBug = BUGS_DATA[selectedBug];

  const handleApply = () => {
    const finalPatch = customPatch.trim() || activeBug.patch;
    recordFailure(blockId, selectedBug, finalPatch);
    onClose();
  };

  const handleResetBlock = () => {
    const finalPatch = customPatch.trim() || activeBug.patch;
    recordFailure(blockId, selectedBug, finalPatch);
    resetTimer(blockId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-display font-semibold text-heading-sm text-ink">
              معالج الأعطال السريع (2-Min RCA Triage)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-raised transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-small text-ink-2">
          التعثر ليس فشلاً شخصياً، بل هو <strong>Exception</strong> في نظام التشغيل اليومي.
          حدد نوع العطل ببرود لتطبيق الترقيع الفوري:
        </p>

        {/* Bug options */}
        <div className="space-y-2.5">
          {(Object.keys(BUGS_DATA) as BugType[]).map((key) => {
            const item = BUGS_DATA[key];
            const isSelected = selectedBug === key;
            const Icon = item.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedBug(key)}
                className={`w-full text-right p-3.5 rounded-xl border transition flex items-start gap-3 ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border bg-surface-raised hover:border-ink-4"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? "text-accent-strong" : "text-ink-3"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-body text-ink">{item.title}</div>
                  <div className="text-small text-ink-3 mt-0.5">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Patch recommendation */}
        <div className={`p-3.5 rounded-xl border ${activeBug.color} space-y-1.5`}>
          <div className="flex items-center gap-1.5 font-medium text-small">
            <Wrench className="w-4 h-4" />
            الترقيع الفوري الموصى به (System Patch):
          </div>
          <p className="text-body font-medium">{activeBug.patch}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-lg border border-border text-body text-ink hover:bg-surface-raised transition"
          >
            تسجيل العطل وإغلاق
          </button>
          <button
            type="button"
            onClick={handleResetBlock}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium text-body hover:bg-accent-hover transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            تطبيق الترقيع وإعادة ضبط المؤقت
          </button>
        </div>
      </div>
    </div>
  );
}
