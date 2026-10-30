import React from "react";
import { Check, Moon, Play, Sun, SunMedium } from "lucide-react";

/** Static, faithful rendering of the Today screen used as the hero visual. */
export function ProductPreview() {
  const r = 84;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative rounded-4xl border border-line bg-surface shadow-lift overflow-hidden" aria-hidden>
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-4 h-10 border-b border-line bg-surface-2/60">
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
        <span className="w-2.5 h-2.5 rounded-full bg-line" />
      </div>

      <div className="p-5 sm:p-7 bg-bg">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-caption text-ink-3">الأحد ٥ أكتوبر</p>
            <p className="font-display text-title font-semibold text-ink">صباح الخير، سارة</p>
          </div>
          <div className="inline-flex gap-1 p-1 rounded-xl bg-surface-2 border border-line text-caption">
            <span className="px-2.5 h-7 inline-flex items-center gap-1 text-ink-2"><SunMedium className="w-3.5 h-3.5" />الصباح</span>
            <span className="px-2.5 h-7 inline-flex items-center gap-1 rounded-lg bg-surface text-ink shadow-soft"><Sun className="w-3.5 h-3.5" />التركيز</span>
            <span className="px-2.5 h-7 inline-flex items-center gap-1 text-ink-2"><Moon className="w-3.5 h-3.5" />المساء</span>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-[1fr_170px] gap-4">
          <div className="rounded-xl2 border border-line bg-surface p-5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft text-brand px-2.5 py-0.5 text-micro font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              في جلسة تركيز
            </span>
            <p className="font-display text-lead font-semibold text-ink mt-3">كتابة الفصل الثالث من التقرير</p>
            <div className="relative w-[180px] h-[180px] mx-auto mt-4">
              <svg viewBox="0 0 180 180" className="-rotate-90 w-full h-full">
                <circle cx="90" cy="90" r={r} fill="none" strokeWidth="5" className="stroke-line" />
                <circle cx="90" cy="90" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.38} className="stroke-brand" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display tabular text-display-lg font-medium text-ink leading-none" dir="ltr">55:48</span>
                <span className="text-micro text-ink-3 mt-1.5">جلسة عميقة</span>
              </div>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-brand text-brand-ink text-small font-medium">
              <Play className="w-3.5 h-3.5 fill-current" />
              متابعة
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl2 border border-line bg-surface p-4">
              <p className="text-micro text-ink-3">وقت التركيز</p>
              <p className="font-display text-title text-ink tabular">2س 15د</p>
            </div>
            <div className="rounded-xl2 border border-line bg-surface p-4">
              <p className="text-micro text-accent-strong mb-1">مبدأ اليوم</p>
              <p className="text-small text-ink leading-relaxed">الفعل يسبق الشعور. ابدأ خطوة صغيرة.</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl2 border border-line bg-surface p-4 space-y-2.5">
          {[
            { t: "مراجعة ملاحظات العميل", done: true },
            { t: "كتابة الفصل الثالث من التقرير", now: true },
            { t: "ساعة تعلّم: أساسيات التحليل المالي" },
          ].map((row) => (
            <div key={row.t} className="flex items-center gap-3 text-small">
              <span
                className={
                  "w-5 h-5 rounded-full border-[1.5px] inline-flex items-center justify-center " +
                  (row.done ? "bg-brand border-brand text-brand-ink" : "border-ink-3/60")
                }
              >
                {row.done && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              <span className={row.done ? "text-ink-3 line-through flex-1" : "text-ink flex-1"}>{row.t}</span>
              {row.now && <span className="text-micro text-brand bg-brand-soft rounded-full px-2 py-0.5">الآن</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
