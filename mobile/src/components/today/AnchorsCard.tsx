import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { MAX_ANCHORS, MAX_TASKS_PER_ANCHOR, useAppStore, type AnchorPriority } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { successFeedback, warningFeedback } from "@/lib/feedback";
import { ROW, useColors } from "@/theme";
import { Button, Card, Chip, IconButton, Input, Label, LinkButton, Row, Sheet, Txt } from "@/components/ui";

/**
 * Up to three priorities that stay until closed by hand, each tied to one project.
 * Each day, tasks are pulled from the anchor's project; they appear in today's list under the anchor.
 */
export function AnchorsCard() {
  const c = useColors();
  const anchors = useAppStore((s) => s.anchors);
  const frogs = useAppStore((s) => s.frogs);
  const moveAnchor = useAppStore((s) => s.moveAnchor);
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const projects = useProjectsStore((s) => s.projects);
  const [adding, setAdding] = useState(false);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const open = anchors.filter((a) => !a.closedAt).sort((a, b) => a.order - b.order);
  const pulling = open.find((a) => a.id === pullingId);
  const closing = open.find((a) => a.id === closingId);

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Txt variant="title" weight="semibold">
            🎯 الأولويات الثابتة
          </Txt>
          <Txt variant="small" color="ink3">
            {open.length}/{MAX_ANCHORS} · تبقى كل يوم حتى تغلقها
          </Txt>
        </View>
        {open.length < MAX_ANCHORS && projects.length > 0 ? (
          <Button title="أولوية" icon="plus" size="sm" variant="secondary" onPress={() => setAdding(true)} />
        ) : null}
      </Row>

      {projects.length === 0 ? (
        <LinkButton title="أنشئ مشروعاً أولاً، ثم اجعله أولوية ثابتة" icon="folder" onPress={() => router.push("/tool/projects")} />
      ) : open.length === 0 ? (
        <Txt variant="ui" color="ink2">
          مثال: «دراسة الألمانية A2» مرتبطة بمشروعها. كل يوم تسحب منها حتى {MAX_TASKS_PER_ANCHOR} مهام.
        </Txt>
      ) : (
        open.map((a, i) => {
          const project = projects.find((p) => p.id === a.projectId);
          const todays = frogs.filter((f) => f.anchorId === a.id && !f.isDropped);
          const openToday = todays.filter((f) => !f.isCompleted).length;
          return (
            <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line, paddingTop: i ? 12 : 0, gap: 6 }}>
              <Row gap={10} style={{ alignItems: "flex-start" }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i === 0 ? c.brand : c.surface2, alignItems: "center", justifyContent: "center" }}>
                  <Txt variant="small" weight="semibold" color={i === 0 ? "brandInk" : "ink2"}>
                    {i + 1}
                  </Txt>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt weight="semibold">{a.title}</Txt>
                  <Txt variant="caption" color="ink3">
                    📁 {project?.name ?? "مشروع محذوف"}
                    {a.goal ? ` · الهدف: ${a.goal}` : ""}
                    {a.targetDate ? ` · ${a.targetDate}` : ""}
                  </Txt>
                  <Txt variant="caption" color={openToday ? "brand" : "ink3"}>
                    اليوم: {todays.filter((f) => f.isCompleted).length} منجزة · {openToday} مفتوحة
                  </Txt>
                </View>
                {!isFocusRunning && i > 0 ? <IconButton icon="chevron-up" label={`ارفع «${a.title}»`} onPress={() => moveAnchor(a.id, i - 1)} /> : null}
                {!isFocusRunning && i < open.length - 1 ? (
                  <IconButton icon="chevron-down" label={`أنزل «${a.title}»`} onPress={() => moveAnchor(a.id, i + 1)} />
                ) : null}
              </Row>
              <Row>
                <Button
                  title="＋ سحب مهمة"
                  size="sm"
                  variant="secondary"
                  disabled={!project || openToday >= MAX_TASKS_PER_ANCHOR}
                  onPress={() => setPullingId(a.id)}
                />
                <Button title="إغلاق" size="sm" variant="ghost" onPress={() => setClosingId(a.id)} />
              </Row>
            </View>
          );
        })
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="أولوية ثابتة جديدة" description="مرتبطة بمشروع واحد، وتبقى حتى تغلقها بنفسك.">
        {adding ? <AddAnchor onDone={() => setAdding(false)} /> : null}
      </Sheet>

      <Sheet open={Boolean(pulling)} onClose={() => setPullingId(null)} title={pulling ? `سحب مهمة · ${pulling.title}` : undefined}>
        {pulling ? <PullTask anchor={pulling} onDone={() => setPullingId(null)} /> : null}
      </Sheet>

      <Sheet open={Boolean(closing)} onClose={() => setClosingId(null)} title="إغلاق الأولوية الثابتة؟" description="مهام اليوم تبقى، ولن تُسحب منها مهام جديدة.">
        {closing ? (
          <Row>
            <Button
              title="أغلقها"
              variant="danger"
              onPress={() => {
                useAppStore.getState().closeAnchor(closing.id);
                setClosingId(null);
              }}
            />
            <Button title="تراجع" variant="ghost" onPress={() => setClosingId(null)} />
          </Row>
        ) : null}
      </Sheet>
    </Card>
  );
}

