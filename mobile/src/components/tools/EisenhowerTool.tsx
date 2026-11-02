import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { usePlannerStore, type EisenhowerCategory, type PlannerCategory } from "@/stores/usePlannerStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { useAppStore } from "@/stores/useAppStore";
import { sendToToday } from "@/lib/flow";
import { toLocalDateString } from "@/lib/utils";
import { ROW, radius, useColors, type ColorName } from "@/theme";
import { Button, Card, IconButton, Input, Label, MiniChip, Row, Txt } from "@/components/ui";

export const QUADRANTS: { id: EisenhowerCategory; title: string; short: string; axis: string; hint: string; tone: ColorName }[] = [
  { id: "EMERGENCY", title: "مربع الطوارئ", short: "طوارئ", axis: "مهم · عاجل، نفّذه فوراً", hint: "تسليمات ومواعيد لا تقبل التأجيل، أو عُطل طارئ. بعد أي طارئ ارجع لخطتك فوراً.", tone: "danger" },
  { id: "QUALITY", title: "استثمر فيه", short: "استثمر فيه", axis: "مهم · غير عاجل", hint: "التعلّم، والمشاريع الكبرى، والتخطيط. هنا يُصنع مستقبلك؛ احمِ له وقتاً يومياً.", tone: "brand" },
  { id: "DELEGATE", title: "فوّضه أو اختصره", short: "فوّضه", axis: "عاجل · غير مهم", hint: "مقاطعات ورسائل وأعمال روتينية تبدو ملحّة ولا تصنع فرقاً.", tone: "accent" },
  { id: "ESCAPE", title: "قلّصه", short: "قلّصه", axis: "غير مهم · غير عاجل", hint: "التصفح والتسلية بلا هدف. اعرفه لتحاصره.", tone: "ink3" },
];

/**
 * One task list, two homes: tasks written here, and the tasks of every project.
 * A project task is sorted on the task itself, so the matrix and the project never disagree.
 */
type Item = {
  key: string;
  title: string;
  category: PlannerCategory;
  done: boolean;
  source: { kind: "planner"; id: string } | { kind: "project"; projectId: string; taskId: string; projectName: string };
};

