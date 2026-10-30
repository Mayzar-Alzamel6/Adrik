import React, { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore, type Project } from "@/stores/useProjectsStore";
import { isCrisis } from "@/lib/safety/analysis";
import { askBreakdown, coachAccess } from "@/lib/ai/coachClient";
import { loadCoachConsent } from "@/lib/ai/coachConsent";
import { COACH_TEXT } from "@/lib/ai/texts";
import { ROW, radius, useColors } from "@/theme";
import { Button, Input, Label, MiniChip, Row, Sheet, Txt } from "@/components/ui";
import { SendTo } from "@/components/flow/SendTo";
import { CrisisSupport } from "@/components/tools/CrisisSupport";
import { CoachConsentPanel } from "@/components/ai/CoachConsent";

export type BreakdownTarget = { kind: "new" } | { kind: "project"; project: Project };

interface Draft {
  projectName: string;
  description: string;
  valueIds: string[];
  tasks: { title: string; checked: boolean }[];
  firstStep: string;
}

type Phase =
  | { name: "input" }
  | { name: "consent" }
  | { name: "loading" }
  | { name: "message"; text: string }
  | { name: "crisis" }
  | { name: "result"; draft: Draft }
  | { name: "done"; projectId: string; firstStep: string; text: string };

/**
 * The coach's first job, on the phone (the web's components/ai/BreakdownSheet.tsx): a vague goal becomes a project
 * with small tasks and one first step for today. The AI only suggests; nothing lands until the person confirms.
 */
export function BreakdownSheet({
  target,
  onClose,
  onCreated,
}: {
  target: BreakdownTarget | null;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const project = target?.kind === "project" ? target.project : null;
  return (
    <Sheet
      open={Boolean(target)}
      onClose={onClose}
      title={project ? "اقترح الخطوات التالية" : "ابدأ من هدف"}
      description={
        project ? `«${project.name}»: مهام صغيرة لم تكتبها بعد، وخطوة أولى لليوم.` : "اكتب ما تريده كما هو، ولو كان ضبابياً. المدرّب يحوّله إلى مشروع ومهام صغيرة."
      }
    >
      {/* Mounted per opening, so every opening starts fresh. */}
      {target ? <BreakdownBody target={target} onClose={onClose} onCreated={onCreated} /> : null}
    </Sheet>
  );
}

function BreakdownBody({
  target,
  onClose,
  onCreated,
}: {
  target: BreakdownTarget;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}) {
  const c = useColors();
  const values = useAppStore((s) => s.values);
  const [phase, setPhase] = useState<Phase>({ name: "input" });
  const [goal, setGoal] = useState("");
  const [details, setDetails] = useState("");

  const project = target.kind === "project" ? target.project : null;
  const goalText = project ? project.name : goal;
  const detailText = project ? [project.description, details].filter(Boolean).join("\n") : details;

  const run = async (consent?: "ai" | "local" | null) => {
    if (isCrisis({ automaticThought: goalText, event: detailText })) return setPhase({ name: "crisis" });
    setPhase({ name: "loading" });
    const access = await coachAccess();
    if (access !== "ready") return setPhase({ name: "message", text: COACH_TEXT.access[access] });
    const choice = consent === undefined ? await loadCoachConsent() : consent;
    if (choice === null) return setPhase({ name: "consent" });
    if (choice !== "ai") return setPhase({ name: "message", text: COACH_TEXT.noConsent });

    try {
      const reply = await askBreakdown({
        mode: project ? "project" : "new",
        goal: goalText,
        details: detailText,
        values: values.map((v) => ({ id: v.id, title: v.title })),
        existingTasks: project?.tasks.filter((t) => t.status !== "DONE").map((t) => t.title) ?? [],
        doneTasks: project?.tasks.filter((t) => t.status === "DONE").map((t) => t.title) ?? [],
      });
      if (reply.status === "crisis") return setPhase({ name: "crisis" });
      if (reply.status === "unavailable") return setPhase({ name: "message", text: COACH_TEXT.access["no-key"] });
      if (reply.status !== "ok") return setPhase({ name: "message", text: COACH_TEXT.failed });
      const b = reply.breakdown;
      setPhase({
        name: "result",
        draft: {
          projectName: b.projectName || goalText.slice(0, 80),
          description: b.description,
          valueIds: b.valueIds,
          tasks: b.tasks.map((title) => ({ title, checked: true })),
          firstStep: b.firstStep,
        },
      });
    } catch {
      setPhase({ name: "message", text: COACH_TEXT.failed });
    }
  };

  const apply = (draft: Draft) => {
    const store = useProjectsStore.getState();
    const picked = draft.tasks.filter((t) => t.checked && t.title.trim());
    let projectId = project?.id;
    if (!projectId) {
      projectId = store.addProject({ name: draft.projectName || goalText, description: draft.description, valueIds: draft.valueIds });
      onCreated?.(projectId);
    }
    for (const t of picked) store.addTask(projectId, t.title);
    const count = picked.length === 1 ? "مهمة واحدة" : picked.length === 2 ? "مهمتان" : `${picked.length} مهام`;
    setPhase({ name: "done", projectId, firstStep: draft.firstStep, text: project ? `أُضيفت ${count} إلى المشروع.` : `أُنشئ المشروع ومعه ${count}.` });
  };

  return (
    <>
      {phase.name === "input" ? (
        <View style={{ gap: 12 }}>
          {!project ? (
            <View>
              <Label>ماذا تريد؟</Label>
              <Input value={goal} onChangeText={setGoal} placeholder="مثال: أبغى أتعلم البرمجة وأشتغل فيها" multiline maxLength={500} />
            </View>
          ) : null}
          <View>
            <Label hint="اختياري">{project ? "ما الذي تريد الوصول إليه الآن؟" : "ما الذي تعرفه عنه حتى الآن؟"}</Label>
            <Input
              value={details}
              onChangeText={setDetails}
              placeholder={project ? "مثال: أريد نسخة أولى قبل نهاية الشهر" : "مثال: عندي ساعة مساءً، وبدأت مرة ولم أكمل"}
              multiline
              maxLength={1000}
            />
          </View>
          <Button title="فكّك" icon="zap" disabled={!goalText.trim()} onPress={() => run()} />
        </View>
      ) : null}

      {phase.name === "consent" ? <CoachConsentPanel onChoose={(choice) => run(choice)} /> : null}

      {phase.name === "loading" ? (
        <View style={{ paddingVertical: 28, alignItems: "center", gap: 10 }}>
          <ActivityIndicator color={c.brand} />
          <Txt variant="ui" color="ink2">
            المدرّب يفكك الهدف…
          </Txt>
        </View>
      ) : null}

      {phase.name === "message" ? (
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 14 }}>
            <Txt>{phase.text}</Txt>
          </View>
          <Row>
            <Button title="رجوع" variant="secondary" onPress={() => setPhase({ name: "input" })} />
            <Button title="إغلاق" variant="ghost" onPress={onClose} />
          </Row>
        </View>
      ) : null}

      {phase.name === "crisis" ? <CrisisSupport onDone={onClose} /> : null}

      {phase.name === "result" ? (
        <ResultForm
          draft={phase.draft}
          isNew={!project}
          values={values}
          onChange={(draft) => setPhase({ name: "result", draft })}
          onApply={apply}
          onRetry={() => run()}
        />
      ) : null}

      {phase.name === "done" ? (
        <View style={{ gap: 12 }}>
          <Txt variant="ui" color="brand" weight="medium">
            {phase.text}
          </Txt>
          <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.accent, backgroundColor: c.accentSoft, padding: 14, gap: 10 }}>
            <Row gap={6}>
              <Feather name="target" size={14} color={c.accentStrong} />
              <Txt variant="caption" weight="medium" color="accentStrong">
                الخطوة الأولى (25 دقيقة أو أقل)
              </Txt>
            </Row>
            <Txt weight="medium">{phase.firstStep}</Txt>
            <SendTo title={phase.firstStep} links={{ projectId: phase.projectId }} label="ابدأ بها:" />
          </View>
          <Button title="تم" variant="secondary" onPress={onClose} />
        </View>
      ) : null}
    </>
  );
}

