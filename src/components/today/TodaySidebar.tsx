"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { ChevronLeft, Flame, Hourglass, RefreshCw, Timer, Trophy, Wind } from "lucide-react";
import { useAppStore, HIMMA_VERSES } from "@/stores/useAppStore";
import { useVaultStore } from "@/stores/useVaultStore";
import { toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, IconTile, Input, Label } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { JourneyCard } from "@/components/journey/Journey";
import { HabitsTodayCard } from "@/components/habits/HabitsTodayCard";

const PRINCIPLES = [
  { text: "الفعل يسبق الشعور. ابدأ خطوة صغيرة، وسيلحق بك المزاج.", source: "مبدأ اليوم" },
  { text: "التعثّر ثقب في الطريق، لا سقوط. العودة الفورية هي كل شيء.", source: "مبدأ اليوم" },
  { text: "حدّد الأوقات لا الأعمال. جلسة واحدة محمية تكفي لتحريك اليوم.", source: "مبدأ اليوم" },
  { text: "القليل الدائم يغلب الكثير المنقطع.", source: "مبدأ اليوم" },
];

export function TodaySidebar() {
  const {
    timeEntries,
    completedDeepWorkSessions,
    focusStreak,
    bestFocusStreak,
    logEscapeMinutes,
    settings,
    himmaIndex,
    nextHimmaVerse,
  } = useAppStore(
    useShallow((s) => ({
      timeEntries: s.timeEntries,
      completedDeepWorkSessions: s.completedDeepWorkSessions,
      focusStreak: s.focusStreak,
      bestFocusStreak: s.bestFocusStreak,
      logEscapeMinutes: s.logEscapeMinutes,
      settings: s.settings,
      himmaIndex: s.himmaIndex,
      nextHimmaVerse: s.nextHimmaVerse,
    }))
  );
  const vaultItems = useVaultStore((s) => s.vaultItems);
  const [logOpen, setLogOpen] = useState(false);
  const [mins, setMins] = useState(20);
  const [note, setNote] = useState("");

  const today = toLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDateString(yesterdayDate);
  const focusOn = (day: string) =>
    timeEntries
      .filter((t) => t.category !== "ESCAPE" && toLocalDateString(new Date(t.startTime)) === day)
      .reduce((a, t) => a + t.durationMinutes, 0);
  const todays = timeEntries.filter((t) => toLocalDateString(new Date(t.startTime)) === today);
  const focusMin = focusOn(today);
  const yesterdayMin = focusOn(yesterday);
  const escapeMin = todays.filter((t) => t.category === "ESCAPE").reduce((a, t) => a + t.durationMinutes, 0);
  const challengeTarget = yesterdayMin > 0 ? yesterdayMin + 1 : 25;
  const challengeProgress = Math.min(100, Math.round((focusMin / challengeTarget) * 100));
  const challengeWon = focusMin >= challengeTarget;
  const activeVault = vaultItems.filter((v) => !v.isResolved).length;

  const dayIndex = new Date().getDate();
  const principle = PRINCIPLES[dayIndex % PRINCIPLES.length];
  const verse = HIMMA_VERSES[himmaIndex % HIMMA_VERSES.length];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mins > 0) logEscapeMinutes(mins, note.trim() || undefined);
    setNote("");
    setLogOpen(false);
  };

  return (
    <div className="space-y-4">
      <JourneyCard />
      <HabitsTodayCard />

      {/* Stats */}
      <Card className="p-5">
        <p className="text-small text-ink-3 mb-4">حصيلة اليوم</p>
        <div className="grid grid-cols-2 gap-4">
          <Stat icon={Timer} label="وقت التركيز" value={formatMinutes(focusMin)} tone="brand" />
          <Stat icon={Hourglass} label="وقت مشتّت" value={formatMinutes(escapeMin)} tone="danger" />
        </div>
        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between gap-2">
          <span className="text-small text-ink-2">
            جلسات كاملة اليوم: <span className="font-semibold text-ink tabular">{completedDeepWorkSessions}</span>
          </span>
          <Button size="sm" variant="quiet" onClick={() => setLogOpen(true)}>
            تسجيل وقت مشتّت
          </Button>
        </div>
      </Card>

      {/* Daily challenge + streak */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-small text-ink-3">تحدّي اليوم</p>
          {challengeWon && (
            <span className="text-caption font-medium text-brand inline-flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              تجاوزته
            </span>
          )}
        </div>
        <p className="text-body text-ink mt-2 leading-relaxed">
          {yesterdayMin > 0 ? (
            <>
              تجاوز تركيز أمس: <span className="font-semibold tabular">{formatMinutes(yesterdayMin)}</span>
            </>
          ) : (
            "أكمل 25 دقيقة تركيز على الأقل"
          )}
        </p>
        <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={challengeWon ? "h-full rounded-full bg-brand transition-all duration-500" : "h-full rounded-full bg-accent transition-all duration-500"}
            style={{ width: `${challengeProgress}%` }}
          />
        </div>
        <p className="text-caption text-ink-3 mt-1.5 tabular">
          {formatMinutes(focusMin)} من {formatMinutes(challengeTarget)}
        </p>
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-4">
          <div>
            <Flame className="w-4 h-4 text-accent-strong" strokeWidth={1.8} />
            <p className="font-display text-title-lg font-medium text-ink mt-1.5 tabular leading-none">{focusStreak}</p>
            <p className="text-caption text-ink-2 mt-1">سلسلة الجلسات الكاملة</p>
          </div>
          <div>
            <Trophy className="w-4 h-4 text-accent-strong" strokeWidth={1.8} />
            <p className="font-display text-title-lg font-medium text-ink mt-1.5 tabular leading-none">{bestFocusStreak}</p>
            <p className="text-caption text-ink-2 mt-1">رقمك القياسي</p>
          </div>
        </div>
      </Card>

      {/* Anchor: verse (optional) or daily principle */}
      {settings.faithContent ? (
        <Card className="p-5 bg-accent-soft/60 border-accent/20 relative overflow-hidden">
          <p className="text-caption font-medium text-accent-strong mb-3">وقفة</p>
          <p className="font-display text-subtitle leading-[2] text-ink">﴿{verse.verse}﴾</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-caption text-ink-3">{verse.source}</span>
            <button
              type="button"
              onClick={nextHimmaVerse}
              aria-label="آية أخرى"
              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-accent-strong hover:bg-surface transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-caption font-medium text-accent-strong mb-2">{principle.source}</p>
          <p className="font-display text-subtitle leading-relaxed text-ink">{principle.text}</p>
        </Card>
      )}

      {/* Impulse delay shortcut */}
      <Link href="/app/tools/vault" className="block group">
        <Card className="p-4 flex items-center gap-3 transition group-hover:shadow-lift">
          <IconTile icon={Wind} tone="neutral" />
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium text-ink">رغبة مفاجئة؟</p>
            <p className="text-small text-ink-2">
              {activeVault > 0 ? `${activeVault} رغبة مؤجلة الآن` : "أجّلها بدل أن تقاومها."}
            </p>
          </div>
          <ChevronLeft className="w-4 h-4 text-ink-3 group-hover:text-ink transition" />
        </Card>
      </Link>

      <Sheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="تسجيل وقت مشتّت"
        description="بلا لوم. الرقم الصادق هو ما يصنع مراجعة أسبوعية مفيدة."
        size="sm"
      >
        <form onSubmit={submit} className="space-y-5 pt-2">
          <div>
            <Label>كم دقيقة تقريباً؟</Label>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMins(m)}
                  className={
                    "h-10 px-4 rounded-xl border text-ui tabular transition " +
                    (mins === m ? "bg-ink text-bg border-ink" : "border-line text-ink-2 hover:border-ink-3")
                  }
                >
                  {m} د
                </button>
              ))}
              <Input
                type="number"
                min={1}
                max={600}
                value={mins}
                onChange={(e) => setMins(Number(e.target.value))}
                className="w-24 h-10"
                aria-label="عدد الدقائق"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="escape-note" hint="اختياري">
              فيمَ ذهب؟
            </Label>
            <Input id="escape-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تصفّح الجوال" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLogOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">تسجيل</Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  tone: "brand" | "danger";
}) {
  return (
    <div>
      <Icon className={tone === "brand" ? "w-4 h-4 text-brand" : "w-4 h-4 text-danger"} strokeWidth={1.8} />
      <p className="font-display text-heading font-medium text-ink mt-2 tabular leading-none">{value}</p>
      <p className="text-small text-ink-2 mt-1.5">{label}</p>
    </div>
  );
}

function formatMinutes(total: number) {
  if (total < 60) return `${total} د`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}س ${m}د` : `${h} س`;
}
