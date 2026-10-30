import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useAppStore,
  type FrogLinks,
  type FrogTask,
} from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { usePlannerStore } from "@/stores/usePlannerStore";
import { habitLock, habitStats, isDue, shiftDay } from "@/lib/habits";
import { sendToInbox } from "@/lib/flow";
import { tapFeedback } from "@/lib/feedback";
import { ROW, radius, useColors } from "@/theme";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  LinkButton,
  MiniChip,
  Row,
  SectionHeader,
  Txt,
} from "@/components/ui";
import { ProjectPrioritySheet } from "@/components/today/ProjectPrioritySheet";
import { useFocusGuardStore } from "@/stores/useFocusGuardStore";
import { deepMinutesSeries } from "@/lib/output";
import { formatMinutes } from "@/lib/utils";
import {
  FrogLinkButton,
  FrogLinkSheet,
  LineageLine,
} from "@/components/today/FrogLinkSheet";

/** Tomorrow's links also remember the project task a row came from, so finishing it finishes the task. */
type PlanLinks = FrogLinks & { projectTaskId?: string };

/** Tomorrow can come from the matrix too: what's important first, then the inbox. */
const RANK: Record<string, number> = { QUALITY: 0, EMERGENCY: 1, INBOX: 2, DELEGATE: 3, ESCAPE: 4 };

const TOMORROW_HINTS = [
  "الأثقل والأهم، ما يصعب تأجيله",
  "خطوة في مشروع نموك أو تعلّمك",
  "التزام محدد أو مهمة عاجلة (اختياري)",
];

