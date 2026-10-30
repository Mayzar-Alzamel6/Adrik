"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Trash2, Lightbulb } from "lucide-react";
import { useIntjProtocolStore } from "@/stores/useIntjProtocolStore";

export function ParkingLotSection() {
  const { parkingLot, addParkingLotItem, removeParkingLotItem } = useIntjProtocolStore();
  const [text, setText] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addParkingLotItem(text);
    setText("");
  };

  return (
    <div className="rounded-xl2 border border-border bg-surface p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-body text-ink">
            سلة الأفكار المؤجلة (Rabbit Hole Parking Lot)
          </h3>
        </div>
        <span className="text-small text-ink-3">أفرغ ذهنك دون أن تتوقف</span>
      </div>

      <p className="text-small text-ink-3">
        أي فكرة عبقرية، بحث جانبي، أو تحسين معماري يقفز لذهنك أثناء الكتلة: اكتبه هنا فوراً بالضغط على Enter واستمر في إنجاز العقد.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب الفكرة أو التفرع الجانبي هنا..."
          className="flex-1 rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-body text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none transition"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-raised border border-border hover:border-accent text-body text-ink font-medium transition"
        >
          <Plus className="w-4 h-4 text-accent-strong" />
          إيداع
        </button>
      </form>

      {parkingLot.length === 0 ? (
        <div className="text-center py-4 text-small text-ink-4 border border-dashed border-border rounded-xl">
          لا توجد أفكار مركونة حالياً. ذهنك مفرّغ ومركز على العقد.
        </div>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {parkingLot.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/80 bg-surface-raised/60 hover:bg-surface-raised transition text-body text-ink"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">{item.text}</span>
              </div>
              <button
                type="button"
                onClick={() => removeParkingLotItem(item.id)}
                className="p-1 rounded text-ink-4 hover:text-rose-500 transition shrink-0"
                title="حذف الفكرة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
