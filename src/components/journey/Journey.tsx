"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Lock, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { useJourney, type StageStatus } from "@/lib/journey";
import { getTool } from "@/lib/tools";
import { deliverFounderTemplate } from "@/lib/founderTemplate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, IconTile } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

/**
 * Lives in the app shell: settles the mode for people who used the app before stages existed,
 * opens stages in order as their conditions are met, announces each newly opened stage once,
 * and hands over the founder template's projects and skills as their stages open.
 */
export function JourneyWatcher() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const { mode, stages, isToolOpen } = useJourney();
  const announced = useJourneyStore((s) => s.announced);
  const hasPendingTemplate = useJourneyStore((s) => s.pendingTemplate !== null);
  const templateDelivered = useJourneyStore((s) => s.templateDelivered);
  const projectsOpen = isToolOpen("projects");
  const skillsOpen = isToolOpen("meta");
  const { setMode, unlock, markAnnounced } = useJourneyStore.getState();

  useEffect(() => {
    if (onboardingDone && mode === null) setMode("open");
  }, [onboardingDone, mode, setMode]);

  useEffect(() => {
    if (mode !== "guided") return;
    // In order only: a stage never opens before the one it builds on.
    for (let i = 1; i < stages.length; i++) {
      const s = stages[i];
      if (s.unlocked) continue;
      if (stages[i - 1].unlocked && s.ready) unlock(s.id);
      break;
    }
  }, [mode, stages, unlock]);

  useEffect(() => {
    if (onboardingDone && hasPendingTemplate) deliverFounderTemplate({ projects: projectsOpen, skills: skillsOpen });
  }, [onboardingDone, hasPendingTemplate, projectsOpen, skillsOpen]);

  const toAnnounce = mode === "guided" ? stages.find((s) => s.unlocked && !announced.includes(s.id)) : undefined;

  return (
    <Sheet
      open={Boolean(toAnnounce)}
      onClose={() => toAnnounce && markAnnounced(toAnnounce.id)}
      title={toAnnounce ? `فُتحت مرحلة «${toAnnounce.title}»` : undefined}
      description="بنيت الأساس الذي تحتاجه هذه المرحلة. خذ منها ما ينفعك الآن، والباقي ينتظرك."
      size="sm"
    >
      {toAnnounce && (
        <StageUnlocked stage={toAnnounce} fromTemplate={templateDelivered[toAnnounce.id]} onDone={() => markAnnounced(toAnnounce.id)} />
      )}
    </Sheet>
  );
}

const TEMPLATE_NOTE: Partial<Record<StageStatus["id"], (n: number) => string>> = {
  projects: (n) => `ومعها ${n === 1 ? "مشروع" : n === 2 ? "مشروعان" : `${n} مشاريع`} من المثال الكامل، مربوطة بقيمه، في إدارة المشاريع. عدّلها أو احذفها لتصير مشاريعك.`,
  skills: (n) => `ومعها ${n === 1 ? "مهارة" : n === 2 ? "مهارتان" : `${n} مهارات`} من المثال الكامل، مربوطة بمشاريعه.`,
};

