import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { FAITH_VALUE_TEMPLATE, VALUE_TEMPLATES, customValue, useAppStore, type CoreValueItem } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { weekOf } from "@/lib/utils";
import { computeValueWeek, formatMinutes, useValueData } from "@/lib/valueInsights";
import { useJourney } from "@/lib/journey";
import { ROW, radius, useColors, type ColorName } from "@/theme";
import { Badge, Button, Card, Chip, IconButton, Input, Label, LinkButton, Row, SectionHeader, Sheet, Txt } from "@/components/ui";

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
export function IdentityTool() {
  const [tab, setTab] = useState<Tab>("values");
  const { values, identityVotes } = useAppStore();

  return (
    <View style={{ gap: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: ROW, gap: 8 }}>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </ScrollView>
      <Txt variant="small" color="ink3">
        القيم: {values.length} · أصوات الهوية: {identityVotes.length}
      </Txt>

      {tab === "values" && <ValuesTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "beliefs" && <BeliefsTab />}
      {tab === "story" && <StoryTab />}
      {tab === "votes" && <VotesTab />}
      {tab === "protect" && <ProtectTab />}
    </View>
  );
}

function Empty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={{ gap: 8, alignItems: "stretch" }}>
      <View style={{ alignSelf: "center", width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
        <Feather name="file-text" size={20} color={c.ink3} />
      </View>
      <Txt variant="lead" weight="semibold" align="center">
        {title}
      </Txt>
      <Txt variant="ui" color="ink2" align="center">
        {description}
      </Txt>
      {action}
    </Card>
  );
}

/** A statement set off by a brand-colored rule on the reading-start (right) side. */
function Quote({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderRightWidth: 2, borderRightColor: c.brand, paddingRight: 10 }}>
      <Txt>{children}</Txt>
    </View>
  );
}

/* ---------------- Values ---------------- */

const VALUE_FIELDS: readonly [key: "dailyAction" | "redLine" | "conflictRule", label: string, color: ColorName][] = [
  ["dailyAction", "سلوكها اليومي", "brand"],
  ["redLine", "خطها الأحمر", "danger"],
  ["conflictRule", "عند التعارض", "accentStrong"],
];

