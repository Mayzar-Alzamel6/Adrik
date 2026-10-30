"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, Check, FolderKanban, Map as MapIcon, Moon, Pencil, Plus, Scroll, ShieldCheck, Timer, Trash2, X } from "lucide-react";
import {
  FAITH_VALUE_TEMPLATE,
  VALUE_TEMPLATES,
  customValue,
  useAppStore,
  type CoreValueItem,
} from "@/stores/useAppStore";
import { cn, weekOf } from "@/lib/utils";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { computeValueWeek, formatMinutes, useValueData } from "@/lib/valueInsights";
import { useJourney } from "@/lib/journey";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

type Tab = "values" | "goals" | "beliefs" | "story" | "votes" | "protect";
const TABS: { id: Tab; label: string }[] = [
  { id: "values", label: "القيم" },
  { id: "goals", label: "من هدف إلى هوية" },
  { id: "beliefs", label: "المعتقدات" },
  { id: "story", label: "قصتك" },
  { id: "votes", label: "أصوات الهوية" },
  { id: "protect", label: "الحماية" },
];

const GOAL_PRESETS = [
  {
    label: "الصحة",
    goal: "بناء جسد قوي وطاقة يومية ثابتة",
    narrative: "أنا شخص يحترم جسده لأنه وسيلته لأداء رسالته.",
    habit: "30 دقيقة حركة 5 أيام أسبوعياً، ونوم قبل منتصف الليل.",
    redLine: "الجلوس أكثر من 90 دقيقة دون حركة، أو السهر بلا سبب.",
  },
  {
    label: "التعلّم",
    goal: "إتقان مهارة جديدة تفتح لي باباً مهنياً",
    narrative: "أنا متعلّم مستمر يمارس ما يتعلمه ولا يكتفي بالاستهلاك.",
    habit: "جلسة تعلّم مركّزة يومياً مع تطبيق عملي واحد.",
    redLine: "القفز بين المصادر بدل إكمال ما بدأته.",
  },
  {
    label: "مشروع خاص",
    goal: "إطلاق مشروعي الخاص وتحقيق أول دخل منه",
    narrative: "أنا صانع يتحمل مسؤولية نتائجه ويطلق قبل أن يكتمل كل شيء.",
    habit: "ساعة عمل يومية على أهم خطوة تقرّب الإطلاق.",
    redLine: "تأجيل الإطلاق خوفاً من الحكم، أو الانشغال بالتجميل عن البيع.",
  },
];

const EXCUSES = [
  { excuse: "لست في المزاج اليوم، سأبدأ غداً بطاقة كاملة.", antidote: "الفعل يقود الشعور. خمس دقائق فقط، وسيلحق بك المزاج." },
  { excuse: "الوقت ضيق ولن أنجز إلا القليل، فلا فائدة.", antidote: "القليل الدائم يغلب الكثير المنقطع. عشرون دقيقة الآن تحمي الاستمرار." },
  { excuse: "فاتتني ثلاثة أيام وخرب كل شيء، سأبدأ الأسبوع القادم.", antidote: "التعثّر ثقب لا سقوط. العودة تبدأ في هذه الدقيقة، لا يوم الأحد." },
  { excuse: "المهمة ضخمة ولا أعرف من أين أبدأ.", antidote: "فكّكها إلى أصغر خطوة مادية: افتح الملف فقط." },
];

const PROTECT = [
  { title: "نقِّ ما تتابعه", text: "ألغِ متابعة كل حساب يثير المقارنة أو يبيع نتائج سريعة وهمية." },
  { title: "أبعد الهاتف", text: "الهاتف في غرفة أخرى أثناء جلسات التركيز. لا إشعار يقتحم انتباهك." },
  { title: "غذِّ عقلك", text: "استبدل التصفح العشوائي بقراءة السير والمهارات التي تبني هويتك." },
];

