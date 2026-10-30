import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppStore, type CoreValueItem, type SkillProjectItem } from "@/stores/useAppStore";
import { projectProgress, useProjectsStore, type Project, type ProjectTaskStatus } from "@/stores/useProjectsStore";
import { toLocalDateString } from "@/lib/utils";
import { QUADRANTS } from "@/components/tools/EisenhowerTool";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Chip, IconButton, Input, Label, LinkButton, ProgressBar, Row, Segmented, Sheet, Txt } from "@/components/ui";
import { BreakdownSheet, type BreakdownTarget } from "@/components/ai/BreakdownSheet";
import { PERSONAL_SYNC_ENABLED } from "@/lib/sync/flag";

const STATUS: { value: ProjectTaskStatus; label: string }[] = [
  { value: "TODO", label: "لم تبدأ" },
  { value: "DOING", label: "قيد العمل" },
  { value: "DONE", label: "منجزة" },
];

type Filter = "ALL" | ProjectTaskStatus;
type Draft = { name: string; description: string; targetDate: string; skill: string; valueIds: string[] };
const EMPTY_DRAFT: Draft = { name: "", description: "", targetDate: "", skill: "", valueIds: [] };
type SkillResult = { ok: true; id: string } | { ok: false; openSkill?: string };

/** Links an existing skill by name, or starts a new track (only one unfinished track is allowed at a time). */
function resolveSkill(name: string): SkillResult {
  const app = useAppStore.getState();
  const title = name.trim();
  const existing = app.skills.find((s) => s.title.trim() === title);
  if (existing) return { ok: true, id: existing.id };
  const res = app.addSkillProject(title, 20);
  if (!res.success) {
    const open = app.skills.find((s) => s.isLocked && s.loggedHours < s.targetHours);
    return { ok: false, openSkill: open?.title };
  }
  const created = useAppStore.getState().skills.at(-1);
  return created ? { ok: true, id: created.id } : { ok: false };
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
  } catch {
    return date;
  }
}

function days(n: number) {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

function deadline(p: Project, percent: number): { text: string; tone: "neutral" | "brand" | "accent" | "danger" } | null {
  if (!p.targetDate) return null;
  if (percent === 100 && p.tasks.length > 0) return { text: "مكتمل", tone: "brand" };
  const [y, m, d] = p.targetDate.split("-").map(Number);
  const [ty, tm, td] = toLocalDateString().split("-").map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000);
  if (diff < 0) return { text: `متأخر ${days(-diff)}`, tone: "danger" };
  if (diff === 0) return { text: "الموعد اليوم", tone: "accent" };
  return { text: `باقٍ ${days(diff)}`, tone: diff <= 7 ? "accent" : "neutral" };
}

/** Quick target-date presets instead of a native date picker. */
const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "أسبوع", days: 7 },
  { label: "أسبوعان", days: 14 },
  { label: "شهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
];
const inDays = (n: number) => toLocalDateString(new Date(Date.now() + n * 86_400_000));