function ValuesTab() {
  const c = useColors();
  const { values, updateCoreValue, addCoreValue, removeCoreValue, settings } = useAppStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pick<CoreValueItem, "dailyAction" | "redLine" | "conflictRule">>({ dailyAction: "", redLine: "", conflictRule: "" });
  const [picker, setPicker] = useState(false);
  const [own, setOwn] = useState({ title: "", definition: "" });
  const projects = useProjectsStore((s) => s.projects);
  const valueData = useValueData();
  const week = useMemo(() => computeValueWeek(weekOf(), valueData), [valueData]);
  const weekMinutes = (id: string) => week.rows.find((r) => r.value.id === id)?.minutes ?? 0;
  // Before projects exist, focus time can't reach a value — showing "no time this week" would be a false verdict.
  const projectsOpen = useJourney().isToolOpen("projects");

  const pool = (settings.faithContent ? [FAITH_VALUE_TEMPLATE, ...VALUE_TEMPLATES] : VALUE_TEMPLATES).filter((t) => !values.some((v) => v.id === t.id));

  return (
    <>
      {values.length === 0 ? (
        <Empty
          title="لم تحدد قيمك بعد"
          description="القيم هي ما يحسم حين يتعارض ما يجب مع ما تشتهي. اختر من ثلاث إلى خمس."
          action={<Button title="اختر قيمك" onPress={() => setPicker(true)} />}
        />
      ) : (
        <>
          {values.map((v) => {
            const isEditing = editing === v.id;
            return (
              <Card key={v.id} style={{ gap: 10 }}>
                <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="caption" weight="medium" color="accentStrong">
                      القيمة {v.order}
                    </Txt>
                    <Txt variant="subtitle" weight="semibold">
                      {v.title}
                    </Txt>
                  </View>
                  {isEditing ? (
                    <IconButton
                      icon="check"
                      label="حفظ"
                      color="brand"
                      onPress={() => {
                        updateCoreValue(v.id, draft);
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <Row gap={2}>
                      <IconButton
                        icon="edit-2"
                        label="تعديل"
                        onPress={() => {
                          setEditing(v.id);
                          setDraft({ dailyAction: v.dailyAction, redLine: v.redLine, conflictRule: v.conflictRule ?? "" });
                        }}
                      />
                      <IconButton icon="x" label="إزالة" onPress={() => removeCoreValue(v.id)} />
                    </Row>
                  )}
                </Row>
                <Txt variant="ui" color="ink2">
                  {v.definition}
                </Txt>
                <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 10 }}>
                  {VALUE_FIELDS.map(([key, label, color]) => (
                    <View key={key}>
                      <Txt variant="caption" weight="medium" color={color}>
                        {label}
                      </Txt>
                      {isEditing ? (
                        <Input multiline value={draft[key] ?? ""} onChangeText={(t) => setDraft((d) => ({ ...d, [key]: t }))} accessibilityLabel={label} />
                      ) : (
                        <Txt variant="ui" color={v[key] ? "ink" : "ink3"}>
                          {v[key] || "لم تكتبه بعد. اضغط القلم لتكتبه."}
                        </Txt>
                      )}
                    </View>
                  ))}
                </View>
                {projectsOpen ? (
                  <ValueServedBy projects={projects.filter((p) => p.valueIds?.includes(v.id)).map((p) => p.name)} minutes={weekMinutes(v.id)} />
                ) : null}
              </Card>
            );
          })}
          {values.length < 7 ? <Button title="إضافة قيمة" icon="plus" variant="secondary" onPress={() => setPicker(true)} /> : null}
        </>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="أضف قيمة" description="يمكنك تعديل سلوكها وخطها الأحمر بعد الإضافة.">
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: c.lineStrong, padding: 14, gap: 8 }}>
          <Label>اكتب قيمتك أنت</Label>
          <Input value={own.title} onChangeText={(t) => setOwn({ ...own, title: t })} placeholder="مثال: خدمة الناس" maxLength={60} />
          <Input
            accessibilityLabel="معناها لك"
            value={own.definition}
            onChangeText={(t) => setOwn({ ...own, definition: t })}
            placeholder="ماذا تعني لك في سطر؟ (اختياري)"
            maxLength={140}
          />
          <Button
            title="أضفها"
            icon="plus"
            size="sm"
            disabled={!own.title.trim()}
            style={{ alignSelf: "flex-end" }}
            onPress={() => {
              addCoreValue(customValue(own.title, own.definition));
              setOwn({ title: "", definition: "" });
              setPicker(false);
            }}
          />
        </View>
        {pool.length > 0 ? (
          <Txt variant="small" color="ink3">
            أو اختر من القيم الجاهزة:
          </Txt>
        ) : null}
        {pool.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => {
              addCoreValue(t);
              if (pool.length <= 1) setPicker(false);
            }}
            style={({ pressed }) => ({ borderRadius: radius.lg, borderWidth: 1, borderColor: pressed ? c.brand : c.line, padding: 14, gap: 4 })}
          >
            <Txt weight="semibold">{t.title}</Txt>
            <Txt variant="small" color="ink2">
              {t.definition}
            </Txt>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/** Under each value: which projects carry it, and how much focus it got this week. */
function ValueServedBy({ projects, minutes }: { projects: string[]; minutes: number }) {
  const c = useColors();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10, gap: 6 }}>
      {projects.length > 0 ? (
        <Row gap={6} style={{ alignItems: "flex-start" }}>
          <Feather name="folder" size={14} color={c.ink3} style={{ marginTop: 4 }} />
          <Txt variant="small" color="ink2" style={{ flex: 1 }}>
            تخدمها: {projects.join("، ")}
          </Txt>
        </Row>
      ) : (
        <View style={{ alignItems: "flex-end" }}>
          <LinkButton title="لا مشروع يخدمها بعد — أنشئ واحداً" icon="plus" color="accentStrong" onPress={() => router.push("/tool/projects")} />
        </View>
      )}
      <Row gap={6} style={{ flexWrap: "wrap" }}>
        <Feather name="clock" size={14} color={c.ink3} />
        <Txt variant="small" color="ink3">
          {minutes > 0 ? `${formatMinutes(minutes)} تركيز لها هذا الأسبوع` : "لم تأخذ وقتاً هذا الأسبوع"}
        </Txt>
        <LinkButton title="الخريطة" icon="map" onPress={() => router.push("/vision")} />
      </Row>
    </View>
  );
}

/* ---------------- Goals → identity ---------------- */