export function EisenhowerTool() {
  const c = useColors();
  const { tasks, addTask, toggleTask, deleteTask, updateTaskCategory } = usePlannerStore();
  const projects = useProjectsStore((s) => s.projects);
  const frogs = useAppStore((s) => s.frogs);

  const [draft, setDraft] = useState("");
  const [draftProject, setDraftProject] = useState("");
  const [draftQuadrant, setDraftQuadrant] = useState<PlannerCategory>("INBOX");
  const [drafts, setDrafts] = useState<Record<EisenhowerCategory, string>>({ QUALITY: "", EMERGENCY: "", DELEGATE: "", ESCAPE: "" });
  const [movingKey, setMovingKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const today = toLocalDateString();
  const items: Item[] = useMemo(
    () => [
      ...tasks.map<Item>((t) => ({ key: t.id, title: t.title, category: t.category, done: t.isCompleted, source: { kind: "planner", id: t.id } })),
      ...projects.flatMap((p) =>
        p.tasks
          // Finished project tasks stay visible on the day they were finished, like ticked matrix tasks.
          .filter((t) => t.status !== "DONE" || (t.doneAt && toLocalDateString(new Date(t.doneAt)) === today))
          .map<Item>((t) => ({
            key: t.id,
            title: t.title,
            category: t.quadrant ?? "INBOX",
            done: t.status === "DONE",
            source: { kind: "project", projectId: p.id, taskId: t.id, projectName: p.name },
          }))
      ),
    ],
    [tasks, projects, today]
  );
  const inbox = items.filter((i) => i.category === "INBOX" && !i.done);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2400);
  };

  const create = (title: string, quadrant: PlannerCategory, projectId: string) => {
    if (!title.trim()) return;
    if (projectId) useProjectsStore.getState().addTask(projectId, title, quadrant === "INBOX" ? undefined : quadrant);
    else addTask(title.trim(), quadrant);
  };

  const submitMain = () => {
    create(draft, draftQuadrant, draftProject);
    setDraft("");
  };

  const submitQuadrant = (cat: EisenhowerCategory) => {
    create(drafts[cat], cat, "");
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  const move = (item: Item, cat: PlannerCategory) => {
    if (item.source.kind === "planner") updateTaskCategory(item.source.id, cat);
    else useProjectsStore.getState().setTaskQuadrant(item.source.projectId, item.source.taskId, cat === "INBOX" ? undefined : cat);
    setMovingKey(null);
  };

  /** Moves a loose matrix task into a project, keeping its quadrant. */
  const attachToProject = (item: Item, projectId: string) => {
    if (item.source.kind !== "planner") return;
    useProjectsStore.getState().addTask(projectId, item.title, item.category === "INBOX" ? undefined : item.category);
    deleteTask(item.source.id);
    setMovingKey(null);
    notify(`نُقلت إلى مشروع «${projects.find((p) => p.id === projectId)?.name ?? ""}».`);
  };

  const toggle = (item: Item) => {
    if (item.source.kind === "planner") return toggleTask(item.source.id);
    const done = !item.done;
    useProjectsStore.getState().setTaskStatus(item.source.projectId, item.source.taskId, done ? "DONE" : "DOING");
    useAppStore.getState().syncFrogWithProjectTask(item.source.taskId, done);
  };

  const inToday = (item: Item) =>
    frogs.some((f) => !f.isCompleted && (item.source.kind === "project" ? f.projectTaskId === item.source.taskId : f.title === item.title));

  const promote = (item: Item) => {
    if (item.source.kind === "project") {
      const res = useAppStore.getState().addFrogFromProjectTask(item.source.projectId, item.source.taskId);
      return notify(res.ok ? "أُضيفت إلى أولويات اليوم." : res.message);
    }
    const res = sendToToday(item.title);
    if (res.ok && item.category === "EMERGENCY") {
      const added = useAppStore.getState().frogs.at(-1);
      if (added) useAppStore.getState().updateFrog(added.id, { category: "EMERGENCY" });
    }
    notify(res.message);
  };

  const tone = (cat: PlannerCategory) => (cat === "INBOX" ? c.lineStrong : c[QUADRANTS.find((q) => q.id === cat)!.tone]);

  const MoveTools = ({ item, withInbox }: { item: Item; withInbox?: boolean }) => (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
        {[...QUADRANTS.map((q) => ({ id: q.id as PlannerCategory, short: q.short })), ...(withInbox ? [{ id: "INBOX" as const, short: "الصندوق" }] : [])]
          .filter((o) => o.id !== item.category)
          .map((o) => (
            <MiniChip key={o.id} label={o.short} dot={tone(o.id)} onPress={() => move(item, o.id)} />
          ))}
      </View>
      {item.source.kind === "planner" && projects.length > 0 ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <Txt variant="caption" color="ink3">
            انقلها إلى مشروع:
          </Txt>
          {projects.map((p) => (
            <MiniChip key={p.id} label={p.name} icon="folder" onPress={() => attachToProject(item, p.id)} />
          ))}
        </View>
      ) : null}
    </View>
  );

  const ItemRow = ({ item, inInbox }: { item: Item; inInbox?: boolean }) => (
    <View style={{ gap: 6, paddingVertical: 6 }}>
      <Row gap={6}>
        {inInbox ? null : (
          <Pressable
            onPress={() => toggle(item)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.done }}
            hitSlop={8}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: item.done ? c.brand : c.lineStrong,
              backgroundColor: item.done ? c.brand : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.done ? <Feather name="check" size={12} color={c.brandInk} /> : null}
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Txt style={item.done ? { textDecorationLine: "line-through" } : null} color={item.done ? "ink3" : "ink"}>
            {item.title}
          </Txt>
          {item.source.kind === "project" ? (
            <Row gap={4}>
              <Feather name="folder" size={12} color={c.ink3} />
              <Txt variant="caption" color="ink3" numberOfLines={1}>
                {item.source.projectName}
              </Txt>
            </Row>
          ) : null}
        </View>
        {item.done || item.category === "ESCAPE" ? null : inToday(item) ? (
          <Txt variant="caption" color="brand">
            في اليوم
          </Txt>
        ) : (
          <IconButton icon="target" label="أضف لأولويات اليوم" onPress={() => promote(item)} />
        )}
        {inInbox ? null : (
          <IconButton icon="shuffle" label="إعادة تصنيف" active={movingKey === item.key} onPress={() => setMovingKey(movingKey === item.key ? null : item.key)} />
        )}
        {item.source.kind === "planner" ? <IconButton icon="trash-2" label="حذف" onPress={() => deleteTask((item.source as { id: string }).id)} /> : null}
      </Row>
      {inInbox ? <MoveTools item={item} /> : movingKey === item.key ? <MoveTools item={item} withInbox /> : null}
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      {flash ? (
        <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, padding: 12 }}>
          <Txt variant="ui" color="brand">
            {flash}
          </Txt>
        </View>
      ) : null}

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Row gap={6}>
              <Feather name="inbox" size={18} color={c.ink3} />
              <Txt variant="subtitle" weight="semibold">
                صندوق المهام
              </Txt>
            </Row>
            <Txt variant="small" color="ink2">
              كل مهامك في مكان واحد: ما تكتبه هنا ومهام مشاريعك. اكتب الآن، وصنّف حين يهدأ ذهنك.
            </Txt>
          </View>
          <Txt variant="small" color="ink3">
            {inbox.length}
          </Txt>
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Input value={draft} onChangeText={setDraft} placeholder="مهمة جديدة" returnKeyType="done" onSubmitEditing={submitMain} accessibilityLabel="إضافة مهمة" />
          </View>
          <Button title="أضف" icon="plus" variant="secondary" disabled={!draft.trim()} onPress={submitMain} />
        </Row>
        {draft.trim() ? (
          <View style={{ gap: 8 }}>
            <View>
              <Label>المربع</Label>
              <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
                <MiniChip label="صنّفها لاحقاً" selected={draftQuadrant === "INBOX"} onPress={() => setDraftQuadrant("INBOX")} />
                {QUADRANTS.map((q) => (
                  <MiniChip key={q.id} label={q.short} dot={c[q.tone]} selected={draftQuadrant === q.id} onPress={() => setDraftQuadrant(q.id)} />
                ))}
              </View>
            </View>
            {projects.length > 0 ? (
              <View>
                <Label>المشروع</Label>
                <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
                  <MiniChip label="بلا مشروع" selected={!draftProject} onPress={() => setDraftProject("")} />
                  {projects.map((p) => (
                    <MiniChip key={p.id} label={p.name} icon="folder" selected={draftProject === p.id} onPress={() => setDraftProject(p.id)} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
        {inbox.map((item, i) => (
          <View key={item.key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}>
            <ItemRow item={item} inInbox />
          </View>
        ))}
      </Card>

      {QUADRANTS.map((q) => {
        const list = items.filter((i) => i.category === q.id);
        return (
          <Card key={q.id} style={{ gap: 6 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c[q.tone] }} />
                  <Txt variant="caption" color="ink3">
                    {q.axis}
                  </Txt>
                </Row>
                <Txt variant="subtitle" weight="semibold">
                  {q.title}
                </Txt>
              </View>
              <Txt variant="small" color="ink3">
                {list.filter((i) => !i.done).length}
              </Txt>
            </Row>
            <Txt variant="small" color="ink2">
              {q.hint}
            </Txt>
            {list.map((item) => (
              <ItemRow key={item.key} item={item} />
            ))}
            <Input
              value={drafts[q.id]}
              onChangeText={(v) => setDrafts((d) => ({ ...d, [q.id]: v }))}
              placeholder="أضف مهمة"
              returnKeyType="done"
              onSubmitEditing={() => submitQuadrant(q.id)}
              accessibilityLabel={`إضافة مهمة إلى ${q.title}`}
            />
          </Card>
        );
      })}
      <Txt variant="small" color="ink3">
        أيقونة الهدف تضيف المهمة إلى أولويات اليوم، وأيقونة الأسهم تعيد تصنيفها.
      </Txt>
    </View>
  );
}
