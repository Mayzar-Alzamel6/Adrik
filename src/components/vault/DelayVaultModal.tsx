"use client";

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Clock, Compass, Cpu, Inbox, Layers, Lightbulb, Snowflake, Wind, X } from "lucide-react";
import { useVaultStore } from "@/stores/useVaultStore";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SectionHeader, SegmentedControl } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";
import { SymbolismDecoder } from "./SymbolismDecoder";
import { sendToInbox } from "@/lib/flow";

type Phase = "in" | "hold" | "out";
const PHASES: Record<Phase, { label: string; seconds: number; next: Phase }> = {
  in: { label: "شهيق", seconds: 4, next: "hold" },
  hold: { label: "ثبات", seconds: 4, next: "out" },
  out: { label: "زفير", seconds: 6, next: "in" },
};

function remaining(unlocksAt: number) {
  const diff = unlocksAt - Date.now();
  if (diff <= 0) return "انتهى التأجيل — القرار لك الآن";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `متبقٍ ${h} س ${m} د` : `متبقٍ ${m} د`;
}

/** Impulse delay & Architect Sandbox: postpone the urge 2h/24h or freeze architecture rabbit holes for 48h. */
export const DelayVaultModal: React.FC = () => {
  const {
    vaultItems,
    addVaultItem,
    addArchitectVaultItem,
    resolveVaultItem,
    markSurfingCompleted,
    isSurfingModalOpen,
    currentSurfingItem,
    openSurfingModal,
    closeSurfingModal,
  } = useVaultStore(
    useShallow((s) => ({
      vaultItems: s.vaultItems,
      addVaultItem: s.addVaultItem,
      addArchitectVaultItem: s.addArchitectVaultItem,
      resolveVaultItem: s.resolveVaultItem,
      markSurfingCompleted: s.markSurfingCompleted,
      isSurfingModalOpen: s.isSurfingModalOpen,
      currentSurfingItem: s.currentSurfingItem,
      openSurfingModal: s.openSurfingModal,
      closeSurfingModal: s.closeSurfingModal,
    }))
  );
  const symbolismLogs = useAppStore((s) => s.symbolismLogs);
  const addSymbolismLog = useAppStore((s) => s.addSymbolismLog);

  const [vaultTab, setVaultTab] = useState<"impulse" | "architect">("impulse");

  // Impulse form state
  const [text, setText] = useState("");
  const [intensity, setIntensity] = useState(6);
  const [hours, setHours] = useState<"2" | "24">("2");
  const [decoding, setDecoding] = useState(false);
  const [, forceTick] = useState(0);

  // Architect form state
  const [archTitle, setArchTitle] = useState("");
  const [realProblem, setRealProblem] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [roiReason, setRoiReason] = useState("");

  const [phase, setPhase] = useState<Phase>("in");
  const [left, setLeft] = useState(PHASES.in.seconds);
  const [cycles, setCycles] = useState(0);

  // refresh countdowns once a minute
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isSurfingModalOpen) return;
    setPhase("in");
    setLeft(PHASES.in.seconds);
    setCycles(0);
  }, [isSurfingModalOpen]);

  useEffect(() => {
    if (!isSurfingModalOpen) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        const next = PHASES[phase].next;
        if (phase === "out") setCycles((c) => c + 1);
        setPhase(next);
        return PHASES[next].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isSurfingModalOpen, phase]);

  const postpone = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const item = addVaultItem(text.trim(), intensity, Number(hours) as 2 | 24);
    setText("");
    setDecoding(false);
    openSurfingModal(item);
  };

  const submitArchitectIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archTitle.trim() || !realProblem.trim() || !mechanism.trim() || !roiReason.trim()) return;
    addArchitectVaultItem(archTitle.trim(), realProblem.trim(), mechanism.trim(), roiReason.trim());
    setArchTitle("");
    setRealProblem("");
    setMechanism("");
    setRoiReason("");
  };

  const onDecoded = (data: { avoidedEmotion: string; rootMeaning: string; correctiveStep: string }) => {
    addSymbolismLog({ escapeActivity: text.trim(), ...data });
    postpone();
  };

  const finishSurfing = () => {
    if (currentSurfingItem) markSurfingCompleted(currentSurfingItem.id);
    closeSurfingModal();
  };

  const active = vaultItems.filter((i) => !i.isResolved);
  const resolvedCount = vaultItems.length - active.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
        <Card as="section" className="p-5 sm:p-7">
          <div className="mb-6">
            <SegmentedControl
              value={vaultTab}
              onChange={(v) => setVaultTab(v as "impulse" | "architect")}
              options={[
                { value: "impulse", label: "تجميد نزوة فورية (2-24س)" },
                {
                  value: "architect",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                      مستودع الأفكار المعمارية (48س)
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {vaultTab === "architect" ? (
            /* Architect Sandbox Mode */
            <form onSubmit={submitArchitectIdea} className="space-y-4">
              <SectionHeader
                title="مستودع الأفكار المعمارية (Architect Sandbox)"
                description="تحييد النزوات البرمجية والمشاريع الجانبية: تجميد إجباري 48 ساعة لفصل الحماس اللحظي عن الجدوى."
              />

              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3.5 text-small text-indigo-800 dark:text-indigo-300 flex items-start gap-2.5">
                <Snowflake className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <p className="leading-relaxed">
                  المهندس (INTJ) يهرب من الروتين الثقيل بابتكار ميزات جانبية وأفكار تقنية غير مجدولة. قيّد الفكرة هنا
                  بالمعايير الثلاثة ودعها تنضج 48 ساعة قبل أن تلمس الكود.
                </p>
              </div>

              <div>
                <Label htmlFor="arch-title">عنوان الفكرة أو الميزة المعمارية</Label>
                <Input
                  id="arch-title"
                  value={archTitle}
                  onChange={(e) => setArchTitle(e.target.value)}
                  placeholder="مثال: إعادة بناء محرك المزامنة ليدعم CRDTs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="arch-problem" hint="ما الذي يتعطل حالياً ويستوجب هذا الحل؟">
                  1. المشكلة الحقيقية (Real Problem)
                </Label>
                <Input
                  id="arch-problem"
                  value={realProblem}
                  onChange={(e) => setRealProblem(e.target.value)}
                  placeholder="ما المشكلة الفعلية التي تحلها هذه الفكرة؟"
                  required
                />
              </div>

              <div>
                <Label htmlFor="arch-mechanism" hint="في جملتين: كيف تعمل الخوارزمية أو الميزة؟">
                  2. الآلية المختصرة (Mechanism)
                </Label>
                <Input
                  id="arch-mechanism"
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  placeholder="كيف تعمل في جملتين وبأقل تعقيد؟"
                  required
                />
              </div>

              <div>
                <Label htmlFor="arch-roi" hint="الرافعة: لماذا تستحق وقتك مقارنة بأولويات اليوم والأسبوع؟">
                  3. العائد على الاستثمار (ROI vs Priorities)
                </Label>
                <Input
                  id="arch-roi"
                  value={roiReason}
                  onChange={(e) => setRoiReason(e.target.value)}
                  placeholder="لماذا تستحق وقتك مقارنة بأولوياتك الحالية؟"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!archTitle.trim() || !realProblem.trim() || !mechanism.trim() || !roiReason.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Snowflake className="w-4 h-4 ml-1.5" />
                  إيداع الفكرة وتجميدها 48 ساعة ❄️
                </Button>
              </div>
            </form>
          ) : decoding ? (
            <SymbolismDecoder escapeActivity={text} onDecoded={onDecoded} onCancel={() => setDecoding(false)} />
          ) : (
            /* Regular Impulse Delay Form */
            <form onSubmit={postpone} className="space-y-6">
              <SectionHeader
                title="رغبة مفاجئة الآن؟"
                description="أنت لا تحرم نفسك؛ أنت تؤجل القرار فقط، لتفصل الانفعال عن السلوك."
              />
              <div>
                <Label htmlFor="vault-text">ما الذي تريد فعله؟</Label>
                <Input
                  id="vault-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="مثال: فتح إنستغرام، شراء شيء غير مخطط"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-ui font-medium text-ink">شدة الرغبة</span>
                  <span className="font-display text-lead text-ink tabular">{intensity} من 10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-[rgb(var(--brand))]"
                  aria-label="شدة الرغبة"
                />
                <div className="flex justify-between text-caption text-ink-3 mt-1">
                  <span>خفيفة</span>
                  <span>ملحّة جداً</span>
                </div>
              </div>
              <div>
                <span className="block text-ui font-medium text-ink mb-2">أجّلها لمدة</span>
                <SegmentedControl
                  value={hours}
                  onChange={setHours}
                  options={[
                    { value: "2", label: "ساعتين" },
                    { value: "24", label: "يوم كامل" },
                  ]}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={!text.trim()}>
                  أجّلها
                </Button>
                <Button variant="secondary" disabled={!text.trim()} onClick={() => setDecoding(true)}>
                  <Compass className="w-4 h-4" />
                  افهم سببها أولاً
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Right Card: Active Vault Items */}
        <Card as="section" className="p-5 sm:p-7">
          <SectionHeader
            title="مؤجلة في الصندوق"
            action={resolvedCount > 0 ? <Badge tone="brand">{resolvedCount} قرار واعٍ</Badge> : undefined}
          />
          {active.length === 0 ? (
            <EmptyState
              icon={Wind}
              title="لا شيء مجمد الآن"
              description="حين تداهمك رغبة تشتت أو فكرة معمارية جانبية، ودعها الصندوق."
              className="py-8"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {active.map((item) => {
                const isArchitect = item.itemType === "architect";
                const isReady = item.unlocksAt <= Date.now();

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-xl2 border p-4 space-y-2.5 transition",
                      isArchitect
                        ? "border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/10"
                        : "border-line bg-surface"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {isArchitect && (
                          <span className="inline-flex items-center gap-1 text-caption font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mb-1">
                            <Cpu className="w-3 h-3" />
                            فكرة معمارية (قفل 48س)
                          </span>
                        )}
                        <p className="text-body font-bold text-ink">{item.impulseTitle}</p>
                      </div>
                      <span className="shrink-0 text-caption text-ink-3 tabular">
                        {isArchitect ? "تجميد 48 س" : `شدة ${item.cravingIntensity} من 10`}
                      </span>
                    </div>

                    {isArchitect && (
                      <div className="space-y-1 text-small bg-surface p-2.5 rounded-lg border border-line text-ink-2">
                        {item.realProblem && (
                          <div>
                            <span className="font-semibold text-ink">المشكلة: </span>
                            {item.realProblem}
                          </div>
                        )}
                        {item.mechanism && (
                          <div>
                            <span className="font-semibold text-ink">الآلية: </span>
                            {item.mechanism}
                          </div>
                        )}
                        {item.roiReason && (
                          <div>
                            <span className="font-semibold text-ink">الـ ROI: </span>
                            {item.roiReason}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-small text-ink-2 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {remaining(item.unlocksAt)}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-line/60">
                      <Button size="sm" onClick={() => resolveVaultItem(item.id, "إلغاء واعٍ لعدم الجدوى")}>
                        <Check className="w-4 h-4 ml-1" />
                        إسقاط الفكرة (عدم جدوى)
                      </Button>

                      {!isArchitect && !item.surfingCompleted && (
                        <Button size="sm" variant="quiet" onClick={() => openSurfingModal(item)}>
                          <Wind className="w-4 h-4" />
                          تنفّس معها
                        </Button>
                      )}

                      {isReady && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => {
                            sendToInbox(
                              isArchitect
                                ? `مشروع معتمد: ${item.impulseTitle} (المشكلة: ${item.realProblem || ""})`
                                : item.impulseTitle
                            );
                            resolveVaultItem(item.id, "تم ترقيتها لمهمة معتمدة بعد انقضاء التجميد");
                          }}
                        >
                          <Inbox className="w-4 h-4 ml-1" />
                          نضجت الفكرة — حوّلها لمهمة معتمدة 🚀
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {symbolismLogs.length > 0 && (
        <Card as="section" className="p-5 sm:p-7">
          <SectionHeader
            title="سجل المعاني العميقة"
            description="الأنماط التي اكتشفتها حين توقفت وفهمت ما تعنيه الرغبة بدل الاستجابة لها."
          />
          <ul className="mt-4 space-y-3">
            {symbolismLogs.map((log) => (
              <li key={log.id} className="rounded-xl border border-line p-4 text-ui">
                <p className="font-medium text-ink">بدل «{log.escapeActivity}»:</p>
                <p className="text-small text-ink-2 mt-1">
                  كنت تتجنّب <span className="font-medium text-ink">{log.avoidedEmotion}</span> لأن المعنى العميق هو{" "}
                  <span className="font-medium text-ink">{log.rootMeaning}</span>.
                </p>
                <p className="text-small text-brand mt-1 font-medium">الخطوة التصحيحية: {log.correctiveStep}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Surfing Modal */}
      <Sheet open={isSurfingModalOpen} onClose={finishSurfing} size="sm">
        <div className="text-center py-6 space-y-6">
          <h3 className="font-display text-heading font-semibold text-ink">اركب موجة الرغبة (Urge Surfing)</h3>
          <p className="text-ui text-ink-2 max-w-xs mx-auto">
            الرغبة كالموجة: ترتفع، تصل لذروتها، ثم تنكسر. لا تقاومها، فقط تنفس معها دقيقة واحدة.
          </p>

          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 rounded-full border-2 border-brand/20 transition-all duration-1000",
                phase === "in" && "scale-110 border-brand",
                phase === "hold" && "scale-110 border-accent",
                phase === "out" && "scale-90 border-brand/40"
              )}
            />
            <div className="text-center">
              <span className="block font-display text-display font-bold text-ink mb-1">{left}</span>
              <span className="block text-small font-semibold text-brand tracking-widest uppercase">
                {PHASES[phase].label}
              </span>
            </div>
          </div>

          <p className="text-caption text-ink-3">دورات مكتملة: {cycles}</p>

          <Button onClick={finishSurfing} className="w-full">
            أشعر بالهدوء الآن
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
