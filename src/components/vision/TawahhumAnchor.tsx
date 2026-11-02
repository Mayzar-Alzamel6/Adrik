"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { Map as MapIcon, Pause, Pencil, Play, RotateCcw, Target } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Label, ProgressRing, Textarea } from "@/components/ui/primitives";

interface TawahhumAnchorProps {
  onClose?: () => void;
  onStartFluencyTimer?: (mode: "FLUENCY_15" | "WORDS_25" | "WORK_90") => void;
}

const TOTAL = 60;
const STAGES = [
  { title: "المكان", prompt: "أغمض عينيك وتخيّل المكان الذي تقف فيه بعد أن وصلت: ما الذي تراه حولك؟ الضوء، والأشياء، ووجوه من معك." },
  { title: "الصوت والفعل", prompt: "اسمع صوتك وأنت تتحدث بثقة، وترى يديك تنجز ما كان صعباً عليك يوماً. لاحظ هدوءك وتمكّنك." },
  { title: "الشعور", prompt: "اشعر بطمأنينة من لم يضيّع عمره: أنك تحمّلت المسؤولية، وبدأت حين كان البدء ثقيلاً." },
];

/** 60-second guided visualization of the user's own vision, then straight into a focus session. */
export const TawahhumAnchor: React.FC<TawahhumAnchorProps> = ({ onClose, onStartFluencyTimer }) => {
  const { profile, updateProfile, values, getCurrentFrog } = useAppStore(
    useShallow((s) => ({
      profile: s.profile,
      updateProfile: s.updateProfile,
      values: s.values,
      getCurrentFrog: s.getCurrentFrog,
    }))
  );
  useAppStore((s) => s.frogs);
  const current = getCurrentFrog();
  const nextStep = current && !current.isCompleted ? current : undefined;
  const [editing, setEditing] = useState(!profile.vision);
  const [draft, setDraft] = useState(profile.vision ?? "");
  const [left, setLeft] = useState(TOTAL);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      return;
    }
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, left]);

  const elapsed = TOTAL - left;
  const stage = STAGES[Math.min(2, Math.floor(elapsed / 20))];
  const done = left === 0;

  if (editing) {
    return (
      <Card as="section" className="p-5 sm:p-8 max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            updateProfile({ vision: draft.trim() });
            setEditing(false);
          }}
          className="space-y-5"
        >
          <div>
            <h2 className="font-display text-title font-semibold text-ink">أين تريد أن تكون؟</h2>
            <p className="text-ink-2 mt-1">
              اكتب رؤيتك في جملة واحدة، بصيغة الحاضر كأنها تحققت. ستعود إليها كلما ثقل عليك البدء.
            </p>
          </div>
          <div>
            <Label htmlFor="vision">رؤيتي</Label>
            <Textarea
              id="vision"
              rows={3}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثال: أعمل في مجال أحبه، مستقل مالياً، وأتقن مهارتي حتى يُعتمد عليّ."
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!draft.trim()}>
              حفظ الرؤية
            </Button>
            {profile.vision && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                إلغاء
              </Button>
            )}
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
      <Card as="section" className="p-6 sm:p-8 bg-accent-soft/50 border-accent/20">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="accent">رؤيتك</Badge>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-small text-ink-2 hover:text-ink transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            تعديل
          </button>
        </div>
        <blockquote className="font-display text-title sm:text-title-lg leading-relaxed text-ink mt-4">«{profile.vision}»</blockquote>
        <p className="text-ui text-ink-2 mt-5">
          حين يثقل عليك البدء، لا تجلد ذاتك. خذ دقيقة، واستحضر المشهد كأنك فيه — ثم ابدأ فوراً.
        </p>
        {values.length > 0 && (
          <div className="mt-5 pt-4 border-t border-accent/20">
            <p className="text-caption text-ink-3">تُبنى عبر قيمك</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {values.map((v) => (
                <span key={v.id} className="h-7 px-2.5 rounded-full bg-surface/70 text-small text-ink inline-flex items-center">
                  {v.title}
                </span>
              ))}
            </div>
            <Link href="/app/vision" className="mt-3 inline-flex items-center gap-1.5 text-small font-medium text-brand hover:underline underline-offset-4">
              <MapIcon className="w-3.5 h-3.5" />
              من رؤيتك إلى أولوية اليوم
            </Link>
          </div>
        )}
      </Card>

      <Card as="section" className="p-6 sm:p-8 text-center">
        <div className="flex justify-center">
          <ProgressRing value={(elapsed / TOTAL) * 100} size={200} stroke={4}>
            <span className="font-display text-hero-sm text-ink tabular leading-none">{left}</span>
            <span className="text-small text-ink-3 mt-1">ثانية</span>
          </ProgressRing>
        </div>

        {done ? (
          <div className="mt-6 animate-rise-in">
            <p className="font-display text-title-sm font-semibold text-ink">الآن، حوّل المشهد إلى فعل.</p>
            {nextStep && (
              <p className="mt-2 text-ui text-ink-2 inline-flex items-center gap-1.5">
                <Target className="w-4 h-4 text-brand" />
                خطوتك التالية: <span className="text-ink font-medium">{nextStep.title}</span>
              </p>
            )}
            {onStartFluencyTimer && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => onStartFluencyTimer("WORDS_25")}>ابدأ جلسة 25 دقيقة</Button>
                <Button variant="secondary" onClick={() => onStartFluencyTimer("WORK_90")}>
                  جلسة عميقة 90 دقيقة
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 min-h-[112px] rounded-xl2 bg-surface-2 p-4 text-right">
              <p className="text-small font-medium text-accent-strong">
                {running || elapsed > 0 ? stage.title : "استعد"}
              </p>
              <p className="text-body text-ink leading-relaxed mt-1">
                {running || elapsed > 0 ? stage.prompt : "اجلس مستقيماً، وخذ نفساً عميقاً، ثم اضغط ابدأ وأغمض عينيك."}
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => setRunning((r) => !r)} className="min-w-[140px]">
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                {running ? "إيقاف مؤقت" : elapsed > 0 ? "متابعة" : "ابدأ"}
              </Button>
              {elapsed > 0 && (
                <Button
                  variant="ghost"
                  aria-label="إعادة"
                  onClick={() => {
                    setLeft(TOTAL);
                    setRunning(false);
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}
        {onClose && !done && (
          <button type="button" onClick={onClose} className="mt-4 text-ui text-ink-3 hover:text-ink transition">
            عودة للأدوات
          </button>
        )}
      </Card>
    </div>
  );
};
