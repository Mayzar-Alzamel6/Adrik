"use client";

import React, { useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/primitives";
import { useAppStore } from "@/stores/useAppStore";

interface AgileRerouteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AgileRerouteModal({ open, onClose, onSuccess }: AgileRerouteModalProps) {
  const currentDay = useAppStore((s) => s.currentDay);
  const addRerouteEvent = useAppStore((s) => s.addRerouteEvent);
  const [incident, setIncident] = useState("");
  const [negotiatedHours, setNegotiatedHours] = useState<number>(2);
  const [bufferTarget, setBufferTarget] = useState<"tonight" | "tomorrow">("tomorrow");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident.trim()) return;

    addRerouteEvent({
      date: currentDay,
      incident: incident.trim(),
      negotiatedHours,
      bufferTarget,
    });

    setIncident("");
    setNegotiatedHours(2);
    setBufferTarget("tomorrow");
    onSuccess?.();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="md"
      title="بروتوكول التعديل الطارئ الخوارزمي (Agile Reroute)"
      description="استيعاب الطوارئ بمرونة دون كسر النظام أو تصفير العدادات أو جلد الذات."
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        <div className="rounded-xl bg-accent-soft p-3.5 text-small text-accent-strong flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            الـ INTJ-A ينهار يومه عند انكسار الخطة الصارمة. هذا البروتوكول يُعيد توجيه المسار خوارزمياً: اقتطاع وقت
            للطارئ وترحيل الباقي لـ Buffer معتمد دون احتساب أي &quot;فشل&quot;.
          </p>
        </div>

        {/* 1. وصف العارض الطارئ */}
        <div>
          <Label htmlFor="reroute-incident" className="mb-1.5 block font-medium">
            1. المتغير الطارئ (ما الذي حدث في سطر واحد؟)
          </Label>
          <Input
            id="reroute-incident"
            value={incident}
            onChange={(e) => setIncident(e.target.value)}
            placeholder="مثال: اجتماع غير مجدول مع عميل / عطل تقني طارئ في الخادم"
            required
            autoFocus
          />
        </div>

        {/* 2. الشريحة الزمنية المقتطعة */}
        <div>
          <Label className="mb-1.5 block font-medium">
            2. الشريحة الزمنية المتفاوض عليها للاستجابة
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setNegotiatedHours(hours)}
                className={`py-2 px-3 rounded-lg border text-small font-semibold transition ${
                  negotiatedHours === hours
                    ? "bg-brand text-brand-ink border-brand shadow-sm"
                    : "border-line text-ink-2 hover:bg-surface-2"
                }`}
              >
                {hours} {hours === 1 ? "ساعة" : "ساعات"}
              </button>
            ))}
          </div>
        </div>

        {/* 3. كتلة التعويض المجدولة */}
        <div>
          <Label className="mb-1.5 block font-medium">
            3. كتلة التعويض (إلى أين يُعاد توجيه الساعات المتبقية؟)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBufferTarget("tonight")}
              className={`py-2.5 px-3 rounded-lg border text-small font-semibold transition text-right ${
                bufferTarget === "tonight"
                  ? "bg-brand text-brand-ink border-brand"
                  : "border-line text-ink-2 hover:bg-surface-2"
              }`}
            >
              <div className="font-bold">مساء اليوم (Buffer المساء)</div>
              <div className="text-caption opacity-80">تمديد خفيف أو تركيز مسائي هادئ</div>
            </button>
            <button
              type="button"
              onClick={() => setBufferTarget("tomorrow")}
              className={`py-2.5 px-3 rounded-lg border text-small font-semibold transition text-right ${
                bufferTarget === "tomorrow"
                  ? "bg-brand text-brand-ink border-brand"
                  : "border-line text-ink-2 hover:bg-surface-2"
              }`}
            >
              <div className="font-bold">خانة احتياط الغد (Tomorrow Buffer)</div>
              <div className="text-caption opacity-80">ترحيل منظم لأولويات الغد</div>
            </button>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={!incident.trim()}>
            <RefreshCw className="w-4 h-4 ml-1.5" />
            تأكيد التعديل وتكييف المسار 🔄
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
