"use client";

import React from "react";
import { ShieldCheck, RotateCcw, FileText, CheckCircle2 } from "lucide-react";
import { FixedBlockCard } from "./FixedBlockCard";
import { ParkingLotSection } from "./ParkingLotSection";
import { useIntjProtocolStore } from "@/stores/useIntjProtocolStore";

export function IntjProtocolStation() {
  const { blocks, resetDay } = useIntjProtocolStore();

  const completedCount = Object.values(blocks).filter((b) => b.status === "completed").length;
  const failedCount = Object.values(blocks).filter((b) => b.status === "failed").length;

  return (
    <div className="space-y-6 animate-rise-in">
      {/* Protocol Banner */}
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent text-white shadow-sm">
            <ShieldCheck className="w-6 h-6" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-heading-md text-ink">
                نظام التشغيل السلوكي: بروتوكول INTJ-A
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-strong border border-accent/20">
                Active Protocol
              </span>
            </div>
            <p className="text-small text-ink-2 mt-0.5">
              3 كتل ثابتة · عقد إغلاق ثنائي لا يقبل التأويل · تشخيص أعطال RCA في دقيقتين دون جلد ذات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-xl border border-border shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-small font-medium text-ink">
              المغلق اليوم: {completedCount} / 3
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm("هل تريد تصفير كتل اليوم وإعادة تهيئتها للبدء من جديد؟")) {
                resetDay();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-small text-ink-3 hover:text-ink transition"
            title="تصفير كتل اليوم"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تصفير اليوم
          </button>
        </div>
      </div>

      {/* Main Grid: Blocks Execution on Left, Parking Lot on Right */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-6 min-w-0">
          <FixedBlockCard />
        </div>

        <div className="space-y-6">
          <ParkingLotSection />

          {/* Quick Rules Cheatsheet Card */}
          <div className="rounded-xl2 border border-border bg-surface p-5 space-y-3 shadow-sm text-small text-ink-2">
            <h4 className="font-semibold text-body text-ink flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-accent-strong" />
              تذكير القواعد الذهبية:
            </h4>
            <ul className="space-y-2 list-disc list-inside text-ink-3">
              <li>المؤقت صلب ولا يتم تمديده عشوائياً بعد رنينه.</li>
              <li>شرط الإغلاق ثنائي (True/False)؛ ينتهي العمل فور تحققه.</li>
              <li>أي تفرع جانبي يوضع فوراً في سلة الأفكار بالأعلى.</li>
              <li>التعثر عطل (Bug) في الخطة، يُعالج بـ Patch دون لوم النفس.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
