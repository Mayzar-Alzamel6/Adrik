"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

interface SymbolismDecoderProps {
  escapeActivity: string;
  onDecoded: (data: { avoidedEmotion: string; rootMeaning: string; correctiveStep: string }) => void;
  onCancel?: () => void;
}

/** Names the feeling the urge is trying to escape, and proposes the smallest corrective step. */
export const SymbolismDecoder: React.FC<SymbolismDecoderProps> = ({ escapeActivity, onDecoded, onCancel }) => {
  const faith = useAppStore((s) => s.settings.faithContent);

  const roots = [
    {
      id: "fear",
      label: "خوف من الفشل",
      meaning: "هروب من ألم المحاولة واحتمال التعثّر إلى نشاط سهل ومضمون.",
      corrective: "خمس دقائق فقط: سطر واحد أو مسألة واحدة، دون تقييم النتيجة.",
    },
    {
      id: "perfectionism",
      label: "كمالية وتدقيق زائد",
      meaning: "تريد عملاً مثالياً من المحاولة الأولى، فتصبح البداية مخيفة.",
      corrective: "اسمح لنفسك بمسودة سيئة. العمل الناقص المنجز خير من الكامل المؤجل.",
    },
    {
      id: "inertia",
      label: "ثِقل البداية",
      meaning: "المهمة تبدو جبلاً واحداً لا يمكن تفكيكه، فيرفض الدماغ الانطلاق.",
      corrective: "افتح الملف فقط، أو جهّز مكانك. أصغر حركة مادية ممكنة.",
    },
    {
      id: "emptiness",
      label: "تعب أو فراغ داخلي",
      meaning: "طلب جرعة متعة سريعة لملء فراغ أو إرهاق تراكم خلال اليوم.",
      corrective: faith
        ? "توضّأ وصلِّ ركعتين، أو امشِ عشر دقائق مع كوب ماء بارد."
        : "امشِ عشر دقائق في الهواء الطلق، واشرب كوب ماء بارد.",
    },
  ];

  const [selected, setSelected] = useState(roots[0]);
  const [meaning, setMeaning] = useState(roots[0].meaning);
  const [step, setStep] = useState(roots[0].corrective);

  const choose = (r: (typeof roots)[number]) => {
    setSelected(r);
    setMeaning(r.meaning);
    setStep(r.corrective);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDecoded({ avoidedEmotion: selected.label, rootMeaning: meaning, correctiveStep: step });
      }}
      className="space-y-5 animate-rise-in"
    >
      <div>
        <p className="text-ui text-ink-2">
          الرغبة: <span className="text-ink font-medium">«{escapeActivity}»</span>
        </p>
        <h3 className="font-display text-title-sm font-semibold text-ink mt-1">ما الشعور الذي تحاول الهروب منه؟</h3>
        <p className="text-ui text-ink-3 mt-1">الاندفاع ليس عيباً أخلاقياً؛ إنه رسالة تطلب الأمان لا المتعة.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {roots.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => choose(r)}
            aria-pressed={selected.id === r.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl border px-4 h-12 text-body text-right transition",
              selected.id === r.id ? "border-brand shadow-ring text-ink font-medium" : "border-line text-ink-2 hover:border-ink-3"
            )}
          >
            {r.label}
            {selected.id === r.id && <Check className="w-4 h-4 text-brand" />}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="sym-meaning">ماذا يعني هذا؟</Label>
        <Textarea id="sym-meaning" rows={2} value={meaning} onChange={(e) => setMeaning(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="sym-step">أصغر خطوة بديلة</Label>
        <Input id="sym-step" value={step} onChange={(e) => setStep(e.target.value)} required />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">احفظ وأجّل الرغبة</Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            رجوع
          </Button>
        )}
      </div>
    </form>
  );
};