function StageUnlocked({ stage, fromTemplate, onDone }: { stage: StageStatus; fromTemplate?: number; onDone: () => void }) {
  const router = useRouter();
  const first = stage.features[0]?.href ?? (stage.tools[0] ? `/app/tools/${stage.tools[0]}` : "/app");
  return (
    <div className="space-y-5 pt-2">
      <div className="rounded-xl2 bg-accent-soft/70 p-4 flex items-start gap-3">
        <IconTile icon={stage.icon} tone="accent" />
        <p className="text-body text-ink leading-relaxed">{stage.promise}</p>
      </div>
      {fromTemplate && TEMPLATE_NOTE[stage.id] ? (
        <p className="text-ui text-ink-2 leading-relaxed">{TEMPLATE_NOTE[stage.id]!(fromTemplate)}</p>
      ) : null}
      <ul className="space-y-2">
        {[...stage.features.map((f) => f.label), ...stage.tools.map((t) => getTool(t)?.title ?? t)].map((label) => (
          <li key={label} className="flex items-center gap-2 text-ui text-ink">
            <Sparkles className="w-4 h-4 text-accent-strong shrink-0" />
            {label}
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          لاحقاً
        </Button>
        <Button
          onClick={() => {
            onDone();
            router.push(first);
          }}
        >
          افتحها الآن
        </Button>
      </div>
    </div>
  );
}

/** Opening a stage by hand needs no announcement: the user already knows. */
function openNow(id: StageStatus["id"]) {
  const { unlock, markAnnounced } = useJourneyStore.getState();
  markAnnounced(id);
  unlock(id);
}

function CriteriaList({ stage }: { stage: StageStatus }) {
  return (
    <ul className="space-y-2">
      {stage.criteria.map((c) => (
        <li key={c.label} className="flex items-center gap-2.5 text-ui">
          <span
            className={cn(
              "w-5 h-5 rounded-full shrink-0 inline-flex items-center justify-center",
              c.met ? "bg-brand text-brand-ink" : "border border-line-strong"
            )}
          >
            {c.met && <Check className="w-3 h-3" strokeWidth={3} />}
          </span>
          <span className={cn("flex-1", c.met ? "text-ink-3 line-through decoration-ink-3/40" : "text-ink")}>{c.label}</span>
          <span className="text-caption text-ink-3 tabular">
            {c.current} / {c.target}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Today-sidebar card: where the user is in the journey and what opens next. Hidden once everything is open. */
export function JourneyCard() {
  const { guided, stages, next } = useJourney();
  if (!guided || !next) return null;
  const doneCount = stages.filter((s) => s.unlocked).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-3">رحلة البناء</p>
        <span className="text-caption text-ink-3 tabular">
          {doneCount} من {stages.length}
        </span>
      </div>
      <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} aria-hidden>
        {stages.map((s) => (
          <span key={s.id} className={cn("h-1.5 rounded-full", s.unlocked ? "bg-brand" : s.id === next.id ? "bg-accent/60" : "bg-line")} />
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3">
        <IconTile icon={next.icon} tone="accent" size="sm" />
        <div className="min-w-0">
          <p className="text-body font-medium text-ink">التالي: {next.title}</p>
          <p className="text-small text-ink-2 mt-0.5 leading-relaxed">{next.promise}</p>
        </div>
      </div>
      <div className="mt-4">
        <CriteriaList stage={next} />
      </div>
      <button
        type="button"
        onClick={() => openNow(next.id)}
        className="mt-4 text-small font-medium text-ink-3 hover:text-brand underline-offset-4 hover:underline"
      >
        لا أريد الانتظار، افتحها الآن
      </button>
    </Card>
  );
}

/** Shown in place of a tool or screen whose stage hasn't opened yet. Never a wall: one tap opens it. */
export function StageGate({ stage, what }: { stage: StageStatus; what: string }) {
  return (
    <Card className="p-6 sm:p-8 max-w-xl">
      <div className="flex items-center gap-3">
        <IconTile icon={Lock} tone="neutral" />
        <div>
          <p className="text-caption font-medium text-accent-strong">مرحلة «{stage.title}»</p>
          <p className="font-display text-title-sm font-semibold text-ink">{what} تنتظرك</p>
        </div>
      </div>
      <p className="text-body text-ink-2 mt-4 leading-relaxed">
        نبني النظام طبقة بعد طبقة حتى لا يثقل عليك. {stage.promise}
      </p>
      <p className="text-small text-ink-3 mt-2">هذا ليس قفل اشتراك: المرحلة تُفتح باستعمالك للتطبيق، أو الآن بزر واحد.</p>
      {stage.criteria.length > 0 && (
        <div className="mt-5 rounded-xl2 border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ui font-medium text-ink">تُفتح تلقائياً حين تُكمل:</p>
            <span className="text-caption text-ink-3 tabular">{stage.progress}%</span>
          </div>
          <CriteriaList stage={stage} />
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/app" className="inline-flex items-center gap-1 text-ui font-medium text-brand hover:underline underline-offset-4">
          عُد إلى يومك
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <Button variant="secondary" size="sm" onClick={() => openNow(stage.id)}>
          افتحها الآن على أي حال
        </Button>
      </div>
    </Card>
  );
}
