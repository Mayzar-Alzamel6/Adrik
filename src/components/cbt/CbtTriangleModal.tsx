"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, Footprints, Lightbulb, Loader2, Play } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Input, Label, SectionHeader, Textarea } from "@/components/ui/primitives";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/cbt/CrisisSupport";
import { AiConsentSheet } from "@/components/cbt/AiConsent";
import { analyzeSafely, type AiConsent, type CbtReply, type Reframe } from "@/lib/safety/analysis";
import { fetchAiAvailable, readAiConsent } from "@/lib/safety/aiConsent";
import { SAFETY_TEXT } from "@/lib/safety/texts";

const SERVER_ERROR = "server";

/**
 * Thought reframing: event → automatic thought → feeling → urge, then a calmer thought and one small step.
 * The safe order (crisis check on the device, consent, analysis, AI risk flag) lives in lib/safety/analysis.
 */
export const CbtTriangleModal: React.FC = () => {
  const cbtLogs = useAppStore((s) => s.cbtLogs);
  const addCbtLog = useAppStore((s) => s.addCbtLog);
  const router = useRouter();
  const [eventText, setEventText] = useState("");
  const [thought, setThought] = useState("");
  const [emotion, setEmotion] = useState("");
  const [body, setBody] = useState("");
  const [urge, setUrge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Reframe | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  // Arriving from an interrupted focus session: the situation is already known.
  useEffect(() => {
    const event = new URLSearchParams(window.location.search).get("event");
    if (event) setEventText(event);
  }, []);

  const fields = { event: eventText, automaticThought: thought, emotion, bodyLocation: body, actionTendency: urge };

  const requestAnalysis = async (useAI: boolean): Promise<CbtReply> => {
    const res = await fetch("/api/cbt/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, useAI }),
    });
    if (!res.ok) throw new Error(SERVER_ERROR);
    return res.json();
  };

  const run = async (consent: AiConsent | null) => {
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const outcome = await analyzeSafely(fields, { consent, aiAvailable: fetchAiAvailable, analyze: requestAnalysis });
      // A crisis is never saved to the log: it syncs and shows up in reports.
      if (outcome.kind === "crisis") setCrisis(true);
      else if (outcome.kind === "needs-consent") setConsentOpen(true);
      else {
        const data = outcome.result;
        setResult(data);
        addCbtLog({
          event: eventText || "—",
          automaticThought: thought,
          emotion: emotion || "—",
          bodyLocation: body || "—",
          distortionType: data.distortionType,
          reframedThought: data.reframedThought,
          nextSmallAction: data.nextSmallAction,
        });
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message === SERVER_ERROR
          ? "تعذّر التحليل الآن. حاول مرة أخرى بعد قليل."
          : "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة."
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (thought.trim()) run(readAiConsent());
  };

  const reset = () => {
    setEventText("");
    setThought("");
    setEmotion("");
    setBody("");
    setUrge("");
    setResult(null);
    setError(null);
    setCrisis(false);
  };

  if (crisis) return <CrisisSupport onDone={reset} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
        <Card as="section" className="p-5 sm:p-7">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="cbt-event" hint="ماذا حدث بالضبط؟ الوقائع فقط.">
                الموقف
              </Label>
              <Input
                id="cbt-event"
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                placeholder="مثال: تأخرت ساعة عن بدء العمل"
              />
            </div>
            <div>
              <Label htmlFor="cbt-thought" hint="الجملة التي قالها عقلك في تلك اللحظة.">
                الفكرة التلقائية
              </Label>
              <Textarea
                id="cbt-thought"
                rows={3}
                required
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                placeholder="مثال: ضاع اليوم كله، أنا لا أنجز شيئاً أبداً"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cbt-emotion">الشعور</Label>
                <Input id="cbt-emotion" value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="قلق، إحباط، خجل…" />
              </div>
              <div>
                <Label htmlFor="cbt-body">أين تشعر به في جسدك؟</Label>
                <Input id="cbt-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="ضيق في الصدر…" />
              </div>
            </div>
            <div>
              <Label htmlFor="cbt-urge">ماذا تدفعك الفكرة لأن تفعل؟</Label>
              <Input id="cbt-urge" value={urge} onChange={(e) => setUrge(e.target.value)} placeholder="مثال: فتح الهاتف وترك المهمة" />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft text-danger px-4 py-3 text-ui">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={loading || !thought.trim()} className="flex-1 sm:flex-none">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {loading ? "نفكّك الفكرة…" : "فكّك الفكرة"}
              </Button>
              {result && (
                <Button variant="ghost" onClick={reset}>
                  فكرة جديدة
                </Button>
              )}
            </div>
            <p className="text-caption text-ink-3">{SAFETY_TEXT.disclaimer}</p>
          </form>
        </Card>

        {result ? (
          <Card as="section" className="p-5 sm:p-7 space-y-5 animate-rise-in">
            <div>
              <Badge tone="accent">الفخ الذي وقعت فيه</Badge>
              <p className="font-display text-title-sm font-semibold text-ink mt-2 leading-relaxed">{result.distortionType}</p>
              <p className="text-caption text-ink-3 mt-1">
                {result.engine === "ai" ? SAFETY_TEXT.engine.ai : SAFETY_TEXT.engine.local}
              </p>
            </div>
            <div className="rounded-xl2 bg-surface-2 p-4">
              <p className="flex items-center gap-2 text-small font-medium text-ink-2">
                <Lightbulb className="w-4 h-4 text-accent-strong" />
                فكرة أهدأ وأصدق
              </p>
              <p className="text-body text-ink leading-relaxed mt-2">{result.reframedThought}</p>
            </div>
            <div className="rounded-xl2 bg-brand-soft p-4">
              <p className="flex items-center gap-2 text-small font-medium text-brand">
                <Footprints className="w-4 h-4" />
                خطوتك التالية الصغيرة
              </p>
              <p className="text-body text-ink leading-relaxed mt-2">{result.nextSmallAction}</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  const state = useAppStore.getState();
                  if (state.frogs.filter((f) => !f.isCompleted).length < 3) {
                    const res = state.appendFrog(result.nextSmallAction, "QUALITY");
                    if (res.ok) {
                      state.updateFrog(res.id, { definitionOfDone: result.nextSmallAction });
                    }
                  }
                  state.resetFocus("FLUENCY_15");
                  router.push("/app");
                }}
              >
                <Play className="w-4 h-4 fill-current ml-1.5" />
                نفّذ هذه الخطوة الآن (أضفها لأولويات اليوم)
              </Button>
              <SendTo title={result.nextSmallAction} label="أو احفظها:" className="mt-3" />
            </div>
          </Card>
        ) : (
          <Card className="border-dashed shadow-none">
            <EmptyState
              icon={BrainCircuit}
              title="الفكرة ليست حقيقة"
              description="اكتب ما يقوله لك عقلك الآن. سنكشف الفخ الذي فيه، ونقترح فكرة أهدأ وخطوة صغيرة تعيدك للحركة."
            />
          </Card>
        )}
      </div>

      <AiConsentSheet
        open={consentOpen}
        onChoose={(choice) => {
          setConsentOpen(false);
          run(choice);
        }}
      />

      {cbtLogs.length > 0 && (
        <Card as="section" className="p-5 sm:p-7">
          <SectionHeader title="سجلّك" description={`${cbtLogs.length} فكرة فكّكتها حتى الآن.`} />
          <ul className="mt-4 divide-y divide-line">
            {cbtLogs.slice(0, 5).map((log) => (
              <li key={log.id} className="py-3.5 first:pt-0 last:pb-0">
                <p className="text-ui text-ink-3 line-through decoration-ink-3/40">{log.automaticThought}</p>
                <p className="text-body text-ink mt-1 flex gap-2">
                  <ArrowLeft className="w-4 h-4 shrink-0 mt-1 text-brand" />
                  {log.reframedThought}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
