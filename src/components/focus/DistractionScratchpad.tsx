"use client";

import React, { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Inbox, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

interface DistractionScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Quick capture for stray thoughts during focus: write it down, close, keep going. */
export const DistractionScratchpad: React.FC<DistractionScratchpadProps> = ({ isOpen, onClose }) => {
  const { distractions, addDistraction, removeDistraction, clearDistractions } = useAppStore(
    useShallow((s) => ({
      distractions: s.distractions,
      addDistraction: s.addDistraction,
      removeDistraction: s.removeDistraction,
      clearDistractions: s.clearDistractions,
    }))
  );
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [focusFeedback, setFocusFeedback] = useState<string | null>(null);

  const toInbox = (idx: number, thought: string) => {
    usePlannerStore.getState().addTask(thought, "INBOX");
    removeDistraction(idx);
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addDistraction(trimmed);
    setText("");
    if (isFocusRunning) {
      setFocusFeedback("تم الحجز لما بعد الجلسة ✓");
      setTimeout(() => {
        setFocusFeedback(null);
        onClose();
      }, 1000);
    }
  };

  const handleClose = () => {
    setFocusFeedback(null);
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={handleClose}
      title={isFocusRunning ? "⚡ تفريغ خاطرة سريعة" : "تفريغ خاطرة"}
      description={
        isFocusRunning
          ? "احجز الفكرة أو التشتت فوراً لتفرغ ذهنك وتواصل جلستك."
          : "فكرة طارئة أو رغبة في البحث؟ اكتبها هنا وعد لعملك. ستجدها بعد الجلسة."
      }
      size="md"
    >
      {isFocusRunning ? (
        focusFeedback ? (
          <div className="py-12 text-center animate-fade-in">
            <p className="text-h3 font-semibold text-brand">{focusFeedback}</p>
          </div>
        ) : (
          <form onSubmit={add} className="flex flex-col gap-3 pt-3">
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب الخاطرة هنا واضغط Enter..."
              className="text-body py-3"
            />
            <Button type="submit" disabled={!text.trim()} className="w-full">
              احجز الفكرة
            </Button>
          </form>
        )
      ) : (
        <>
          <form onSubmit={add} className="flex gap-2 pt-2">
            <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب واضغط Enter" />
            <Button type="submit" disabled={!text.trim()} className="shrink-0">
              حفظ
            </Button>
          </form>

          {sent && (
            <p role="status" className="mt-3 rounded-xl bg-brand-soft text-brand px-4 py-2.5 text-ui">
              نُقلت إلى صندوق المهام في مصفوفة الأولويات.
            </p>
          )}

          {distractions.length === 0 ? (
            <p className="text-center text-ui text-ink-3 py-10">لا شيء مؤجل. ذهنك صافٍ.</p>
          ) : (
            <>
              <ul className="mt-5 divide-y divide-line border-y border-line max-h-72 overflow-y-auto">
                {distractions.map((thought, idx) => (
                  <li key={`${idx}-${thought}`} className="flex items-center gap-3 py-3">
                    <span className="flex-1 text-body text-ink">{thought}</span>
                    <button
                      type="button"
                      onClick={() => toInbox(idx, thought)}
                      title="انقلها إلى صندوق المهام"
                      aria-label="انقلها إلى صندوق المهام"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-brand hover:bg-brand-soft transition"
                    >
                      <Inbox className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDistraction(idx)}
                      aria-label="حذف"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-small text-ink-3">
                <span>{distractions.length} خاطرة مؤجلة</span>
                <button type="button" onClick={clearDistractions} className="hover:text-danger transition">
                  مسح الكل
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
};
