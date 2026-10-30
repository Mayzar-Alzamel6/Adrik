"use client";

import React from "react";
import { ShieldAlert, CheckCircle2, Ban } from "lucide-react";
import { useIntjProtocolStore } from "@/stores/useIntjProtocolStore";

interface PreflightContractProps {
  blockId: number;
}

export function PreflightContract({ blockId }: PreflightContractProps) {
  const { blocks, updateContract } = useIntjProtocolStore();
  const block = blocks[blockId];

  if (!block) return null;

  const isLocked = block.status === "completed";

  return (
    <div className="rounded-xl2 border border-border bg-surface p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-accent-strong" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-body text-ink">
            عقد ما قبل الانطلاق (Pre-flight Contract)
          </h3>
        </div>
        <span className="text-small text-ink-3">إلزامي قبل بدء المؤقت</span>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-small font-medium text-ink-2 mb-1.5">
            1. المخرج الملموس (Deliverable)
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={block.deliverable}
            onChange={(e) => updateContract(blockId, { deliverable: e.target.value })}
            placeholder="مثال: كتابة دالة معالجة الأخطاء واختبارها محلياً"
            className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-body text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none transition disabled:opacity-60"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-small font-medium text-ink-2 mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            2. شرط الإغلاق الثنائي (Done When — True/False)
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={block.doneWhen}
            onChange={(e) => updateContract(blockId, { doneWhen: e.target.value })}
            placeholder="مثال: الاختبار يجتاز بنجاح دون أي خطأ (معيار حاسم ينتهي به العمل)"
            className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-body text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none transition disabled:opacity-60"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-small font-medium text-ink-2 mb-1.5">
            <Ban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            3. حظر التشعب الصريح (Out of Scope — ما تمنع نفسك منه الآن)
          </label>
          <input
            type="text"
            disabled={isLocked}
            value={block.outOfScope}
            onChange={(e) => updateContract(blockId, { outOfScope: e.target.value })}
            placeholder="مثال: لن أعيد تصميم المكونات المجاورة ولن أغرق في قراءة التوثيق العام"
            className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-body text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none transition disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