function AddAnchor({ onDone }: { onDone: () => void }) {
  const anchors = useAppStore((s) => s.anchors);
  const projects = useProjectsStore((s) => s.projects);
  const taken = new Set(anchors.filter((a) => !a.closedAt).map((a) => a.projectId));
  const free = projects.filter((p) => !taken.has(p.id));
  const [projectId, setProjectId] = useState(free[0]?.id);
  const project = free.find((p) => p.id === projectId);
  const [title, setTitle] = useState(project?.name ?? "");
  const [goal, setGoal] = useState("");
  const [targetDate, setTargetDate] = useState(project?.targetDate ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!free.length) {
    return (
      <Txt variant="ui" color="ink2">
        كل مشاريعك مرتبطة بأولويات ثابتة. أنشئ مشروعاً جديداً أولاً.
      </Txt>
    );
  }

  const save = () => {
    if (!projectId) return;
    const date = targetDate.trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("التاريخ بصيغة 2026-12-31.");
      return;
    }
    const res = useAppStore.getState().addAnchor({ title, projectId, goal, targetDate: date || undefined });
    if (!res.ok) {
      warningFeedback();
      setError(res.message);
      return;
    }
    successFeedback();
    onDone();
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Label>المشروع</Label>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {free.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              selected={p.id === projectId}
              onPress={() => {
                setProjectId(p.id);
                setTitle(p.name);
                setTargetDate(p.targetDate ?? "");
              }}
            />
          ))}
        </View>
      </View>
      <View>
        <Label>اسم الأولوية</Label>
        <Input value={title} onChangeText={setTitle} placeholder="مثال: دراسة الألمانية A2" maxLength={80} />
      </View>
      <View>
        <Label hint="النتيجة التي تُغلق عندها هذه الأولوية.">الهدف البعيد</Label>
        <Input value={goal} onChangeText={setGoal} placeholder="مثال: اجتياز امتحان Goethe A2" maxLength={140} />
      </View>
      <View>
        <Label>التاريخ المستهدف (اختياري)</Label>
        <Input value={targetDate} onChangeText={setTargetDate} placeholder="2026-12-31" maxLength={10} keyboardType="numbers-and-punctuation" />
      </View>
      {error ? (
        <Txt variant="ui" color="danger">
          {error}
        </Txt>
      ) : null}
      <Button title="ثبّت الأولوية" icon="anchor" disabled={!title.trim()} onPress={save} />
    </View>
  );
}

function PullTask({ anchor, onDone }: { anchor: AnchorPriority; onDone: () => void }) {
  const c = useColors();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === anchor.projectId));
  const frogs = useAppStore((s) => s.frogs);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!project) return null;

  const inToday = new Set(frogs.filter((f) => !f.isCompleted && !f.isDropped && f.projectTaskId).map((f) => f.projectTaskId));
  const todo = project.tasks.filter((t) => t.status !== "DONE");

  const pull = (taskId: string) => {
    const res = useAppStore.getState().pullAnchorTask(anchor.id, taskId);
    if (res.ok) {
      successFeedback();
      onDone();
    } else {
      warningFeedback();
      setError(res.message);
    }
  };

  const addNew = () => {
    const taskId = useProjectsStore.getState().addTask(project.id, title);
    if (taskId) pull(taskId);
  };

  return (
    <View style={{ gap: 12 }}>
      {error ? (
        <Txt variant="ui" color="danger">
          {error}
        </Txt>
      ) : null}
      {todo.length === 0 ? (
        <Txt variant="small" color="ink3">
          لا مهام مفتوحة في «{project.name}». أضف واحدة بالأسفل.
        </Txt>
      ) : (
        todo.map((t, i) => {
          const already = inToday.has(t.id);
          return (
            <Pressable
              key={t.id}
              disabled={already}
              onPress={() => pull(t.id)}
              accessibilityRole="button"
              style={({ pressed }) => ({ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, opacity: already ? 0.5 : pressed ? 0.7 : 1 })}
            >
              <Row gap={10}>
                <Txt style={{ flex: 1 }}>{t.title}</Txt>
                {already ? (
                  <Txt variant="caption" color="brand">
                    في اليوم
                  </Txt>
                ) : (
                  <Feather name="arrow-down-circle" size={18} color={c.ink3} />
                )}
              </Row>
            </Pressable>
          );
        })
      )}
      <View>
        <Label hint="تُضاف إلى المشروع وتُسحب لليوم معاً.">مهمة جديدة</Label>
        <Row>
          <View style={{ flex: 1 }}>
            <Input value={title} onChangeText={setTitle} placeholder="مثال: درس 4 + 20 كلمة" maxLength={140} returnKeyType="done" onSubmitEditing={addNew} />
          </View>
          <Button title="أضف" icon="plus" disabled={!title.trim()} onPress={addNew} />
        </Row>
      </View>
    </View>
  );
}
