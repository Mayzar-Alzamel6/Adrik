import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { sendToToday } from "@/lib/flow";
import { formatMinutes, projectMinutesSince, useValueData } from "@/lib/valueInsights";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Chip, IconButton, Input, Label, LinkButton, ProgressBar, Row, Sheet, Txt, type IconName } from "@/components/ui";

type Category = "CONCEPT" | "FACT" | "PROCEDURE";
const COLUMNS: { id: Category; title: string; hint: string; icon: IconName; placeholder: string }[] = [
  { id: "CONCEPT", title: "مفاهيم", hint: "ما يحتاج فهماً عميقاً لا حفظاً.", icon: "cpu", placeholder: "مثال: كيف يعمل نموذج التسعير" },
  { id: "FACT", title: "حقائق", hint: "ما يحتاج استدعاءً: مفردات، قواعد، أرقام.", icon: "book-open", placeholder: "مثال: أهم 50 مصطلحاً" },
  { id: "PROCEDURE", title: "تطبيقات", hint: "ما لا يُتقن إلا بالممارسة المتكررة.", icon: "tool", placeholder: "مثال: حل تمرين يومياً" },
];

/** Break a skill into concepts, facts and procedures, and commit to its first 20 hours before switching. */
export function SkillsTool() {
  const c = useColors();
  const { skills, addSkillProject, addSkillElement, toggleSkillElement, deleteSkillElement, addSkillLoggedTime } = useAppStore();
  const { projects, linkSkill, unlinkSkill } = useProjectsStore();
  // Opened from another tool for one skill (e.g. the pace list in "a little, consistently").
  const { skill: askedSkill } = useLocalSearchParams<{ skill?: string }>();
  const [selectedId, setSelectedId] = useState(
    typeof askedSkill === "string" && skills.some((s) => s.id === askedSkill) ? askedSkill : skills[0]?.id ?? ""
  );
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<Category, string>>({ CONCEPT: "", FACT: "", PROCEDURE: "" });
  const [picking, setPicking] = useState(false);

  const skill = skills.find((s) => s.id === selectedId) ?? skills[0];
  const progress = skill ? Math.min(100, Math.round((skill.loggedHours / skill.targetHours) * 100)) : 0;
  const locked = skill ? skill.isLocked && skill.loggedHours < skill.targetHours : false;
  const deferred = skill ? !skill.isLocked && skill.loggedHours < skill.targetHours : false;
  const linked = skill ? projects.filter((p) => p.skillIds?.includes(skill.id)) : [];
  const available = skill ? projects.filter((p) => !p.skillIds?.includes(skill.id)) : [];
  const valueData = useValueData();
  // All focus time ever spent on priorities linked to this skill (it is already inside loggedHours).
  const focusMinutes = useMemo(() => (skill ? projectMinutesSince(36500, valueData).bySkill.get(skill.id) ?? 0 : 0), [skill, valueData]);
  const [practiceNote, setPracticeNote] = useState<string | null>(null);

  /** A procedure is practised, not read: make it one of today's priorities, linked back to this skill. */
  const practiceToday = (content: string) => {
    if (!skill) return;
    const res = sendToToday(`تدرّب: ${content}`, { skillId: skill.id, projectId: linked.length === 1 ? linked[0].id : undefined });
    setPracticeNote(res.message);
    setTimeout(() => setPracticeNote(null), 2600);
  };

  const tryNew = () => {
    const open = skills.find((s) => s.isLocked && s.loggedHours < s.targetHours);
    if (open) {
      setBlocked(
        `ما زال أمامك ${Math.round((open.targetHours - open.loggedHours) * 10) / 10} ساعة في «${open.title}». التنقل بين المصادر هروب لطيف من ألم الممارسة؛ أكمل ما بين يديك أولاً.`
      );
      return;
    }
    setNewOpen(true);
  };

  const create = () => {
    if (!newTitle.trim()) return;
    const res = addSkillProject(newTitle.trim(), 20);
    setNewOpen(false);
    if (!res.success) {
      setBlocked(res.message ?? "أكمل مسارك الحالي أولاً.");
      return;
    }
    setNewTitle("");
    const created = useAppStore.getState().skills.at(-1);
    if (created) {
      setSelectedId(created.id);
      if (newProjectId) linkSkill(newProjectId, created.id);
    }
    setNewProjectId(null);
  };

  const addElement = (cat: Category) => {
    if (!skill || !drafts[cat].trim()) return;
    addSkillElement(skill.id, cat, drafts[cat].trim());
    setDrafts((d) => ({ ...d, [cat]: "" }));
  };

  return (
    <View style={{ gap: 16 }}>
      {skills.length === 0 ? (
        <Card style={{ gap: 8 }}>
          <Txt variant="subtitle" weight="semibold" align="center">
            ما المهارة التي تريد إتقانها؟
          </Txt>
          <Txt variant="ui" color="ink2" align="center">
            أول 20 ساعة من الممارسة المركّزة تكفي لتجاوز مرحلة الارتباك في معظم المهارات. اختر واحدة والتزم بها.
          </Txt>
          <Button title="ابدأ مساراً" icon="plus" onPress={tryNew} />
        </Card>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: ROW, gap: 8 }}>
            {skills.map((s) => (
              <Chip key={s.id} label={`${s.title} · ${s.loggedHours}/${s.targetHours} س`} selected={s.id === skill?.id} onPress={() => setSelectedId(s.id)} />
            ))}
            <Chip label="+ مسار جديد" onPress={tryNew} />
          </ScrollView>

          {skill ? (
            <>
              <Card style={{ gap: 10 }}>
                <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="title" weight="semibold">
                      {skill.title}
                    </Txt>
                    <Txt variant="ui" color="ink2">
                      {locked
                        ? "التزم بهذا المسار وحده حتى تُتم أول 20 ساعة."
                        : deferred
                        ? "مسار مؤجل: ابدأه بعد أن تُتم أول 20 ساعة في مسارك الحالي."
                        : "تجاوزت أول 20 ساعة. يمكنك الآن فتح مسار موازٍ."}
                    </Txt>
                  </View>
                  {locked ? <Badge tone="accent" icon="lock">التزام</Badge> : deferred ? <Badge>مؤجل</Badge> : <Badge tone="brand" icon="check">اجتزت العتبة</Badge>}
                </Row>

                <View style={{ gap: 6 }}>
                  <Row gap={6} style={{ flexWrap: "wrap" }}>
                    <Feather name="folder" size={13} color={c.brand} />
                    <Txt variant="small" color="ink2">
                      {linked.length ? "لمشروع:" : "غير مرتبطة بمشروع"}
                    </Txt>
                    {linked.map((p) => (
                      <Pressable key={p.id} onPress={() => unlinkSkill(p.id, skill.id)} accessibilityLabel={`فك الربط مع ${p.name}`}>
                        <Row gap={4} style={{ borderRadius: radius.full, backgroundColor: c.brandSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Txt variant="caption" weight="medium" color="brand">
                            {p.name}
                          </Txt>
                          <Feather name="x" size={11} color={c.brand} />
                        </Row>
                      </Pressable>
                    ))}
                    {!picking && available.length > 0 ? <LinkButton title="+ ربط بمشروع" onPress={() => setPicking(true)} /> : null}
                  </Row>
                  {picking ? (
                    <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
                      {available.map((p) => (
                        <Chip
                          key={p.id}
                          label={p.name}
                          onPress={() => {
                            linkSkill(p.id, skill.id);
                            setPicking(false);
                          }}
                        />
                      ))}
                      <Chip label="إلغاء" onPress={() => setPicking(false)} />
                    </View>
                  ) : null}
                </View>

                <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                  <Txt variant="heading">
                    {skill.loggedHours} <Txt color="ink3">من {skill.targetHours} ساعة</Txt>
                  </Txt>
                  <Txt variant="ui" color="ink2">
                    {progress}%
                  </Txt>
                </Row>
                <ProgressBar value={progress} />
                <Row gap={6} style={{ alignItems: "flex-start" }}>
                  <Feather name="clock" size={14} color={c.brand} style={{ marginTop: 4 }} />
                  <Txt variant="small" color="ink2" style={{ flex: 1 }}>
                    {focusMinutes > 0
                      ? `تركيزك المربوط بهذه المهارة: ${formatMinutes(focusMinutes)}. كل جلسة جديدة تُضاف إلى رصيدها تلقائياً.`
                      : "اربط أولويات يومك بهذه المهارة، وستُحتسب جلسات تركيزك هنا تلقائياً."}
                  </Txt>
                </Row>
                <Txt variant="caption" color="ink3">
                  تدرّبت خارج التطبيق؟ أضفه يدوياً:
                </Txt>
                <Row style={{ flexWrap: "wrap" }}>
                  <Button title="+ 30 دقيقة" size="sm" variant="quiet" onPress={() => addSkillLoggedTime(skill.id, 0.5)} />
                  <Button title="+ ساعة" size="sm" variant="quiet" onPress={() => addSkillLoggedTime(skill.id, 1)} />
                  <Button title="+ 90 دقيقة" size="sm" variant="quiet" onPress={() => addSkillLoggedTime(skill.id, 1.5)} />
                </Row>
              </Card>

              {practiceNote ? (
                <View style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Txt variant="ui" color="brand">
                    {practiceNote}
                  </Txt>
                </View>
              ) : null}

              {COLUMNS.map((col) => {
                const items = skill.elements.filter((e) => e.category === col.id);
                return (
                  <Card key={col.id} style={{ gap: 8 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Row gap={6}>
                        <Feather name={col.icon} size={16} color={c.brand} />
                        <Txt variant="lead" weight="semibold">
                          {col.title}
                        </Txt>
                      </Row>
                      <Txt variant="small" color="ink3">
                        {items.filter((i) => i.isMastered).length} من {items.length}
                      </Txt>
                    </Row>
                    <Txt variant="small" color="ink2">
                      {col.hint}
                    </Txt>
                    {items.map((item) => (
                      <Row key={item.id} gap={8}>
                        <Pressable
                          onPress={() => toggleSkillElement(skill.id, item.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.isMastered }}
                          hitSlop={8}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 1.5,
                            borderColor: item.isMastered ? c.brand : c.lineStrong,
                            backgroundColor: item.isMastered ? c.brand : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {item.isMastered ? <Feather name="check" size={12} color={c.brandInk} /> : null}
                        </Pressable>
                        <Txt variant="ui" color={item.isMastered ? "ink3" : "ink"} style={[{ flex: 1 }, item.isMastered ? { textDecorationLine: "line-through" } : null]}>
                          {item.content}
                        </Txt>
                        {!item.isMastered ? (
                          <IconButton icon="target" label={`اجعل «${item.content}» من أولويات اليوم`} onPress={() => practiceToday(item.content)} />
                        ) : null}
                        <IconButton icon="trash-2" label="حذف" onPress={() => deleteSkillElement(skill.id, item.id)} />
                      </Row>
                    ))}
                    <Input
                      value={drafts[col.id]}
                      onChangeText={(v) => setDrafts((d) => ({ ...d, [col.id]: v }))}
                      placeholder={col.placeholder}
                      returnKeyType="done"
                      onSubmitEditing={() => addElement(col.id)}
                      accessibilityLabel={`إضافة إلى ${col.title}`}
                    />
                  </Card>
                );
              })}
            </>
          ) : null}
        </>
      )}

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="مسار تعلّم جديد">
        <View>
          <Label>ما المهارة؟</Label>
          <Input value={newTitle} onChangeText={setNewTitle} placeholder="مثال: التصميم، البرمجة، لغة جديدة" />
        </View>
        {projects.length > 0 ? (
          <View>
            <Label hint="اختياري: لأي مشروع تتعلّم هذه المهارة؟">ربطها بمشروع</Label>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
              {projects.map((p) => (
                <Chip key={p.id} label={p.name} selected={newProjectId === p.id} onPress={() => setNewProjectId((cur) => (cur === p.id ? null : p.id))} />
              ))}
            </View>
          </View>
        ) : null}
        <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12 }}>
          <Txt variant="ui" color="ink2">
            ستلتزم بهذا المسار وحده حتى تُتم أول 20 ساعة، ولن تستطيع فتح مسار آخر قبلها. هكذا تتجاوز مرحلة الارتباك بدل القفز بين المصادر.
          </Txt>
        </View>
        <Row>
          <Button title="ابدأ المسار" onPress={create} disabled={!newTitle.trim()} />
          <Button title="إلغاء" variant="ghost" onPress={() => setNewOpen(false)} />
        </Row>
      </Sheet>

      <Sheet open={Boolean(blocked)} onClose={() => setBlocked(null)}>
        <View style={{ gap: 10, alignItems: "stretch" }}>
          <View style={{ alignSelf: "center", width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Feather name="shield" size={22} color={c.accentStrong} />
          </View>
          <Txt variant="title" weight="semibold" align="center">
            ليس بعد
          </Txt>
          <Txt color="ink2" align="center">
            {blocked}
          </Txt>
          <Button title="سأكمل مساري" onPress={() => setBlocked(null)} />
        </View>
      </Sheet>
    </View>
  );
}