export function EveningClosure() {
  const c = useColors();
  const {
    binaryHabits,
    toggleBinaryHabit,
    addBinaryHabit,
    removeBinaryHabit,
    identityVotes,
    addIdentityVote,
    frogs,
    tomorrowFrogs,
    setTomorrowFrogs,
    isEveningLocked,
    commitEveningPlan,
    unlockMorningOverride,
    getTomorrowEvents,
    values,
    habitHistory,
    currentDay,
    eveningQualityCheck,
    setEveningQualityCheck,
  } = useAppStore();
  const todayQualityPassed = eveningQualityCheck ? eveningQualityCheck[currentDay] : undefined;
  const habitsToday = binaryHabits.filter((h) => !h.archived && isDue(h, currentDay));
  const projects = useProjectsStore((s) => s.projects);

  // Tomorrow's rows start from the plan already made, or from what is still open today.
  const carry = (tomorrowFrogs?.length ? [...tomorrowFrogs] : frogs.filter((f) => !f.isCompleted)).sort((a, b) => a.order - b.order);
  const [plan, setPlan] = useState([0, 1, 2].map((i) => carry[i]?.title ?? ""));
  const [planLinks, setPlanLinks] = useState<PlanLinks[]>(() =>
    [0, 1, 2].map((i) => {
      const f = carry[i];
      return { projectId: f?.projectId, skillId: f?.skillId, projectTaskId: f?.projectTaskId };
    }),
  );
  const [movedNote, setMovedNote] = useState<string | null>(null);
  const [pickingRow, setPickingRow] = useState<number | null>(null);
  const plannerTasks = usePlannerStore((s) => s.tasks);
  const matrixSuggestions = plannerTasks
    .filter((t) => !t.isCompleted && t.category !== "ESCAPE" && !plan.some((p) => p.trim() === t.title.trim()))
    .sort((a, b) => RANK[a.category] - RANK[b.category])
    .slice(0, 6);
  const freeRow = plan.findIndex((p) => !p.trim());
  const [voteValue, setVoteValue] = useState<string | null>(null);
  const [linkingRow, setLinkingRow] = useState<number | null>(null);
  const [voteText, setVoteText] = useState("");
  const [editingHabits, setEditingHabits] = useState(false);
  const [newHabit, setNewHabit] = useState("");

  const doneFrogs = frogs.filter((f) => f.isCompleted && !f.isDropped).length;
  const doneHabits = habitsToday.filter((h) => h.isCompleted).length;
  const tomorrowStr = shiftDay(currentDay, 1);
  const tomorrowEvents = [
    ...getTomorrowEvents().map((ev) => ({ ...ev, deadline: false })),
    ...projects
      .filter((p) => p.targetDate === tomorrowStr)
      .map((p) => ({ id: `deadline-${p.id}`, title: `موعد تسليم: ${p.name}`, time: undefined as string | undefined, deadline: true })),
  ];
  // Today's finished priorities are the most honest identity votes there are.
  const voteSuggestions = frogs.filter((f) => f.isCompleted && !f.isDropped).map((f) => `أنجزت «${f.title}»`);
  const lastVote = identityVotes[0];

  const commitTomorrow = () => {
    const now = Date.now();
    const next: FrogTask[] = plan
      .map((title, row) => ({ title: title.trim(), links: planLinks[row] }))
      .filter((x) => x.title)
      .map(({ title, links }, i) => ({
        id: `frog-tomorrow-${i + 1}-${now}`,
        title,
        order: i + 1,
        isCompleted: false,
        category: i === 2 ? "EMERGENCY" : "QUALITY",
        createdAt: new Date().toISOString(),
        ...(links.projectId ? { projectId: links.projectId } : {}),
        ...(links.skillId ? { skillId: links.skillId } : {}),
        ...(links.projectTaskId ? { projectTaskId: links.projectTaskId } : {}),
      }));
    if (!next.length) return;
    setTomorrowFrogs(next);
    commitEveningPlan();

    // Anything open today that didn't make tomorrow's plan goes to the inbox instead of disappearing.
    // Project tasks are already safe in their project.
    const planned = new Set(next.map((f) => f.title));
    const inboxTitles = new Set(usePlannerStore.getState().tasks.filter((t) => t.category === "INBOX").map((t) => t.title));
    const left = frogs.filter((f) => !f.isCompleted && !f.projectTaskId && !planned.has(f.title) && !inboxTitles.has(f.title));
    left.forEach((f) => sendToInbox(f.title));
    setMovedNote(left.length ? `نقلنا ${left.length === 1 ? "أولوية لم تُنجز" : `${left.length} أولويات لم تُنجز`} إلى صندوق المهام، حتى لا تضيع.` : null);
  };

  return (
    <View style={{ gap: 16 }}>
      <Card>
        <Badge tone="accent">محطة المساء · 3 دقائق</Badge>
        <Txt variant="titleLg" weight="semibold" style={{ marginTop: 10 }}>
          أغلق يومك بهدوء
        </Txt>
        <Txt variant="ui" color="ink2">
          جرد صادق بلا تبرير، صوت واحد لهويتك، ثم أولويات الغد قبل النوم.
        </Txt>
        <Row gap={10} style={{ marginTop: 14 }}>
          <Summary
            label="أولويات أُنجزت"
            value={`${doneFrogs} من ${frogs.length || 3}`}
          />
          <Summary
            label="عادات اليوم"
            value={`${doneHabits} من ${habitsToday.length}`}
          />
          <Summary label="أصوات الهوية" value={String(identityVotes.length)} />
        </Row>
      </Card>

      <OutputToday />

      {/* INTJ-A Quality Gate (0 or 1) */}
      <Card style={{ gap: 12 }}>
        <SectionHeader
          title="فحص جودة اليوم (0 أو 1)"
          description="تقييم بروتوكولي صارم: هل نُفذت مهام اليوم بإتقان حقيقي واستيفاء كامل للـ DoD أم بدافع التخلص منها وشطبها فقط؟"
        />
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => {
              tapFeedback();
              setEveningQualityCheck(currentDay, true);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: todayQualityPassed === true }}
            style={{
              padding: 12,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: todayQualityPassed === true ? c.brand : c.line,
              backgroundColor: todayQualityPassed === true ? c.brandSoft : c.surface2,
            }}
          >
            <Row gap={10} style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: todayQualityPassed === true ? c.brand : c.lineStrong,
                  backgroundColor: todayQualityPassed === true ? c.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {todayQualityPassed === true ? <Feather name="check" size={14} color={c.brandInk} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold">إتقان حقيقي واستيفاء كامل للـ DoD</Txt>
                <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                  تسليم وفق المعيار المحدد بنسبة 100% بلا مساومات (1)
                </Txt>
              </View>
            </Row>
          </Pressable>

          <Pressable
            onPress={() => {
              tapFeedback();
              setEveningQualityCheck(currentDay, false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: todayQualityPassed === false }}
            style={{
              padding: 12,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: todayQualityPassed === false ? c.danger : c.line,
              backgroundColor: todayQualityPassed === false ? c.dangerSoft : c.surface2,
            }}
          >
            <Row gap={10} style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: todayQualityPassed === false ? c.danger : c.lineStrong,
                  backgroundColor: todayQualityPassed === false ? c.danger : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {todayQualityPassed === false ? <Feather name="x" size={14} color={c.dangerInk} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="semibold">شطب سطحي / تفريغ ذمة</Txt>
                <Txt variant="caption" color="ink2" style={{ marginTop: 2 }}>
                  أُنجزت على عجل دون عمق أو هروباً من الذنب فقط (0)
                </Txt>
              </View>
            </Row>
          </Pressable>
        </View>

        {todayQualityPassed === true ? (
          <Row gap={6} style={{ marginTop: 2, alignItems: "center" }}>
            <Feather name="check-circle" size={14} color={c.brand} />
            <Txt variant="caption" color="brand" weight="medium">
              تم توثيق إتقان اليوم (1) في ميزان الجودة وسجل المراجعة الأسبوعية.
            </Txt>
          </Row>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="عادات اليوم"
          description="نعم أو لا. التقييم الصادق أهم من الرقم الجميل."
          action={
            <Button
              title={editingHabits ? "تم" : "تعديل"}
              variant="ghost"
              size="sm"
              icon="sliders"
              onPress={() => setEditingHabits((v) => !v)}
            />
          }
        />
        <View style={{ marginTop: 12, gap: 8 }}>
          {habitsToday.map((h) => {
            const streak = habitStats(h, habitHistory, currentDay).streak;
            const lock = habitLock(h, habitHistory, currentDay);
            return (
            <Row key={h.id} gap={6}>
              <Pressable
                onPress={() => toggleBinaryHabit(h.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: h.isCompleted }}
                style={{
                  flex: 1,
                  minHeight: 50,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: h.isCompleted ? c.brand : c.line,
                  backgroundColor: h.isCompleted ? c.brandSoft : c.surface,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                }}
              >
                <Row gap={10}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: h.isCompleted ? c.brand : c.lineStrong,
                      backgroundColor: h.isCompleted ? c.brand : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {h.isCompleted ? (
                      <Feather name="check" size={14} color={c.brandInk} />
                    ) : null}
                  </View>
                  <Txt
                    style={{ flex: 1 }}
                    color={h.isCompleted ? "ink" : "ink2"}
                    numberOfLines={1}
                  >
                    {h.title}
                  </Txt>
                  {streak > 0 ? (
                    <Txt variant="caption" color="accentStrong">
                      {streak} يوم
                    </Txt>
                  ) : null}
                </Row>
              </Pressable>
              {editingHabits ? (
                lock.locked ? (
                  <View
                    style={{ width: 38, alignItems: "center" }}
                    accessibilityLabel={`لا تُحذف قبل 21 يوماً (بقي ${lock.daysLeft})`}
                  >
                    <Feather name="lock" size={16} color={c.ink3} />
                  </View>
                ) : (
                  <IconButton
                    icon="x"
                    label={`حذف ${h.title}`}
                    color="danger"
                    onPress={() => removeBinaryHabit(h.id)}
                  />
                )
              ) : null}
            </Row>
            );
          })}
        </View>
        <View style={{ alignItems: "flex-end", marginTop: 10 }}>
          <LinkButton title="سلاسلك وأسابيعك في متابعة العادات" onPress={() => router.push("/tool/habits")} />
        </View>
        {editingHabits ? (
          <Row gap={8} style={{ marginTop: 10 }}>
            <Input
              style={{ flex: 1 }}
              value={newHabit}
              onChangeText={setNewHabit}
              placeholder="عادة جديدة، مثال: قراءة 10 صفحات"
            />
            <Button
              title="إضافة"
              icon="plus"
              variant="secondary"
              disabled={!newHabit.trim()}
              onPress={() => {
                addBinaryHabit(newHabit);
                setNewHabit("");
              }}
            />
          </Row>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="صوت لهويتك"
          description="ما الفعل الملموس الذي قمت به اليوم وكان تصويتاً للشخص الذي تريد أن تكونه؟"
        />
        <View style={{ marginTop: 12, gap: 8 }}>
          <Input
            value={voteText}
            onChangeText={setVoteText}
            placeholder="مثال: أكملت جلسة تركيز دون أن ألمس الهاتف"
          />
          {voteSuggestions.length > 0 ? (
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <Txt variant="caption" color="ink3">
                من يومك:
              </Txt>
              {voteSuggestions.map((v) => (
                <MiniChip key={v} label={v} onPress={() => setVoteText(v)} />
              ))}
            </View>
          ) : null}
          {values.length > 0 && voteText.trim() ? (
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <Txt variant="caption" color="ink3">
                لأي قيمة؟
              </Txt>
              {values.map((v) => (
                <MiniChip key={v.id} label={v.title} selected={voteValue === v.title} onPress={() => setVoteValue(voteValue === v.title ? null : v.title)} />
              ))}
            </View>
          ) : null}
          <Button
            title="تسجيل"
            disabled={!voteText.trim()}
            onPress={() => {
              addIdentityVote(voteValue ? `${voteText.trim()} — لقيمة: ${voteValue}` : voteText.trim());
              setVoteText("");
              setVoteValue(null);
            }}
          />
        </View>
        {lastVote ? (
          <Txt variant="ui" color="ink2" style={{ marginTop: 10 }}>
            آخر صوت: <Txt variant="ui">{lastVote.voteText}</Txt>
          </Txt>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="أولويات الغد"
          description="اعتمدها الليلة لتستيقظ وقرارك جاهز، فلا تستنزف صباحك في التفكير."
          action={
            isEveningLocked ? (
              <Badge tone="brand" icon="lock">
                معتمدة
              </Badge>
            ) : undefined
          }
        />

        {tomorrowEvents.length > 0 ? (
          <View
            style={{
              marginTop: 12,
              borderRadius: radius.md,
              backgroundColor: c.accentSoft,
              padding: 12,
              gap: 4,
            }}
          >
            <Txt variant="small" weight="medium" color="accentStrong">
              التزامات ثابتة غداً، خطّط حولها
            </Txt>
            {tomorrowEvents.map((ev) => (
              <Row key={ev.id} style={{ justifyContent: "space-between" }}>
                {ev.deadline ? <Feather name="flag" size={13} color={c.danger} /> : null}
                <Txt variant="ui" numberOfLines={1} style={{ flex: 1 }}>
                  {ev.title}
                </Txt>
                {ev.time ? (
                  <Txt variant="small" color="ink2">
                    {ev.time}
                  </Txt>
                ) : null}
              </Row>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 12, gap: 8 }}>
          {plan.map((value, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Row gap={10}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: c.surface2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Txt
                    variant="small"
                    weight="semibold"
                    color="ink2"
                    align="center"
                  >
                    {i + 1}
                  </Txt>
                </View>
                <Input
                  style={{ flex: 1 }}
                  value={value}
                  editable={!isEveningLocked}
                  onChangeText={(t) => {
                    setPlan((p) => p.map((x, j) => (j === i ? t : x)));
                    if (planLinks[i].projectTaskId) {
                      setPlanLinks((l) => l.map((x, j) => (j === i ? { projectId: x.projectId, skillId: x.skillId } : x)));
                    }
                  }}
                  placeholder={TOMORROW_HINTS[i]}
                  accessibilityLabel={`أولوية الغد ${i + 1}`}
                />
                {projects.length > 0 ? (
                  <IconButton
                    icon="folder"
                    label={`اختر أولوية الغد ${i + 1} من مشاريعك`}
                    onPress={() => !isEveningLocked && setPickingRow(i)}
                  />
                ) : null}
                <FrogLinkButton
                  links={planLinks[i]}
                  label={`ربط أولوية الغد ${i + 1} بمشروع أو مهارة`}
                  disabled={isEveningLocked || !value.trim()}
                  onPress={() => setLinkingRow(i)}
                />
              </Row>
              <View style={{ paddingHorizontal: 38 }}>
                <LineageLine links={planLinks[i]} />
              </View>
            </View>
          ))}
        </View>

        {!isEveningLocked && matrixSuggestions.length > 0 ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            <Txt variant="small" color="ink3">
              من مصفوفة الأولويات:
            </Txt>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
              {matrixSuggestions.map((t) => (
                <MiniChip
                  key={t.id}
                  icon="plus"
                  label={t.category === "INBOX" ? `${t.title} · صندوق المهام` : t.title}
                  onPress={() => freeRow >= 0 && setPlan((p) => p.map((x, j) => (j === freeRow ? t.title : x)))}
                />
              ))}
            </View>
            {freeRow < 0 ? (
              <Txt variant="caption" color="ink3">
                الخانات الثلاث ممتلئة.
              </Txt>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 14 }}>
          {isEveningLocked ? (
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={6}>
                  <Feather name="check" size={16} color={c.brand} />
                  <Txt variant="ui" color="brand">
                    خطة الغد جاهزة. نوماً هنيئاً.
                  </Txt>
                </Row>
                {movedNote ? (
                  <Txt variant="small" color="ink2">
                    {movedNote}
                  </Txt>
                ) : null}
              </View>
              <Button
                title="تعديل"
                icon="unlock"
                variant="ghost"
                size="sm"
                onPress={unlockMorningOverride}
              />
            </Row>
          ) : (
            <Button
              title="اعتماد أولويات الغد"
              icon="lock"
              onPress={commitTomorrow}
              disabled={!plan.some((p) => p.trim())}
            />
          )}
        </View>
      </Card>

      <ProjectPrioritySheet
        open={pickingRow !== null}
        title="أولوية الغد من مشاريعك"
        onClose={() => setPickingRow(null)}
        onPick={(t) => {
          if (pickingRow === null) return;
          const row = pickingRow;
          setPlan((p) => p.map((x, j) => (j === row ? t.title : x)));
          setPlanLinks((l) => l.map((x, j) => (j === row ? { projectId: t.projectId, skillId: t.skillId, projectTaskId: t.taskId } : x)));
        }}
      />

      <FrogLinkSheet
        open={linkingRow !== null}
        title={linkingRow !== null ? plan[linkingRow] : undefined}
        initial={linkingRow !== null ? planLinks[linkingRow] : {}}
        onClose={() => setLinkingRow(null)}
        onSave={(links) => {
          if (linkingRow !== null)
            setPlanLinks((l) =>
              l.map((x, j) =>
                // Re-linking to another project drops the tie to the old project's task.
                j === linkingRow ? { ...links, ...(links.projectId === x.projectId && x.projectTaskId ? { projectTaskId: x.projectTaskId } : {}) } : x,
              ),
            );
          setLinkingRow(null);
        }}
      />
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        backgroundColor: c.surface2,
        padding: 10,
      }}
    >
      <Txt variant="title" weight="medium">
        {value}
      </Txt>
      <Txt variant="caption" color="ink2">
        {label}
      </Txt>
    </View>
  );
}

/** Tonight's output number and the 🔋 recharge habit. */
function OutputToday() {
  const c = useColors();
  const frogs = useAppStore((s) => s.frogs);
  const frogHistory = useAppStore((s) => s.frogHistory);
  const currentDay = useAppStore((s) => s.currentDay);
  const focusSessions = useAppStore((s) => s.focusSessions);
  const recharged = useFocusGuardStore((s) => s.rechargeDates.includes(currentDay));
  const toggleRecharge = useFocusGuardStore((s) => s.toggleRecharge);
  const today = deepMinutesSeries({ frogs, frogHistory, currentDay, focusSessions }, 1)[0]?.minutes ?? 0;
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View>
          <Txt variant="caption" color="ink3">
            عمل عميق منجز اليوم
          </Txt>
          <Txt variant="title" weight="bold" color={today ? "brand" : "ink3"}>
            {formatMinutes(today)}
          </Txt>
        </View>
        <Feather name="trending-up" size={20} color={c.brand} />
      </Row>
      <Pressable
        onPress={() => {
          tapFeedback();
          toggleRecharge(currentDay);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: recharged }}
        style={{ flexDirection: ROW, alignItems: "center", gap: 10, borderRadius: radius.md, backgroundColor: recharged ? c.brandSoft : c.surface2, padding: 12 }}
      >
        <Feather name={recharged ? "check-circle" : "circle"} size={20} color={recharged ? c.brand : c.ink3} />
        <View style={{ flex: 1 }}>
          <Txt weight="medium">🔋 شحن</Txt>
          <Txt variant="caption" color="ink2">
            وقت وحدك بلا شاشات ولا مهام: مشي، قراءة، أو صمت.
          </Txt>
        </View>
      </Pressable>
    </Card>
  );
}
