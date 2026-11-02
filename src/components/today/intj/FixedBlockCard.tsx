"use client";

import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
} from "lucide-react";
import { useIntjProtocolStore } from "@/stores/useIntjProtocolStore";
import { PreflightContract } from "./PreflightContract";
import { RcaTriageModal } from "./RcaTriageModal";

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FixedBlockCard() {
  const {
    activeBlockId,
    blocks,
    setActiveBlock,
    startTimer,
    pauseTimer,
    resetTimer,
    tickTimer,
    completeBlock,
  } = useIntjProtocolStore();

  const [isRcaOpen, setIsRcaOpen] = useState(false);

  const block = blocks[activeBlockId] || blocks[1];

  // Live timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (block && block.status === "running") {
      interval = setInterval(() => {
        tickTimer(block.id);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [block?.status, block?.id, tickTimer]);

  const isRunning = block.status === "running";
  const isCompleted = block.status === "completed";
  const isFailed = block.status === "failed";

  return (
    <div className="space-y-6">
      {/* Block Selector Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((id) => {
          const b = blocks[id];
          const isSelected = activeBlockId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveBlock(id)}
              className={`p-3.5 rounded-xl2 border text-right transition flex flex-col justify-between ${
                isSelected
                  ? "border-accent bg-accent/5 ring-2 ring-accent/40 shadow-sm"
                  : "border-border bg-surface hover:bg-surface-raised"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display font-semibold text-small text-ink">
                  الكتلة {id}
                </span>
                {b.status === "completed" && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> مكتملة
                  </span>
                )}
                {b.status === "failed" && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> متعثرة
                  </span>
                )}
                {b.status === "running" && (
                  <span className="inline-flex items-center gap-1 text-xs text-accent-strong font-medium animate-pulse">
                    ⏱️ نشطة
                  </span>
                )}
              </div>
              <div className="text-ui text-ink-3 mt-1 text-xs">
                {b.title}
              </div>
              <div className="font-mono text-small font-semibold text-ink-2 mt-2">
                {b.defaultMinutes} دقيقة ثابتة
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Block Active Workspace */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <Target className="w-6 h-6 text-accent-strong" />
            <div>
              <h2 className="font-display font-bold text-heading-md text-ink">
                الكتلة {block.id}: {block.title}
              </h2>
              <p className="text-small text-ink-3">
                زمن ثابت صلب: {block.defaultMinutes} دقيقة — لا تمديد عشوائي بعد رنين المؤقت.
              </p>
            </div>
          </div>

          {/* Large Countdown Display */}
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-ink-3" />
            <div
              className={`font-mono text-4xl sm:text-5xl font-black tracking-wider ${
                isRunning
                  ? "text-accent-strong"
                  : isCompleted
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isFailed
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-ink"
              }`}
            >
              {formatMMSS(block.secondsRemaining)}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-surface-raised">
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                type="button"
                disabled={isCompleted}
                onClick={() => startTimer(block.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-body hover:bg-accent-hover transition shadow-sm disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                بدء الكتلة (Start Timer)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => pauseTimer(block.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-raised border border-border text-ink font-medium text-body hover:bg-surface transition shadow-sm"
              >
                <Pause className="w-4 h-4" />
                إيقاف مؤقت
              </button>
            )}

            <button
              type="button"
              onClick={() => resetTimer(block.id)}
              className="p-2.5 rounded-xl border border-border text-ink-3 hover:text-ink hover:bg-surface transition"
              title="إعادة ضبط المؤقت"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRcaOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 font-medium text-body transition"
            >
              <AlertTriangle className="w-4 h-4" />
              تعثرت الكتلة (RCA Triage)
            </button>

            <button
              type="button"
              onClick={() => completeBlock(block.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-body transition ${
                isCompleted
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? "تم الإغلاق بنجاح ✅" : "إغلاق تم بنجاح (DoD Met)"}
            </button>
          </div>
        </div>

        {/* Pre-flight Contract Input Fields */}
        <PreflightContract blockId={block.id} />
      </div>

      {/* 2-Min RCA Dialog */}
      <RcaTriageModal
        blockId={block.id}
        isOpen={isRcaOpen}
        onClose={() => setIsRcaOpen(false)}
      />
    </div>
  );
}