function GoalsTab() {
  const { values, goalIdentities, addGoalIdentity, deleteGoalIdentity, binaryHabits, addBinaryHabit } = useAppStore();
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);
  const empty = { goal: "", coreValue: values[0]?.title ?? "", narrative: "", habit: "", redLine: "" };
  const [f, setF] = useState(empty);

  const submit = () => {
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
    <>
      <Card style={{ gap: 12 }}>
        <SectionHeader title="حوّل هدفاً إلى هوية" description="لا تسأل «ماذا أريد أن أحقق؟» بل «من الشخص الذي يحقق هذا بشكل طبيعي؟»" />
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {GOAL_PRESETS.map((p) => (
            <Chip key={p.label} label={`مثال: ${p.label}`} onPress={() => setF({ ...f, goal: p.goal, narrative: p.narrative, habit: p.habit, redLine: p.redLine })} />
          ))}
        </View>
        <View>
          <Label>الهدف</Label>
          <Input value={f.goal} onChangeText={(t) => setF({ ...f, goal: t })} />
        </View>
        {values.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Label>القيمة التي يخدمها</Label>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
              {values.map((v) => (
                <Chip key={v.id} label={v.title} selected={f.coreValue === v.title} onPress={() => setF({ ...f, coreValue: v.title })} />
              ))}
            </View>
          </View>
        ) : null}
        <View>
          <Label hint="بصيغة الحاضر: «أنا شخص…»">هويتك الجديدة</Label>
          <Input multiline value={f.narrative} onChangeText={(t) => setF({ ...f, narrative: t })} />
        </View>
        <View>
          <Label>عادتها الصغيرة اليومية</Label>
          <Input value={f.habit} onChangeText={(t) => setF({ ...f, habit: t })} />
        </View>
        <View>
          <Label>خطها الأحمر</Label>
          <Input value={f.redLine} onChangeText={(t) => setF({ ...f, redLine: t })} />
        </View>
        <Button title="حفظ" disabled={!f.goal.trim()} onPress={submit} />
      </Card>

      {goalIdentities.length === 0 ? (
        <Empty title="لا أهداف بعد" description="أول هدف تحوّله إلى هوية سيظهر هنا." />
      ) : (
        goalIdentities.map((g) => (
          <Card key={g.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 6, alignItems: "flex-end" }}>
                {g.coreValue ? <Badge tone="accent">{g.coreValue}</Badge> : null}
                <Txt variant="lead" weight="semibold" style={{ alignSelf: "stretch" }}>
                  {g.goal}
                </Txt>
              </View>
              <IconButton icon="trash-2" label="حذف" onPress={() => deleteGoalIdentity(g.id)} />
            </Row>
            <Quote>{g.selfNarrative}</Quote>
            <View>
              <Txt variant="caption" weight="medium" color="brand">
                العادة
              </Txt>
              <Txt variant="ui" color="ink2">
                {g.microHabit}
              </Txt>
            </View>
            <View>
              <Txt variant="caption" weight="medium" color="danger">
                الخط الأحمر
              </Txt>
              <Txt variant="ui" color="ink2">
                {g.redLine}
              </Txt>
            </View>
            <Row gap={8} style={{ flexWrap: "wrap" }}>
              {binaryHabits.some((h) => h.title === g.microHabit) ? (
                <Badge tone="brand" icon="check">
                  عادتها في إغلاق المساء
                </Badge>
              ) : (
                <Button
                  title="أضف عادتها لإغلاق المساء"
                  icon="moon"
                  size="sm"
                  variant="quiet"
                  onPress={() => addBinaryHabit(g.microHabit, { valueId: values.find((v) => v.title === g.coreValue)?.id })}
                />
              )}
              {projects.some((p) => p.name === g.goal) ? (
                <LinkButton title="له مشروع — افتحه" icon="folder" onPress={() => router.push("/tool/projects")} />
              ) : (
                <Button
                  title="حوّله إلى مشروع"
                  icon="folder"
                  size="sm"
                  variant="quiet"
                  onPress={() => {
                    const value = values.find((v) => v.title === g.coreValue);
                    addProject({ name: g.goal, description: g.selfNarrative, valueIds: value ? [value.id] : [] });
                  }}
                />
              )}
            </Row>
          </Card>
        ))
      )}
    </>
  );
}

/* ---------------- Beliefs ---------------- */

const ACTIONS = {
  KEEP: { label: "أُبقي عليه", tone: "brand" as const },
  MODIFY: { label: "أعدّله", tone: "accent" as const },
  DROP: { label: "أتركه", tone: "danger" as const },
};