export function ProjectsTool() {
  const c = useColors();
  const { projects, addProject, updateProject, deleteProject, addTask, setTaskStatus, deleteTask, linkSkill, unlinkSkill } = useProjectsStore();
  const skills = useAppStore((s) => s.skills);
  const values = useAppStore((s) => s.values);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "new" | "edit"; draft: Draft } | null>(null);
  const [skillError, setSkillError] = useState<string | undefined | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [newTask, setNewTask] = useState("");
  // The coach is the founder's prototype: personal builds only.
  const [breakdown, setBreakdown] = useState<BreakdownTarget | null>(null);

  const selected = projects.find((p) => p.id === selectedId);

  const openNew = () => setSheet({ mode: "new", draft: EMPTY_DRAFT });
  const openEdit = (p: Project) =>
    setSheet({ mode: "edit", draft: { name: p.name, description: p.description, targetDate: p.targetDate ?? "", skill: "", valueIds: p.valueIds ?? [] } });
  const closeSheet = () => {
    setSheet(null);
    setConfirmDelete(false);
    setSkillError(null);
  };
  const setDraft = (patch: Partial<Draft>) => sheet && setSheet({ ...sheet, draft: { ...sheet.draft, ...patch } });

  const saveSheet = () => {
    if (!sheet || !sheet.draft.name.trim()) return;
    if (sheet.mode === "new") {
      let skillId: string | undefined;
      if (sheet.draft.skill.trim()) {
        const res = resolveSkill(sheet.draft.skill);
        if (!res.ok) {
          setSkillError(res.openSkill);
          return;
        }
        skillId = res.id;
      }
      const id = addProject({ ...sheet.draft, targetDate: sheet.draft.targetDate || undefined });
      if (skillId) linkSkill(id, skillId);
      setSelectedId(id);
    } else if (selected) {
      updateProject(selected.id, {
        name: sheet.draft.name.trim(),
        description: sheet.draft.description.trim(),
        targetDate: sheet.draft.targetDate || undefined,
        valueIds: sheet.draft.valueIds,
      });
    }
    closeSheet();
  };

  const removeSelected = () => {
    if (!selected) return;
    deleteProject(selected.id);
    setSelectedId(null);
    closeSheet();
  };

  const submitTask = () => {
    if (!selected || !newTask.trim()) return;
    addTask(selected.id, newTask.trim());
    setNewTask("");
  };

  return (
    <View style={{ gap: 16 }}>
      {selected ? (
        <ProjectDetail
          project={selected}
          values={values}
          skills={skills}
          filter={filter}
          onFilter={setFilter}
          newTask={newTask}
          onNewTask={setNewTask}
          onSubmitTask={submitTask}
          onBack={() => {
            setSelectedId(null);
            setFilter("ALL");
          }}
          onEdit={() => openEdit(selected)}
          onStatus={(taskId, status) => {
            setTaskStatus(selected.id, taskId, status);
            useAppStore.getState().syncFrogWithProjectTask(taskId, status === "DONE");
          }}
          onDeleteTask={(taskId) => deleteTask(selected.id, taskId)}
          onSuggest={PERSONAL_SYNC_ENABLED ? () => setBreakdown({ kind: "project", project: selected }) : undefined}
          onLinkSkill={(name) => {
            const res = resolveSkill(name);
            if (res.ok) linkSkill(selected.id, res.id);
            return res;
          }}
          onUnlinkSkill={(skillId) => unlinkSkill(selected.id, skillId)}
        />
      ) : projects.length === 0 ? (
        <Card style={{ gap: 10, alignItems: "stretch" }}>
          <View style={{ alignSelf: "center", width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Feather name="folder" size={22} color={c.brand} />
          </View>
          <Txt variant="subtitle" weight="semibold" align="center">
            ابدأ مشروعك الأول
          </Txt>
          <Txt variant="ui" color="ink2" align="center">
            مشروع = هدف له موعد، مقسّم إلى مهام صغيرة تتقدّم فيها خطوة خطوة وترى نسبة إنجازك.
          </Txt>
          <Button title="مشروع جديد" icon="plus" onPress={openNew} />
          {PERSONAL_SYNC_ENABLED ? <Button title="ابدأ من هدف" icon="zap" variant="secondary" onPress={() => setBreakdown({ kind: "new" })} /> : null}
        </Card>
      ) : (
        <>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="ui" color="ink2">
              {projects.length} {projects.length === 1 ? "مشروع" : "مشاريع"}
            </Txt>
            <Row gap={6}>
              {PERSONAL_SYNC_ENABLED ? (
                <Button title="ابدأ من هدف" icon="zap" variant="secondary" size="sm" onPress={() => setBreakdown({ kind: "new" })} />
              ) : null}
              <Button title="مشروع جديد" icon="plus" size="sm" onPress={openNew} />
            </Row>
          </Row>
          {projects.map((p) => {
            const prog = projectProgress(p);
            const due = deadline(p, prog.percent);
            return (
              <Pressable key={p.id} onPress={() => setSelectedId(p.id)} accessibilityRole="button" accessibilityLabel={`فتح ${p.name}`}>
                <Card style={{ gap: 10 }}>
                  <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="lead" weight="semibold">
                        {p.name}
                      </Txt>
                      {p.description ? (
                        <Txt variant="small" color="ink2" numberOfLines={2}>
                          {p.description}
                        </Txt>
                      ) : null}
                    </View>
                    {due ? <Badge tone={due.tone}>{due.text}</Badge> : null}
                  </Row>
                  <ProjectValues project={p} values={values} compact />
                  <Row style={{ justifyContent: "space-between" }}>
                    <Txt variant="small" color="ink2">
                      {prog.done} من {prog.total} مهام
                    </Txt>
                    <Txt variant="small" weight="semibold">
                      {prog.percent}%
                    </Txt>
                  </Row>
                  <ProgressBar value={prog.percent} />
                </Card>
              </Pressable>
            );
          })}
        </>
      )}

      <BreakdownSheet target={breakdown} onClose={() => setBreakdown(null)} onCreated={(id) => setSelectedId(id)} />

      <Sheet open={sheet !== null} onClose={closeSheet} title={sheet?.mode === "edit" ? "تعديل المشروع" : "مشروع جديد"}>
        {sheet ? (
          <>
            <View>
              <Label>اسم المشروع</Label>
              <Input value={sheet.draft.name} maxLength={80} onChangeText={(v) => setDraft({ name: v })} placeholder="مثال: إطلاق متجري الإلكتروني" />
            </View>
            <View>
              <Label hint="اختياري">وصف قصير</Label>
              <Input multiline value={sheet.draft.description} maxLength={400} onChangeText={(v) => setDraft({ description: v })} placeholder="ما النتيجة التي تريد الوصول إليها؟" />
            </View>
            <View style={{ gap: 6 }}>
              <Label hint="اختياري">الموعد المستهدف</Label>
              <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
                <Chip label="بلا موعد" selected={!sheet.draft.targetDate} onPress={() => setDraft({ targetDate: "" })} />
                {DATE_PRESETS.map((d) => {
                  const date = inDays(d.days);
                  return <Chip key={d.days} label={d.label} selected={sheet.draft.targetDate === date} onPress={() => setDraft({ targetDate: date })} />;
                })}
              </View>
              {sheet.draft.targetDate ? (
                <Txt variant="small" color="ink2">
                  الموعد: {formatDate(sheet.draft.targetDate)}
                </Txt>
              ) : null}
            </View>
            <View style={{ gap: 6 }}>
              <Label hint="المشروع الذي لا يخدم قيمة عندك يستنزف عمرك.">أي قيمة يخدم؟</Label>
              {values.length === 0 ? (
                <Row gap={4} style={{ flexWrap: "wrap" }}>
                  <Txt variant="small" color="ink3">
                    لا قيم بعد.
                  </Txt>
                  <LinkButton
                    title="أضفها من دستور القيم"
                    onPress={() => {
                      closeSheet();
                      router.push("/tool/identity");
                    }}
                  />
                </Row>
              ) : (
                <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
                  {values.map((v) => {
                    const on = sheet.draft.valueIds.includes(v.id);
                    return (
                      <Chip
                        key={v.id}
                        label={`${on ? "♥ " : ""}${v.title}`}
                        selected={on}
                        onPress={() => setDraft({ valueIds: on ? sheet.draft.valueIds.filter((x) => x !== v.id) : [...sheet.draft.valueIds, v.id] })}
                      />
                    );
                  })}
                </View>
              )}
            </View>
            {sheet.mode === "new" ? (
              <View style={{ gap: 6 }}>
                <Label hint="اختياري: تُضاف إلى «تعلّم مهارة» مرتبطةً بهذا المشروع.">مهارة تحتاج تعلّمها</Label>
                <Input
                  value={sheet.draft.skill}
                  maxLength={60}
                  onChangeText={(v) => {
                    setDraft({ skill: v });
                    setSkillError(null);
                  }}
                  placeholder="مثال: التسويق بالمحتوى"
                />
                <SkillSuggestions skills={skills} onPick={(title) => setDraft({ skill: title })} />
                {skillError !== null ? <SkillBlocked openSkill={skillError} onUseOpen={(title) => setDraft({ skill: title })} /> : null}
              </View>
            ) : null}
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <Row>
                <Button title={sheet.mode === "edit" ? "حفظ" : "إنشاء"} disabled={!sheet.draft.name.trim()} onPress={saveSheet} />
                <Button title="إلغاء" variant="ghost" onPress={closeSheet} />
              </Row>
              {sheet.mode === "edit" ? (
                confirmDelete ? (
                  <Row>
                    <Button title="نعم، احذفه" variant="danger" size="sm" onPress={removeSelected} />
                    <Button title="تراجع" variant="ghost" size="sm" onPress={() => setConfirmDelete(false)} />
                  </Row>
                ) : (
                  <Button title="حذف المشروع" icon="trash-2" variant="ghost" size="sm" onPress={() => setConfirmDelete(true)} />
                )
              ) : null}
            </Row>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function ProjectDetail({
  project,
  values,
  skills,
  filter,
  onFilter,
  newTask,
  onNewTask,
  onSubmitTask,
  onBack,
  onEdit,
  onStatus,
  onDeleteTask,
  onSuggest,
  onLinkSkill,
  onUnlinkSkill,
}: {
  project: Project;
  values: CoreValueItem[];
  skills: SkillProjectItem[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  newTask: string;
  onNewTask: (v: string) => void;
  onSubmitTask: () => void;
  onBack: () => void;
  onEdit: () => void;
  onStatus: (taskId: string, status: ProjectTaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  /** Opens the coach's "next steps" for this project; absent where the coach isn't available. */
  onSuggest?: () => void;
  onLinkSkill: (name: string) => SkillResult;
  onUnlinkSkill: (skillId: string) => void;
}) {
  const c = useColors();
  const prog = projectProgress(project);
  const due = deadline(project, prog.percent);
  const count = (s: ProjectTaskStatus) => project.tasks.filter((t) => t.status === s).length;
  const visible = filter === "ALL" ? project.tasks : project.tasks.filter((t) => t.status === filter);
  const frogs = useAppStore((s) => s.frogs);
  const [todayNote, setTodayNote] = useState<string | null>(null);
  const inToday = new Set(frogs.filter((f) => !f.isCompleted && f.projectTaskId).map((f) => f.projectTaskId));
  const toToday = (taskId: string) => {
    const res = useAppStore.getState().addFrogFromProjectTask(project.id, taskId);
    setTodayNote(res.ok ? "أُضيفت إلى أولويات اليوم." : res.message);
    setTimeout(() => setTodayNote(null), 2600);
  };

  return (
    <>
      <Row>
        <LinkButton title="كل المشاريع" icon="chevron-right" color="ink2" onPress={onBack} />
      </Row>

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Txt variant="title" weight="semibold">
              {project.name}
            </Txt>
            {project.description ? <Txt color="ink2">{project.description}</Txt> : null}
          </View>
          <Button title="تعديل" icon="edit-2" variant="ghost" size="sm" onPress={onEdit} />
        </Row>
        <ProjectValues project={project} values={values} onLink={onEdit} />
        {project.targetDate || due ? (
          <Row style={{ flexWrap: "wrap" }}>
            {project.targetDate ? (
              <Row gap={4}>
                <Feather name="calendar" size={14} color={c.ink3} />
                <Txt variant="small" color="ink2">
                  {formatDate(project.targetDate)}
                </Txt>
              </Row>
            ) : null}
            {due ? <Badge tone={due.tone}>{due.text}</Badge> : null}
          </Row>
        ) : null}
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Txt variant="heading">{prog.percent}%</Txt>
          <Txt variant="ui" color="ink2">
            {prog.done} من {prog.total} مهام
          </Txt>
        </Row>
        <ProgressBar value={prog.percent} />
      </Card>

      <LinkedSkills project={project} skills={skills} onLink={onLinkSkill} onUnlink={onUnlinkSkill} />

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt variant="subtitle" weight="semibold">
            المهام
          </Txt>
          {onSuggest ? <LinkButton title="اقترح الخطوات التالية" icon="zap" onPress={onSuggest} /> : null}
        </Row>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          <Chip label={`الكل ${project.tasks.length}`} selected={filter === "ALL"} onPress={() => onFilter("ALL")} />
          {STATUS.map((s) => (
            <Chip key={s.value} label={`${s.label} ${count(s.value)}`} selected={filter === s.value} onPress={() => onFilter(s.value)} />
          ))}
        </View>
        <Row>
          <View style={{ flex: 1 }}>
            <Input
              value={newTask}
              onChangeText={onNewTask}
              maxLength={140}
              placeholder="مهمة جديدة، مثال: تصميم صفحة الدفع"
              accessibilityLabel="مهمة جديدة"
              returnKeyType="done"
              onSubmitEditing={onSubmitTask}
            />
          </View>
          <Button title="إضافة" icon="plus" variant="secondary" disabled={!newTask.trim()} onPress={onSubmitTask} />
        </Row>

        {todayNote ? (
          <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Txt variant="ui" color="brand">
              {todayNote}
            </Txt>
          </View>
        ) : null}

        {visible.length === 0 ? (
          <Txt variant="ui" color="ink3" align="center" style={{ paddingVertical: 12 }}>
            {project.tasks.length === 0 ? "قسّم المشروع إلى مهام صغيرة، كل واحدة تُنجز في جلسة أو جلستين." : "لا مهام في هذه الحالة."}
          </Txt>
        ) : (
          visible.map((t) => (
            <View key={t.id} style={{ gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Row gap={8} style={{ alignItems: "flex-start" }}>
                <View
                  style={{
                    marginTop: 9,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: t.status === "DONE" ? c.brand : t.status === "DOING" ? c.accent : c.line,
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={t.status === "DONE" ? { textDecorationLine: "line-through" } : null} color={t.status === "DONE" ? "ink3" : "ink"}>
                    {t.title}
                  </Txt>
                  {t.quadrant ? (
                    // Where the task sits in the priority matrix; sorting itself happens in the matrix.
                    <Pressable onPress={() => router.push("/tool/eisenhower")} accessibilityLabel="صنّفها في مصفوفة الأولويات" style={{ alignSelf: "flex-end" }}>
                      <Row gap={4} style={{ backgroundColor: c.surface2, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 1 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c[QUADRANTS.find((q) => q.id === t.quadrant)!.tone] }} />
                        <Txt variant="caption" color="ink2">
                          {QUADRANTS.find((q) => q.id === t.quadrant)!.short}
                        </Txt>
                      </Row>
                    </Pressable>
                  ) : null}
                </View>
                {t.status !== "DONE" ? (
                  inToday.has(t.id) ? (
                    <View style={{ marginTop: 8 }}>
                      <Badge tone="brand">في اليوم</Badge>
                    </View>
                  ) : (
                    <IconButton icon="target" label={`أضف ${t.title} لأولويات اليوم`} onPress={() => toToday(t.id)} />
                  )
                ) : null}
                <IconButton icon="trash-2" label={`حذف ${t.title}`} onPress={() => onDeleteTask(t.id)} />
              </Row>
              <Segmented<ProjectTaskStatus> value={t.status} onChange={(s) => onStatus(t.id, s)} options={STATUS} />
            </View>
          ))
        )}
      </Card>
    </>
  );
}

function SkillSuggestions({ skills, onPick }: { skills: SkillProjectItem[]; onPick: (title: string) => void }) {
  if (skills.length === 0) return null;
  return (
    <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
      {skills.map((s) => (
        <Chip key={s.id} label={s.title} onPress={() => onPick(s.title)} />
      ))}
    </View>
  );
}

function SkillBlocked({ openSkill, onUseOpen }: { openSkill?: string; onUseOpen: (title: string) => void }) {
  const c = useColors();
  return (
    <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, padding: 12, gap: 6 }} accessibilityRole="alert">
      {openSkill ? (
        <>
          <Txt variant="small">
            ما زال مسار «{openSkill}» مفتوحاً قبل أول 20 ساعة، ولا يُفتح مسار جديد قبله حتى لا تتشتّت بين المصادر.
          </Txt>
          <LinkButton title={`اربط «${openSkill}» بدلاً منها`} onPress={() => onUseOpen(openSkill)} />
        </>
      ) : (
        <Txt variant="small">تعذّر إضافة المهارة.</Txt>
      )}
    </View>
  );
}

function LinkedSkills({
  project,
  skills,
  onLink,
  onUnlink,
}: {
  project: Project;
  skills: SkillProjectItem[];
  onLink: (name: string) => SkillResult;
  onUnlink: (skillId: string) => void;
}) {
  const c = useColors();
  const linked = (project.skillIds ?? []).map((id) => skills.find((s) => s.id === id)).filter((s): s is SkillProjectItem => Boolean(s));
  const unlinked = skills.filter((s) => !linked.some((l) => l.id === s.id));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [blocked, setBlocked] = useState<string | undefined | null>(null);

  const submit = (value = name) => {
    if (!value.trim()) return;
    const res = onLink(value);
    if (!res.ok) {
      setName(value);
      setBlocked(res.openSkill);
      return;
    }
    setName("");
    setBlocked(null);
    setAdding(false);
  };

  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={6}>
          <Feather name="layers" size={16} color={c.brand} />
          <Txt variant="lead" weight="semibold">
            مهارات يحتاجها المشروع
          </Txt>
        </Row>
        {!adding ? <LinkButton title="+ ربط مهارة" onPress={() => setAdding(true)} /> : null}
      </Row>

      {linked.length === 0 && !adding ? (
        <Txt variant="ui" color="ink3">
          ما المهارة التي يتوقف عليها نجاح هذا المشروع؟ اربطها لتتابع ساعات تعلّمها من هنا.
        </Txt>
      ) : null}

      {linked.map((s) => {
        const pct = Math.min(100, Math.round((s.loggedHours / s.targetHours) * 100));
        return (
          <View key={s.id} style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 12, gap: 8 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push("/tool/meta")} accessibilityRole="link">
                <Txt weight="medium" numberOfLines={1}>
                  {s.title}
                </Txt>
              </Pressable>
              <Txt variant="small" color="ink3">
                {s.loggedHours} من {s.targetHours} س
              </Txt>
              <IconButton icon="x" label={`فك ربط ${s.title}`} onPress={() => onUnlink(s.id)} />
            </Row>
            <ProgressBar value={pct} />
          </View>
        );
      })}

      {adding ? (
        <View style={{ gap: 8 }}>
          <Input
            autoFocus
            value={name}
            maxLength={60}
            onChangeText={(v) => {
              setName(v);
              setBlocked(null);
            }}
            placeholder="اسم المهارة، جديدة أو من مساراتك"
            accessibilityLabel="اسم المهارة"
            returnKeyType="done"
            onSubmitEditing={() => submit()}
          />
          <SkillSuggestions skills={unlinked} onPick={(title) => submit(title)} />
          <Row>
            <Button title="ربط" variant="secondary" size="sm" disabled={!name.trim()} onPress={() => submit()} />
            <Button title="إلغاء" variant="ghost" size="sm" onPress={() => setAdding(false)} />
          </Row>
          {blocked !== null ? <SkillBlocked openSkill={blocked} onUseOpen={setName} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

function ProjectValues({ project, values, compact, onLink }: { project: Project; values: CoreValueItem[]; compact?: boolean; onLink?: () => void }) {
  const c = useColors();
  const served = (project.valueIds ?? []).map((id) => values.find((v) => v.id === id)).filter((v): v is CoreValueItem => Boolean(v));
  if (served.length === 0) {
    return (
      <Row gap={4} style={{ flexWrap: "wrap" }}>
        <Feather name="heart" size={13} color={c.ink3} />
        <Txt variant="small" color="ink3">
          هذا المشروع لا يخدم أي قيمة عندك.
        </Txt>
        {onLink ? <LinkButton title="اربطه بقيمة" onPress={onLink} /> : null}
      </Row>
    );
  }
  return (
    <Row gap={6} style={{ flexWrap: "wrap" }}>
      {!compact ? (
        <Txt variant="small" color="ink3">
          يخدم:
        </Txt>
      ) : null}
      {served.map((v) => (
        <Row key={v.id} gap={4} style={{ borderRadius: radius.full, backgroundColor: c.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Feather name="heart" size={11} color={c.accentStrong} />
          <Txt variant="caption" weight="medium">
            {v.title}
          </Txt>
        </Row>
      ))}
    </Row>
  );
}
