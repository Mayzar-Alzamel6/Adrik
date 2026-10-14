"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Compass, Moon, PenLine, Sparkles } from "lucide-react";
import { HABIT_COMMITMENT_DAYS, HABIT_GRACE_HOURS } from "@/lib/habits";
import { FOUNDER_EXAMPLE } from "@/data/founder-example";
import { startFromFounderTemplate } from "@/lib/founderTemplate";
import {
  FAITH_VALUE_TEMPLATE,
  FOCUS_AREAS,
  FOCUS_SUGGESTIONS,
  MAX_STARTER_HABITS,
  customValue,
  VALUE_TEMPLATES,
  starterHabitOptions,
  useAppStore,
  type FocusAreaId,
} from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shell/Logo";
import { useHydrated, useThemeClass } from "@/components/shell/useHydrated";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/primitives";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { useJourneyStore } from "@/stores/useJourneyStore";

type StepId = "start" | "about" | "faith" | "values" | "habits" | "today";
const STEP_LABELS: Record<StepId, string> = {
  start: "البداية",
  about: "عنك",
  faith: "الطابع",
  values: "قيمك",
  habits: "عاداتك",
  today: "اليوم",
};
// The founder template brings its values, so that path skips choosing them.
const STEPS_SCRATCH: StepId[] = ["start", "about", "faith", "values", "habits", "today"];
const STEPS_FOUNDER: StepId[] = ["start", "about", "faith", "habits", "today"];
type StartMode = "founder" | "scratch";

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  useThemeClass();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<StartMode | null>(null);
  const STEPS = mode === "founder" ? STEPS_FOUNDER : STEPS_SCRATCH;
  const current = STEPS[step];

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("template") === "founder") setMode("founder");
  }, []);
  const [name, setName] = useState("");
  const [focusArea, setFocusArea] = useState<FocusAreaId | null>(null);
  const [faith, setFaith] = useState<boolean | null>(null);
  const [valueIds, setValueIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [ownValue, setOwnValue] = useState({ title: "", definition: "" });
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");

  useEffect(() => {
    if (hydrated && onboardingDone) router.replace("/app");
  }, [hydrated, onboardingDone, router]);

  // The focus answer shapes what comes next: its values and habit are suggested first, and its example fills the first priority.
  const suggested = focusArea ? FOCUS_SUGGESTIONS[focusArea] : null;
  const isSuggested = (id: string) => Boolean(suggested?.valueIds.includes(id) || suggested?.habitId === id);
  const rank = (id: string) => suggested?.valueIds.indexOf(id) ?? -1;
  const firstSuggested = <T extends { id: string }>(list: T[]) => [
    ...list.filter((x) => isSuggested(x.id)).sort((a, b) => rank(a.id) - rank(b.id)),
    ...list.filter((x) => !isSuggested(x.id)),
  ];
  const valuePool = faith ? [FAITH_VALUE_TEMPLATE, ...firstSuggested(VALUE_TEMPLATES)] : firstSuggested(VALUE_TEMPLATES);
  const hasOwnValue = ownValue.title.trim().length > 0;
  const valueCount = valueIds.length + (hasOwnValue ? 1 : 0);
  const habitPool = firstSuggested(starterHabitOptions(Boolean(faith)));
  // Picks made before switching faith content off can't carry faith habits along.
  const pickedHabits = habitIds.filter((id) => habitPool.some((h) => h.id === id));
  const habitCount = pickedHabits.length + (customHabit.trim() ? 1 : 0);

  const canNext =
    (current === "start" && mode !== null) ||
    (current === "about" && name.trim().length > 0 && focusArea !== null) ||
    (current === "faith" && faith !== null) ||
    (current === "values" && valueCount > 0 && valueCount <= 3) ||
    (current === "habits" && habitCount <= MAX_STARTER_HABITS) ||
    (current === "today" && priorities.some((p) => p.trim()));

  const next = () => {
    if (!canNext) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    useJourneyStore.getState().startGuided();
    const habits = { ids: pickedHabits, custom: customHabit.trim() ? [customHabit] : [] };
    if (mode === "founder") {
      startFromFounderTemplate({ name, focusArea, faithContent: Boolean(faith), priorities, habits });
    } else {
      const customValues = hasOwnValue ? [customValue(ownValue.title, ownValue.definition)] : [];
      completeOnboarding({ name, focusArea, valueIds, customValues, priorities, faithContent: Boolean(faith), habits });
    }
    router.push("/app");
  };

  const toggleValue = (id: string) =>
    setValueIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : valueCount >= 3 ? prev : [...prev, id]
    );
  const toggleHabit = (id: string) =>
    setHabitIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : habitCount >= MAX_STARTER_HABITS ? prev : [...pickedHabits, id]
    );

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between max-w-2xl w-full mx-auto px-5 pt-6">
        <Logo />
        <span className="text-small text-ink-3 tabular">
          الخطوة {step + 1} من {STEPS.length}
        </span>
      </header>

      <div className="max-w-2xl w-full mx-auto px-5 mt-6">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }} aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} title={STEP_LABELS[s]} className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-line")} />
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-10 sm:py-14">
        <form
          key={step}
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="animate-rise-in"
        >
          {current === "start" && (
            <Step
              title="أهلاً بك. كيف تحب أن تبدأ؟"
              description="كل مهمة في يومك ترتبط بمهارة، والمهارة بمشروع، والمشروع بقيمة تؤمن بها. ابدأ من مثال جاهز أو ابنِ سلسلتك بنفسك."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <ChoiceCard selected={mode === "founder"} onClick={() => setMode("founder")} tall>
                  <Compass className="w-5 h-5 text-accent-strong mb-3" strokeWidth={1.8} />
                  <span className="block font-semibold text-ink">ابدأ من مثال كامل</span>
                  <span className="block text-ui text-ink-2 mt-1 font-normal leading-relaxed">
                    قيمه ({FOUNDER_EXAMPLE.values.length}) من اليوم الأول، ثم تصلك مشاريعه ({FOUNDER_EXAMPLE.projects.length}) ومهاراته (
                    {FOUNDER_EXAMPLE.skills.length}) مربوطة ببعضها مع فتح كل مرحلة. نسخة لك تعدّلها كما تشاء.
                  </span>
                </ChoiceCard>
                <ChoiceCard selected={mode === "scratch"} onClick={() => setMode("scratch")} tall>
                  <PenLine className="w-5 h-5 text-brand mb-3" strokeWidth={1.8} />
                  <span className="block font-semibold text-ink">ابدأ من الصفر</span>
                  <span className="block text-ui text-ink-2 mt-1 font-normal leading-relaxed">
                    تختار قيمك وأولويات يومك الأول بنفسك، خطوة بخطوة.
                  </span>
                </ChoiceCard>
              </div>
              <Link href="/founder" className="inline-block mt-4 text-ui font-medium text-brand hover:underline underline-offset-4">
                شاهد المثال كاملاً قبل أن تختار
              </Link>
            </Step>
          )}

          {current === "about" && (
            <Step title="لنجهّز نظامك في دقيقتين." description="نبدأ بالأساسيات: بماذا نناديك، وأين تريد أن تُحدث الفرق؟">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="ob-name">اسمك</Label>
                  <Input id="ob-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الأول يكفي" />
                </div>
                <div>
                  <Label>أين تحتاج التركيز أكثر الآن؟</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {FOCUS_AREAS.map((a) => (
                      <ChoiceCard key={a.id} selected={focusArea === a.id} onClick={() => setFocusArea(a.id)}>
                        {a.label}
                      </ChoiceCard>
                    ))}
                  </div>
                </div>
              </div>
            </Step>
          )}

          {current === "faith" && (
            <Step
              title="هل تريد لمسة إيمانية في يومك؟"
              description="يمكنك تغيير هذا في أي وقت من الإعدادات."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <ChoiceCard selected={faith === true} onClick={() => setFaith(true)} tall>
                  <Moon className="w-5 h-5 text-accent-strong mb-3" strokeWidth={1.8} />
                  <span className="block font-semibold text-ink">نعم، أضِفها</span>
                  <span className="block text-ui text-ink-2 mt-1 font-normal">
                    آية يومية للتثبيت، والتاريخ الهجري، وعادات الصلاة والورد.
                  </span>
                </ChoiceCard>
                <ChoiceCard selected={faith === false} onClick={() => setFaith(false)} tall>
                  <Sparkles className="w-5 h-5 text-brand mb-3" strokeWidth={1.8} />
                  <span className="block font-semibold text-ink">ليس الآن</span>
                  <span className="block text-ui text-ink-2 mt-1 font-normal">
                    مبدأ يومي قصير في الإنتاجية والتعافي بدلاً من ذلك.
                  </span>
                </ChoiceCard>
              </div>
            </Step>
          )}

          {current === "values" && (
            <Step
              title="اختر ثلاث قيم تحكم قراراتك"
              description="حين يتعارض الواجب مع الرغبة، هذه القيم هي من تحسم. يمكنك تعديلها لاحقاً في دستور القيم."
            >
              <div className="grid sm:grid-cols-2 gap-2">
                {valuePool.map((v) => {
                  const selected = valueIds.includes(v.id);
                  const disabled = !selected && valueCount >= 3;
                  return (
                    <ChoiceCard key={v.id} selected={selected} disabled={disabled} onClick={() => toggleValue(v.id)} tall>
                      {isSuggested(v.id) && <span className="block text-caption font-medium text-accent-strong mb-0.5">مقترحة لك</span>}
                      <span className="block font-semibold text-ink">{v.title}</span>
                      <span className="block text-small text-ink-2 mt-1 font-normal leading-relaxed">{v.definition}</span>
                    </ChoiceCard>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl2 border border-dashed border-line-strong p-4 space-y-2">
                <Label htmlFor="ob-own-value">أو اكتب قيمة لا تجدها هنا</Label>
                <Input
                  id="ob-own-value"
                  value={ownValue.title}
                  onChange={(e) => setOwnValue({ ...ownValue, title: e.target.value })}
                  disabled={!hasOwnValue && valueCount >= 3}
                  placeholder="مثال: خدمة الناس"
                  maxLength={60}
                />
                {hasOwnValue && (
                  <Input
                    aria-label="معناها لك"
                    value={ownValue.definition}
                    onChange={(e) => setOwnValue({ ...ownValue, definition: e.target.value })}
                    placeholder="ماذا تعني لك في سطر؟ (اختياري)"
                    maxLength={140}
                  />
                )}
              </div>
              <p className="text-small text-ink-3 mt-3 tabular">اخترت {valueCount} من 3</p>
            </Step>
          )}

          {current === "habits" && (
            <Step
              title="عادة أو اثنتان، لا أكثر"
              description={`كل عادة تختارها التزام لـ${HABIT_COMMITMENT_DAYS} يوماً: لا تعديل ولا حذف قبلها، وأول ${HABIT_GRACE_HOURS} ساعة مفتوحة لتصحيح الخطأ. ابدأ صغيراً.`}
            >
              <div className="grid sm:grid-cols-2 gap-2">
                {habitPool.map((h) => {
                  const selected = pickedHabits.includes(h.id);
                  return (
                    <ChoiceCard
                      key={h.id}
                      selected={selected}
                      disabled={!selected && habitCount >= MAX_STARTER_HABITS}
                      onClick={() => toggleHabit(h.id)}
                    >
                      <span className="pl-7">
                        {h.title}
                        {isSuggested(h.id) && <span className="text-caption font-medium text-accent-strong"> · مقترحة لك</span>}
                      </span>
                    </ChoiceCard>
                  );
                })}
              </div>
              <div className="mt-4">
                <Label htmlFor="ob-habit">أو اكتب عادتك</Label>
                <Input
                  id="ob-habit"
                  value={customHabit}
                  onChange={(e) => setCustomHabit(e.target.value)}
                  disabled={!customHabit.trim() && habitCount >= MAX_STARTER_HABITS}
                  placeholder="مثال: قراءة 10 صفحات بعد الفجر"
                  maxLength={80}
                />
              </div>
              <p className="text-small text-ink-3 mt-3">
                <span className="tabular">
                  اخترت {habitCount} من {MAX_STARTER_HABITS}.
                </span>{" "}
                {habitCount === 0 && "يمكنك أن تبدأ بلا عادة وتضيفها لاحقاً من أداة العادات."}
              </p>
            </Step>
          )}

          {current === "today" && (
            <Step
              title="ما أهم ثلاثة أشياء تنجزها اليوم؟"
              description={
                mode === "founder"
                  ? "أولويات كبرى فقط، لا قائمة مهام. الأمثلة في الخانات من يوم في المثال، أما أولوياتك فتكتبها أنت."
                  : "أولويات كبرى فقط، لا قائمة مهام. إن أنجزتها وحدها فقد كان يوماً ناجحاً."
              }
            >
              <div className="space-y-2.5">
                {priorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full bg-surface-2 border border-line text-ui font-semibold text-ink-2 tabular">
                      {i + 1}
                    </span>
                    <Input
                      autoFocus={i === 0}
                      value={p}
                      onChange={(e) => setPriorities((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={
                        mode === "founder" && FOUNDER_EXAMPLE.frogs[i]
                          ? `مثال: ${FOUNDER_EXAMPLE.frogs[i].title}`
                          : i === 0
                          ? suggested?.priority ?? "الأهم أولاً — ما يصعب تأجيله"
                          : i === 1
                          ? "الأولوية الثانية"
                          : "الثالثة (اختياري)"
                      }
                      aria-label={`الأولوية ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </Step>
          )}

          <div className="mt-10 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                رجوع
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="lg" disabled={!canNext} className="min-w-[160px]">
              {step === STEPS.length - 1 ? "ابدأ يومك" : "التالي"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {current === "start" && (
          <details className="mt-12 rounded-xl2 border border-line bg-surface p-5">
            <summary className="cursor-pointer text-body font-medium text-ink">لديك بيانات سابقة؟ استوردها بدل البدء من الصفر</summary>
            <div className="mt-4">
              <BackupPanel allowExport={false} />
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function Step({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink leading-snug">{title}</h1>
      <p className="text-lead text-ink-2 mt-2 mb-8 max-w-lg">{description}</p>
      {children}
    </div>
  );
}

function ChoiceCard({
  selected,
  disabled,
  onClick,
  tall,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative w-full text-right rounded-xl2 border bg-surface px-4 transition disabled:opacity-40 disabled:cursor-not-allowed",
        tall ? "py-4" : "h-14 flex items-center font-medium text-body",
        selected ? "border-brand shadow-ring" : "border-line hover:border-ink-3"
      )}
    >
      {children}
      {selected && (
        <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-brand text-brand-ink inline-flex items-center justify-center">
          <Check className="w-3.5 h-3.5" strokeWidth={2.8} />
        </span>
      )}
    </button>
  );
}