/** Identity workspace: values, goals→identity, belief audit, story reframing, identity votes, protection. */
export const IdentityConstitution: React.FC = () => {
  const [tab, setTab] = useState<Tab>("values");
  const values = useAppStore((s) => s.values);
  const identityVotes = useAppStore((s) => s.identityVotes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1" role="tablist" aria-label="أقسام الدستور">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-9 px-4 rounded-full text-ui whitespace-nowrap transition",
                tab === t.id ? "bg-ink text-bg font-medium" : "text-ink-2 hover:text-ink hover:bg-surface-2"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-small text-ink-3">
          القيم: {values.length} · أصوات الهوية: {identityVotes.length}
        </p>
      </div>

      {tab === "values" && <ValuesTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "beliefs" && <BeliefsTab />}
      {tab === "story" && <StoryTab />}
      {tab === "votes" && <VotesTab />}
      {tab === "protect" && <ProtectTab />}
    </div>
  );
};

/* ---------------- Values ---------------- */

function ValuesTab() {
  const { values, updateCoreValue, addCoreValue, removeCoreValue, settings } = useAppStore(
    useShallow((s) => ({
      values: s.values,
      updateCoreValue: s.updateCoreValue,
      addCoreValue: s.addCoreValue,
      removeCoreValue: s.removeCoreValue,
      settings: s.settings,
    }))
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pick<CoreValueItem, "dailyAction" | "redLine" | "conflictRule">>({
    dailyAction: "",
    redLine: "",
    conflictRule: "",
  });
  const [picker, setPicker] = useState(false);
  const [own, setOwn] = useState({ title: "", definition: "" });
  const projects = useProjectsStore((s) => s.projects);
  const valueData = useValueData();
  const week = useMemo(() => computeValueWeek(weekOf(), valueData), [valueData]);
  const weekMinutes = (id: string) => week.rows.find((r) => r.value.id === id)?.minutes ?? 0;
  // Before projects exist, focus time can't reach a value — showing "no time this week" would be a false verdict.
  const projectsOpen = useJourney().isToolOpen("projects");

  const pool = (settings.faithContent ? [FAITH_VALUE_TEMPLATE, ...VALUE_TEMPLATES] : VALUE_TEMPLATES).filter(
    (t) => !values.some((v) => v.id === t.id)
  );

  return (
    <>
      {values.length === 0 ? (
        <Card>
          <EmptyState
            icon={Scroll}
            title="لم تحدد قيمك بعد"
            description="القيم هي ما يحسم حين يتعارض ما يجب مع ما تشتهي. اختر من ثلاث إلى خمس."
            action={<Button onClick={() => setPicker(true)}>اختر قيمك</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {values.map((v) => {
            const isEditing = editing === v.id;
            return (
              <Card as="article" key={v.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-caption text-accent-strong font-medium">القيمة {v.order}</span>
                    <h3 className="font-display text-subtitle font-semibold text-ink mt-0.5">{v.title}</h3>
                  </div>
                  <div className="flex shrink-0">
                    {isEditing ? (
                      <button
                        type="button"
                        aria-label="حفظ"
                        onClick={() => {
                          updateCoreValue(v.id, draft);
                          setEditing(null);
                        }}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-brand hover:bg-brand-soft"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label="تعديل"
                          onClick={() => {
                            setEditing(v.id);
                            setDraft({ dailyAction: v.dailyAction, redLine: v.redLine, conflictRule: v.conflictRule ?? "" });
                          }}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-2"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="إزالة"
                          onClick={() => removeCoreValue(v.id)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-ui text-ink-2 mt-2 leading-relaxed">{v.definition}</p>

                <dl className="mt-4 pt-4 border-t border-line space-y-3 text-ui">
                  {(
                    [
                      ["dailyAction", "سلوكها اليومي", "text-brand"],
                      ["redLine", "خطها الأحمر", "text-danger"],
                      ["conflictRule", "عند التعارض", "text-accent-strong"],
                    ] as const
                  ).map(([key, label, color]) => (
                    <div key={key}>
                      <dt className={cn("text-caption font-medium", color)}>{label}</dt>
                      <dd className="text-ink mt-0.5 leading-relaxed">
                        {isEditing ? (
                          <Textarea
                            rows={2}
                            value={draft[key] ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                            className="mt-1 text-ui"
                          />
                        ) : (
                          v[key] || <span className="text-ink-3">لم تكتبه بعد. اضغط القلم لتكتبه.</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                {projectsOpen && (
                  <ValueServedBy
                    projects={projects.filter((p) => p.valueIds?.includes(v.id)).map((p) => p.name)}
                    minutes={weekMinutes(v.id)}
                  />
                )}
              </Card>
            );
          })}
          {values.length < 7 && (
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="min-h-[200px] rounded-xl2 border border-dashed border-line text-ink-2 hover:text-ink hover:border-ink-3 transition inline-flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إضافة قيمة
            </button>
          )}
        </div>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="أضف قيمة" description="يمكنك تعديل سلوكها وخطها الأحمر بعد الإضافة." size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!own.title.trim()) return;
            addCoreValue(customValue(own.title, own.definition));
            setOwn({ title: "", definition: "" });
            setPicker(false);
          }}
          className="mt-2 rounded-xl2 border border-dashed border-line-strong p-4 space-y-2"
        >
          <Label htmlFor="own-value">اكتب قيمتك أنت</Label>
          <Input id="own-value" value={own.title} onChange={(e) => setOwn({ ...own, title: e.target.value })} placeholder="مثال: خدمة الناس" maxLength={60} />
          <Input
            aria-label="معناها لك"
            value={own.definition}
            onChange={(e) => setOwn({ ...own, definition: e.target.value })}
            placeholder="ماذا تعني لك في سطر؟ (اختياري)"
            maxLength={140}
          />
          <Button type="submit" size="sm" disabled={!own.title.trim()}>
            <Plus className="w-4 h-4" />
            أضفها
          </Button>
        </form>
        {pool.length > 0 && <p className="text-small text-ink-3 mt-4">أو اختر من القيم الجاهزة:</p>}
        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          {pool.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                addCoreValue(t);
                if (pool.length <= 1) setPicker(false);
              }}
              className="rounded-xl2 border border-line p-4 text-right hover:border-brand hover:shadow-ring transition"
            >
              <span className="block font-display text-body font-semibold text-ink">{t.title}</span>
              <span className="block text-small text-ink-2 mt-1 leading-relaxed">{t.definition}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

/** Under each value: which projects carry it, and how much focus it got this week. */
function ValueServedBy({ projects, minutes }: { projects: string[]; minutes: number }) {
  return (
    <div className="mt-4 pt-4 border-t border-line space-y-1.5 text-small">
      {projects.length > 0 ? (
        <p className="text-ink-2 inline-flex items-start gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 mt-0.5 text-ink-3 shrink-0" />
          <span>تخدمها: {projects.join("، ")}</span>
        </p>
      ) : (
        <Link href="/app/tools/projects" className="text-accent-strong hover:underline underline-offset-4 inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          لا مشروع يخدمها بعد — أنشئ واحداً
        </Link>
      )}
      <p className="text-ink-3 inline-flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 shrink-0" />
        {minutes > 0 ? `${formatMinutes(minutes)} تركيز لها هذا الأسبوع` : "لم تأخذ وقتاً هذا الأسبوع"}
        <Link href="/app/vision" aria-label="خريطة الرؤية" className="text-brand hover:underline underline-offset-4 inline-flex items-center gap-1 mr-1">
          <MapIcon className="w-3.5 h-3.5" />
          الخريطة
        </Link>
      </p>
    </div>
  );
}

/* ---------------- Goals → identity ---------------- */

function GoalsTab() {
  const { values, goalIdentities, addGoalIdentity, deleteGoalIdentity, binaryHabits, addBinaryHabit } = useAppStore(
    useShallow((s) => ({
      values: s.values,
      goalIdentities: s.goalIdentities,
      addGoalIdentity: s.addGoalIdentity,
      deleteGoalIdentity: s.deleteGoalIdentity,
      binaryHabits: s.binaryHabits,
      addBinaryHabit: s.addBinaryHabit,
    }))
  );
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);
  const empty = { goal: "", coreValue: values[0]?.title ?? "", narrative: "", habit: "", redLine: "" };
  const [f, setF] = useState(empty);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.goal.trim()) return;
    addGoalIdentity({
      goal: f.goal.trim(),
      coreValue: f.coreValue,
      selfNarrative: f.narrative.trim() || "أنا شخص يترجم أهدافه إلى سلوك يومي صادق.",
      microHabit: f.habit.trim() || "كتلة تركيز يومية غير قابلة للتفاوض.",
      redLine: f.redLine.trim() || "التسويف والاستجابة للمشتتات اللحظية.",
    });
    setF(empty);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader title="حوّل هدفاً إلى هوية" description="لا تسأل «ماذا أريد أن أحقق؟» بل «من الشخص الذي يحقق هذا بشكل طبيعي؟»" />
        <div className="mt-4 flex flex-wrap gap-2">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setF({ ...f, goal: p.goal, narrative: p.narrative, habit: p.habit, redLine: p.redLine })}
              className="h-8 px-3 rounded-full border border-line text-small text-ink-2 hover:border-ink-3 hover:text-ink transition"
            >
              مثال: {p.label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="g-goal">الهدف</Label>
            <Input id="g-goal" required value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} />
          </div>
          {values.length > 0 && (
            <div>
              <Label htmlFor="g-value">القيمة التي يخدمها</Label>
              <select
                id="g-value"
                value={f.coreValue}
                onChange={(e) => setF({ ...f, coreValue: e.target.value })}
                className="w-full h-11 bg-surface border border-line-strong rounded-xl px-3 text-body text-ink focus:outline-none focus:border-brand"
              >
                {values.map((v) => (
                  <option key={v.id} value={v.title}>
                    {v.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="g-narr" hint="بصيغة الحاضر: «أنا شخص…»">
              هويتك الجديدة
            </Label>
            <Textarea id="g-narr" rows={2} value={f.narrative} onChange={(e) => setF({ ...f, narrative: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="g-habit">عادتها الصغيرة اليومية</Label>
            <Input id="g-habit" value={f.habit} onChange={(e) => setF({ ...f, habit: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="g-red">خطها الأحمر</Label>
            <Input id="g-red" value={f.redLine} onChange={(e) => setF({ ...f, redLine: e.target.value })} />
          </div>
          <Button type="submit" disabled={!f.goal.trim()}>
            حفظ
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {goalIdentities.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <EmptyState icon={Scroll} title="لا أهداف بعد" description="أول هدف تحوّله إلى هوية سيظهر هنا." />
          </Card>
        ) : (
          goalIdentities.map((g) => (
            <Card as="article" key={g.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="accent">{g.coreValue}</Badge>
                  <h3 className="font-display text-lead font-semibold text-ink mt-2">{g.goal}</h3>
                </div>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => deleteGoalIdentity(g.id)}
                  className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="font-display text-body text-ink mt-3 border-r-2 border-brand pr-3 leading-relaxed">{g.selfNarrative}</p>
              <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-ui">
                <div>
                  <dt className="text-caption text-brand font-medium">العادة</dt>
                  <dd className="text-ink-2">{g.microHabit}</dd>
                </div>
                <div>
                  <dt className="text-caption text-danger font-medium">الخط الأحمر</dt>
                  <dd className="text-ink-2">{g.redLine}</dd>
                </div>
              </dl>
              <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-2">
                {binaryHabits.some((h) => h.title === g.microHabit) ? (
                  <span className="inline-flex items-center gap-1.5 text-small text-brand">
                    <Check className="w-3.5 h-3.5" />
                    عادتها في إغلاق المساء
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => addBinaryHabit(g.microHabit, { valueId: values.find((v) => v.title === g.coreValue)?.id })}
                  >
                    <Moon className="w-4 h-4" />
                    أضف عادتها لإغلاق المساء
                  </Button>
                )}
                {projects.some((p) => p.name === g.goal) ? (
                  <Link href="/app/tools/projects" className="inline-flex items-center gap-1.5 text-small text-brand hover:underline underline-offset-4">
                    <FolderKanban className="w-3.5 h-3.5" />
                    له مشروع — افتحه
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => {
                      const value = values.find((v) => v.title === g.coreValue);
                      addProject({ name: g.goal, description: g.selfNarrative, valueIds: value ? [value.id] : [] });
                    }}
                  >
                    <FolderKanban className="w-4 h-4" />
                    حوّله إلى مشروع
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- Beliefs ---------------- */

const ACTIONS = {
  KEEP: { label: "أُبقي عليه", tone: "brand" as const },
  MODIFY: { label: "أعدّله", tone: "accent" as const },
  DROP: { label: "أتركه", tone: "danger" as const },
};

function BeliefsTab() {
  const beliefAudits = useAppStore((s) => s.beliefAudits);
  const addBeliefAudit = useAppStore((s) => s.addBeliefAudit);
  const deleteBeliefAudit = useAppStore((s) => s.deleteBeliefAudit);
  const [belief, setBelief] = useState("");
  const [origin, setOrigin] = useState("");
  const [action, setAction] = useState<keyof typeof ACTIONS>("DROP");
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!belief.trim()) return;
    addBeliefAudit({ belief: belief.trim(), origin: origin.trim() || "غير محدد", action, notes: notes.trim() || undefined });
    setBelief("");
    setOrigin("");
    setNotes("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader title="افحص معتقداً" description="بعض ما تؤمن به عن نفسك ورثته دون أن تختاره. افحصه، ثم قرّر." />
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="b-belief">المعتقد</Label>
            <Textarea
              id="b-belief"
              rows={2}
              required
              value={belief}
              onChange={(e) => setBelief(e.target.value)}
              placeholder="مثال: يجب أن أكون متحمساً تماماً قبل أن أبدأ"
            />
          </div>
          <div>
            <Label htmlFor="b-origin" hint="اختياري">
              من أين جاء؟
            </Label>
            <Input id="b-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="تربية، تجربة قديمة، ثقافة سائدة…" />
          </div>
          <div>
            <Label>قرارك</Label>
            <div className="flex gap-2">
              {(Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAction(k)}
                  aria-pressed={action === k}
                  className={cn(
                    "flex-1 h-10 rounded-xl border text-ui transition",
                    action === k ? "border-brand shadow-ring text-ink font-medium" : "border-line text-ink-2 hover:border-ink-3"
                  )}
                >
                  {ACTIONS[k].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="b-notes" hint="اختياري">
              المعتقد البديل
            </Label>
            <Input id="b-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: الحركة تصنع الحماس، لا العكس" />
          </div>
          <Button type="submit" disabled={!belief.trim()}>
            حفظ
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {beliefAudits.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <EmptyState icon={Scroll} title="لا معتقدات مفحوصة بعد" description="ابدأ بجملة تقولها لنفسك كثيراً." />
          </Card>
        ) : (
          beliefAudits.map((b) => (
            <Card as="article" key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-body text-ink leading-relaxed">{b.belief}</p>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => deleteBeliefAudit(b.id)}
                  className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-small text-ink-3">
                <Badge tone={ACTIONS[b.action].tone}>{ACTIONS[b.action].label}</Badge>
                <span>المصدر: {b.origin}</span>
              </div>
              {b.notes && (
                <p className="mt-3 text-ui text-ink flex gap-2">
                  <ArrowLeft className="w-4 h-4 shrink-0 mt-1 text-brand" />
                  {b.notes}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- Story reframing ---------------- */

function StoryTab() {
  const reframedStories = useAppStore((s) => s.reframedStories);
  const addReframedStory = useAppStore((s) => s.addReframedStory);
  const [event, setEvent] = useState("");
  const [victim, setVictim] = useState("");
  const [creator, setCreator] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.trim() || !creator.trim()) return;
    addReframedStory({ event: event.trim(), victimStory: victim.trim() || "—", creatorStory: creator.trim() });
    setEvent("");
    setVictim("");
    setCreator("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader title="أعد كتابة القصة" description="الحدث واحد، والقصة التي ترويها عنه اختيار. من الضحية إلى الصانع." />
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="s-event">ماذا حدث؟</Label>
            <Input id="s-event" required value={event} onChange={(e) => setEvent(e.target.value)} placeholder="مثال: انقطعت عن التعلم أسبوعاً" />
          </div>
          <div>
            <Label htmlFor="s-victim" hint="ما يقوله الصوت الناقد — اكتبه لتراه">
              قصة الضحية
            </Label>
            <Textarea
              id="s-victim"
              rows={2}
              value={victim}
              onChange={(e) => setVictim(e.target.value)}
              placeholder="أنا لا ألتزم بشيء، والظروف دائماً ضدي"
            />
          </div>
          <div>
            <Label htmlFor="s-creator" hint="ما الذي كشفه لك هذا؟ وما الذي ستفعله الآن؟">
              قصة الصانع
            </Label>
            <Textarea
              id="s-creator"
              rows={3}
              required
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="الانقطاع كشف خللاً في تنظيم طاقتي لا في قدراتي. أستأنف اليوم بجلسة 25 دقيقة."
            />
          </div>
          <Button type="submit" disabled={!event.trim() || !creator.trim()}>
            حفظ
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {reframedStories.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <EmptyState icon={Scroll} title="لا قصص بعد" description="حين يتعثر يومك، عد إلى هنا واكتب القصة من جديد." />
          </Card>
        ) : (
          reframedStories.map((s) => (
            <Card as="article" key={s.id} className="p-5 space-y-3">
              <p className="text-small text-ink-3">{s.event}</p>
              {s.victimStory !== "—" && <p className="text-ui text-ink-3 line-through decoration-ink-3/40">{s.victimStory}</p>}
              <p className="text-body text-ink leading-relaxed border-r-2 border-brand pr-3">{s.creatorStory}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- Identity votes ---------------- */

function VotesTab() {
  const values = useAppStore((s) => s.values);
  const identityVotes = useAppStore((s) => s.identityVotes);
  const addIdentityVote = useAppStore((s) => s.addIdentityVote);
  const [text, setText] = useState("");
  const [valueTitle, setValueTitle] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addIdentityVote(valueTitle ? `${text.trim()} — لقيمة: ${valueTitle}` : text.trim());
    setText("");
    setValueTitle(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader title="صوّت لهويتك" description="كل فعل صغير صوتٌ للشخص الذي تريد أن تكونه. الأصوات تتراكم حتى تصبح يقيناً." />
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="v-text">ماذا فعلت؟</Label>
            <Input id="v-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="مثال: رفضت فتح الهاتف أثناء الجلسة" />
          </div>
          {values.length > 0 && (
            <div>
              <Label hint="اختياري">لأي قيمة؟</Label>
              <div className="flex flex-wrap gap-2">
                {values.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setValueTitle(valueTitle === v.title ? null : v.title)}
                    aria-pressed={valueTitle === v.title}
                    className={cn(
                      "h-8 px-3 rounded-full border text-small transition",
                      valueTitle === v.title ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
                    )}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" disabled={!text.trim()}>
            تسجيل الصوت
          </Button>
        </form>
      </Card>

      <Card as="section" className="p-5 sm:p-7">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-subtitle font-semibold text-ink">سجلّ الأصوات</h3>
          <span className="font-display text-display-sm text-brand tabular leading-none">{identityVotes.length}</span>
        </div>
        {identityVotes.length === 0 ? (
          <p className="text-ui text-ink-3 mt-6 text-center py-6">صوتك الأول ينتظرك.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {identityVotes.slice(0, 12).map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 py-3">
                <span className="text-ui text-ink">{v.voteText}</span>
                <span className="text-caption text-ink-3 shrink-0 tabular" dir="ltr">
                  {v.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Protection ---------------- */

function ProtectTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {PROTECT.map((p) => (
          <Card key={p.title} className="p-5">
            <ShieldCheck className="w-5 h-5 text-brand" strokeWidth={1.8} />
            <h3 className="font-display text-lead font-semibold text-ink mt-3">{p.title}</h3>
            <p className="text-ui text-ink-2 mt-1 leading-relaxed">{p.text}</p>
          </Card>
        ))}
      </div>

      <Card as="section" className="p-5 sm:p-7">
        <SectionHeader title="حين يهمس العذر" description="تعرّف على العذر حين يأتي، واستدعِ جوابه دون تفاوض." />
        <ul className="mt-5 space-y-3">
          {EXCUSES.map((x) => (
            <li key={x.excuse} className="grid md:grid-cols-2 gap-2 md:gap-4 rounded-xl2 bg-surface-2 p-4">
              <p className="text-ui text-ink-2">«{x.excuse}»</p>
              <p className="text-ui text-ink font-medium flex gap-2">
                <ArrowLeft className="w-4 h-4 shrink-0 mt-1 text-brand" />
                {x.antidote}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 sm:p-10 text-center bg-brand text-brand-ink border-transparent">
        <p className="text-small opacity-80">ميثاقك</p>
        <p className="font-display text-title-sm sm:text-title leading-[1.9] mt-3 max-w-2xl mx-auto">
          أتحمّل المسؤولية الكاملة عن أفعالي. لا أقبل دور الضحية، ولا أستسلم لجلد الذات. هويتي تتشكل مع كل قرار أقدّم فيه ما يجب على ما
          أشتهي. أدركتُ عمري، وبدأت.
        </p>
      </Card>
    </div>
  );
}