function BeliefsTab() {
  const c = useColors();
  const { beliefAudits, addBeliefAudit, deleteBeliefAudit } = useAppStore();
  const [belief, setBelief] = useState("");
  const [origin, setOrigin] = useState("");
  const [action, setAction] = useState<keyof typeof ACTIONS>("DROP");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!belief.trim()) return;
    addBeliefAudit({ belief: belief.trim(), origin: origin.trim() || "غير محدد", action, notes: notes.trim() || undefined });
    setBelief("");
    setOrigin("");
    setNotes("");
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <SectionHeader title="افحص معتقداً" description="بعض ما تؤمن به عن نفسك ورثته دون أن تختاره. افحصه، ثم قرّر." />
        <View>
          <Label>المعتقد</Label>
          <Input multiline value={belief} onChangeText={setBelief} placeholder="مثال: يجب أن أكون متحمساً تماماً قبل أن أبدأ" />
        </View>
        <View>
          <Label hint="اختياري">من أين جاء؟</Label>
          <Input value={origin} onChangeText={setOrigin} placeholder="تربية، تجربة قديمة، ثقافة سائدة…" />
        </View>
        <View style={{ gap: 6 }}>
          <Label>قرارك</Label>
          <View style={{ flexDirection: ROW, gap: 8 }}>
            {(Object.keys(ACTIONS) as (keyof typeof ACTIONS)[]).map((k) => (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: action === k }}
                onPress={() => setAction(k)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: radius.md,
                  borderWidth: action === k ? 1.5 : 1,
                  borderColor: action === k ? c.brand : c.line,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Txt variant="ui" weight={action === k ? "medium" : "regular"} color={action === k ? "ink" : "ink2"}>
                  {ACTIONS[k].label}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Label hint="اختياري">المعتقد البديل</Label>
          <Input value={notes} onChangeText={setNotes} placeholder="مثال: الحركة تصنع الحماس، لا العكس" />
        </View>
        <Button title="حفظ" disabled={!belief.trim()} onPress={submit} />
      </Card>

      {beliefAudits.length === 0 ? (
        <Empty title="لا معتقدات مفحوصة بعد" description="ابدأ بجملة تقولها لنفسك كثيراً." />
      ) : (
        beliefAudits.map((b) => (
          <Card key={b.id} style={{ gap: 8 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Txt style={{ flex: 1 }}>{b.belief}</Txt>
              <IconButton icon="trash-2" label="حذف" onPress={() => deleteBeliefAudit(b.id)} />
            </Row>
            <Row style={{ flexWrap: "wrap" }}>
              <Badge tone={ACTIONS[b.action].tone}>{ACTIONS[b.action].label}</Badge>
              <Txt variant="small" color="ink3">
                المصدر: {b.origin}
              </Txt>
            </Row>
            {b.notes ? (
              <Row gap={6} style={{ alignItems: "flex-start" }}>
                <Feather name="arrow-left" size={14} color={c.brand} style={{ marginTop: 4 }} />
                <Txt variant="ui" style={{ flex: 1 }}>
                  {b.notes}
                </Txt>
              </Row>
            ) : null}
          </Card>
        ))
      )}
    </>
  );
}

/* ---------------- Story reframing ---------------- */

function StoryTab() {
  const { reframedStories, addReframedStory } = useAppStore();
  const [event, setEvent] = useState("");
  const [victim, setVictim] = useState("");
  const [creator, setCreator] = useState("");

  const submit = () => {
    if (!event.trim() || !creator.trim()) return;
    addReframedStory({ event: event.trim(), victimStory: victim.trim() || "—", creatorStory: creator.trim() });
    setEvent("");
    setVictim("");
    setCreator("");
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <SectionHeader title="أعد كتابة القصة" description="الحدث واحد، والقصة التي ترويها عنه اختيار. من الضحية إلى الصانع." />
        <View>
          <Label>ماذا حدث؟</Label>
          <Input value={event} onChangeText={setEvent} placeholder="مثال: انقطعت عن التعلم أسبوعاً" />
        </View>
        <View>
          <Label hint="ما يقوله الصوت الناقد — اكتبه لتراه">قصة الضحية</Label>
          <Input multiline value={victim} onChangeText={setVictim} placeholder="أنا لا ألتزم بشيء، والظروف دائماً ضدي" />
        </View>
        <View>
          <Label hint="ما الذي كشفه لك هذا؟ وما الذي ستفعله الآن؟">قصة الصانع</Label>
          <Input multiline value={creator} onChangeText={setCreator} placeholder="الانقطاع كشف خللاً في تنظيم طاقتي لا في قدراتي. أستأنف اليوم بجلسة 25 دقيقة." />
        </View>
        <Button title="حفظ" disabled={!event.trim() || !creator.trim()} onPress={submit} />
      </Card>

      {reframedStories.length === 0 ? (
        <Empty title="لا قصص بعد" description="حين يتعثر يومك، عد إلى هنا واكتب القصة من جديد." />
      ) : (
        reframedStories.map((s) => (
          <Card key={s.id} style={{ gap: 8 }}>
            <Txt variant="small" color="ink3">
              {s.event}
            </Txt>
            {s.victimStory !== "—" ? (
              <Txt variant="ui" color="ink3" style={{ textDecorationLine: "line-through" }}>
                {s.victimStory}
              </Txt>
            ) : null}
            <Quote>{s.creatorStory}</Quote>
          </Card>
        ))
      )}
    </>
  );
}

/* ---------------- Identity votes ---------------- */

function VotesTab() {
  const c = useColors();
  const { values, identityVotes, addIdentityVote } = useAppStore();
  const [text, setText] = useState("");
  const [valueTitle, setValueTitle] = useState<string | null>(null);

  const submit = () => {
    if (!text.trim()) return;
    addIdentityVote(valueTitle ? `${text.trim()} — لقيمة: ${valueTitle}` : text.trim());
    setText("");
    setValueTitle(null);
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <SectionHeader title="صوّت لهويتك" description="كل فعل صغير صوتٌ للشخص الذي تريد أن تكونه. الأصوات تتراكم حتى تصبح يقيناً." />
        <View>
          <Label>ماذا فعلت؟</Label>
          <Input value={text} onChangeText={setText} placeholder="مثال: رفضت فتح الهاتف أثناء الجلسة" returnKeyType="done" onSubmitEditing={submit} />
        </View>
        {values.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Label hint="اختياري">لأي قيمة؟</Label>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
              {values.map((v) => (
                <Chip key={v.id} label={v.title} selected={valueTitle === v.title} onPress={() => setValueTitle(valueTitle === v.title ? null : v.title)} />
              ))}
            </View>
          </View>
        ) : null}
        <Button title="تسجيل الصوت" disabled={!text.trim()} onPress={submit} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Txt variant="subtitle" weight="semibold">
            سجلّ الأصوات
          </Txt>
          <Txt variant="heading" color="brand">
            {identityVotes.length}
          </Txt>
        </Row>
        {identityVotes.length === 0 ? (
          <Txt variant="ui" color="ink3" align="center" style={{ paddingVertical: 16 }}>
            صوتك الأول ينتظرك.
          </Txt>
        ) : (
          identityVotes.slice(0, 12).map((v) => (
            <Row key={v.id} style={{ justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
              <Txt variant="ui" style={{ flex: 1 }}>
                {v.voteText}
              </Txt>
              <Txt variant="caption" color="ink3">
                {v.date}
              </Txt>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}

/* ---------------- Protection ---------------- */

function ProtectTab() {
  const c = useColors();
  return (
    <>
      {PROTECT.map((p) => (
        <Card key={p.title} style={{ gap: 6 }}>
          <Row gap={8}>
            <Feather name="shield" size={18} color={c.brand} />
            <Txt variant="lead" weight="semibold">
              {p.title}
            </Txt>
          </Row>
          <Txt variant="ui" color="ink2">
            {p.text}
          </Txt>
        </Card>
      ))}

      <Card style={{ gap: 10 }}>
        <SectionHeader title="حين يهمس العذر" description="تعرّف على العذر حين يأتي، واستدعِ جوابه دون تفاوض." />
        {EXCUSES.map((x) => (
          <View key={x.excuse} style={{ borderRadius: radius.lg, backgroundColor: c.surface2, padding: 12, gap: 6 }}>
            <Txt variant="ui" color="ink2">
              «{x.excuse}»
            </Txt>
            <Row gap={6} style={{ alignItems: "flex-start" }}>
              <Feather name="arrow-left" size={14} color={c.brand} style={{ marginTop: 4 }} />
              <Txt variant="ui" weight="medium" style={{ flex: 1 }}>
                {x.antidote}
              </Txt>
            </Row>
          </View>
        ))}
      </Card>

      <View style={{ borderRadius: radius.xl, backgroundColor: c.brand, padding: 22, gap: 10 }}>
        <Txt variant="small" color="brandInk" align="center" style={{ opacity: 0.8 }}>
          ميثاقك
        </Txt>
        <Txt variant="lead" color="brandInk" align="center" style={{ lineHeight: 34 }}>
          أتحمّل المسؤولية الكاملة عن أفعالي. لا أقبل دور الضحية، ولا أستسلم لجلد الذات. هويتي تتشكل مع كل قرار أقدّم فيه ما يجب على ما أشتهي. أدركتُ عمري، وبدأت.
        </Txt>
      </View>
    </>
  );
}