function ResultForm({
  draft,
  isNew,
  values,
  onChange,
  onApply,
  onRetry,
}: {
  draft: Draft;
  isNew: boolean;
  values: { id: string; title: string }[];
  onChange: (d: Draft) => void;
  onApply: (d: Draft) => void;
  onRetry: () => void;
}) {
  const c = useColors();
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const setTask = (i: number, patch: Partial<Draft["tasks"][number]>) => set({ tasks: draft.tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const toggleValue = (id: string) => set({ valueIds: draft.valueIds.includes(id) ? draft.valueIds.filter((v) => v !== id) : [...draft.valueIds, id] });
  const picked = draft.tasks.filter((t) => t.checked && t.title.trim()).length;

  return (
    <View style={{ gap: 14 }}>
      {isNew ? (
        <>
          <View>
            <Label>اسم المشروع</Label>
            <Input value={draft.projectName} onChangeText={(projectName) => set({ projectName })} maxLength={80} />
          </View>
          <View>
            <Label>الوصف</Label>
            <Input value={draft.description} onChangeText={(description) => set({ description })} multiline maxLength={300} />
          </View>
          {values.length > 0 ? (
            <View>
              <Label>يخدم قيمك</Label>
              <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
                {values.map((v) => (
                  <MiniChip key={v.id} label={v.title} icon="heart" selected={draft.valueIds.includes(v.id)} onPress={() => toggleValue(v.id)} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={{ gap: 8 }}>
        <Label hint="اختر ما يناسبك وعدّل الصياغة">المهام المقترحة</Label>
        {draft.tasks.map((t, i) => (
          <Row key={i} gap={8}>
            <Pressable
              onPress={() => setTask(i, { checked: !t.checked })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: t.checked }}
              accessibilityLabel={`اختيار المهمة ${i + 1}`}
              hitSlop={8}
            >
              <Feather name={t.checked ? "check-square" : "square"} size={22} color={t.checked ? c.brand : c.ink3} />
            </Pressable>
            <View style={{ flex: 1, opacity: t.checked ? 1 : 0.5 }}>
              {/* Multiline so a long suggestion wraps instead of hiding past the phone's edge. */}
              <Input value={t.title} onChangeText={(title) => setTask(i, { title })} maxLength={140} multiline style={{ minHeight: 48 }} accessibilityLabel={`المهمة ${i + 1}`} />
            </View>
          </Row>
        ))}
      </View>

      <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.accent, backgroundColor: c.accentSoft, padding: 14 }}>
        <Label>الخطوة الأولى لليوم</Label>
        <Input value={draft.firstStep} onChangeText={(firstStep) => set({ firstStep })} maxLength={140} multiline style={{ minHeight: 48 }} />
      </View>

      <Button
        title={isNew ? "أنشئ المشروع" : `أضف ${picked} إلى المشروع`}
        disabled={picked === 0 || (isNew && !draft.projectName.trim())}
        onPress={() => onApply(draft)}
      />
      <Button title="اقتراح آخر" icon="zap" variant="secondary" onPress={onRetry} />
      <Txt variant="caption" color="ink3">
        {COACH_TEXT.engine.ai}
      </Txt>
    </View>
  );
}
