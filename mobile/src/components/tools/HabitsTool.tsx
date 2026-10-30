import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { starterHabitOptions, useAppStore, type BinaryHabit } from "@/stores/useAppStore";
import {
  HABIT_COMMITMENT_DAYS,
  HABIT_GRACE_HOURS,
  WEEKDAYS,
  habitLock,
  habitStart,
  habitStats,
  isDone,
  isDue,
  lastDays,
  overallRate,
  parseDay,
  shiftDay,
  weekday,
  type HabitHistory,
} from "@/lib/habits";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Chip, IconButton, Input, Label, LinkButton, Row, SectionHeader, Sheet, Txt, type IconName } from "@/components/ui";

const DAY_NUM = new Intl.DateTimeFormat("ar", { day: "numeric" });
const DAY_FULL = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" });

interface HabitDraft {
  title: string;
  cue: string;
  minimum: string;
  days: number[];
  valueId?: string;
  skillId?: string;
}

const emptyDraft = (over: Partial<HabitDraft> = {}): HabitDraft => ({ title: "", cue: "", minimum: "", days: [], ...over });

const draftFromHabit = (h: BinaryHabit): HabitDraft => ({
  title: h.title,
  cue: h.cue ?? "",
  minimum: h.minimum ?? "",
  days: h.days ?? [],
  valueId: h.valueId,
  skillId: h.skillId,
});

/** Habit tracking: a week you can tick (and catch up on), streaks that forgive one slip, and a 12-week map per habit. */
export function HabitsTool() {
  const c = useColors();
  const { binaryHabits, habitHistory, currentDay, values, skills, goalIdentities, settings, setHabitDay, addBinaryHabit, updateHabit, removeBinaryHabit } =
    useAppStore();
  const today = currentDay;
  const week = lastDays(today, 7);
  const active = binaryHabits.filter((h) => !h.archived);
  const archived = binaryHabits.filter((h) => h.archived);
  const stats = useMemo(
    () => new Map(binaryHabits.filter((h) => !h.archived).map((h) => [h.id, habitStats(h, habitHistory, today)])),
    [binaryHabits, habitHistory, today]
  );

  const [formOpen, setFormOpen] = useState<null | { mode: "add"; draft: HabitDraft } | { mode: "edit"; habit: BinaryHabit }>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const detail = binaryHabits.find((h) => h.id === detailId);

  const dueToday = active.filter((h) => isDue(h, today));
  const doneToday = dueToday.filter((h) => isDone(habitHistory, h.id, today)).length;
  const rate30 = overallRate(active, habitHistory, lastDays(today, 30), today);
  const longest = Math.max(0, ...[...stats.values()].map((s) => s.streak));
  const atRisk = active.filter((h) => {
    const s = stats.get(h.id)!;
    return s.dueToday && !s.doneToday && s.missedLast && s.streak > 0;
  });

  // Suggestions come from what the user already wrote: each value's daily behaviour, each goal's habit.
  // With faith content on, the prayer and wird habits wait here too: a habit is a 21-day commitment, never added for the user.
  const titles = new Set(binaryHabits.map((h) => h.title.trim()));
  const faithValue = values.find((v) => v.id === "val-faith");
  const suggestions = [
    ...(settings.faithContent ? starterHabitOptions(true).filter((h) => h.id.startsWith("h-faith")) : [])
      .filter((h) => !binaryHabits.some((b) => b.id === h.id) && !titles.has(h.title))
      .map((h) => ({ key: `f-${h.id}`, from: faithValue?.title ?? "المحتوى الإيماني", draft: emptyDraft({ title: h.title, valueId: faithValue?.id }) })),
    ...values
      .filter((v) => v.dailyAction && !titles.has(v.dailyAction.trim()) && !binaryHabits.some((h) => !h.archived && h.valueId === v.id))
      .map((v) => ({ key: `v-${v.id}`, from: v.title, draft: emptyDraft({ title: v.dailyAction, valueId: v.id }) })),
    ...goalIdentities
      .filter((g) => g.microHabit && !titles.has(g.microHabit.trim()))
      .map((g) => ({ key: `g-${g.id}`, from: g.goal, draft: emptyDraft({ title: g.microHabit, valueId: values.find((v) => v.title === g.coreValue)?.id }) })),
  ].slice(0, 6);

  const save = (d: HabitDraft) => {
    const input = { cue: d.cue || undefined, minimum: d.minimum || undefined, days: d.days, valueId: d.valueId, skillId: d.skillId };
    if (formOpen?.mode === "edit") updateHabit(formOpen.habit.id, { title: d.title, ...input });
    else addBinaryHabit(d.title, input);
    setFormOpen(null);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 10 }}>
        <Stat label="عادات اليوم" value={`${doneToday} من ${dueToday.length}`} tone="brand" />
        <Stat label="الالتزام في 30 يوماً" value={`${rate30}%`} tone={rate30 >= 70 ? "brand" : "accent"} />
        <Stat label="أطول سلسلة الآن" value={String(longest)} icon="zap" tone="accent" />
        <Stat label="عادات نشطة" value={String(active.length)} tone="neutral" />
      </View>

      {atRisk.length > 0 ? (
        <Card tone="accent" style={{ gap: 8 }}>
          <Row gap={6}>
            <Feather name="alert-triangle" size={16} color={c.accentStrong} />
            <Txt weight="medium">لا تفوّتها مرتين</Txt>
          </Row>
          <Txt variant="ui" color="ink2">
            فاتتك مرة. مرة واحدة لا تهدم شيئاً، لكن اليوم يقرّر إن كانت السلسلة ستبقى.
          </Txt>
          {atRisk.map((h) => (
            <View key={h.id} style={{ gap: 4 }}>
              <Button title={h.title} icon="check" variant="secondary" size="sm" style={{ alignSelf: "flex-end" }} onPress={() => setHabitDay(h.id, today, true)} />
              {h.minimum ? (
                <Txt variant="small" color="ink2">
                  النسخة الصغرى تكفي: {h.minimum}
                </Txt>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <SectionHeader
          title="أسبوعك"
          description="اضغط أي يوم لتسجيله. نسيت أمس؟ سجّله الآن بصدق."
          action={<Button title="عادة جديدة" icon="plus" size="sm" onPress={() => setFormOpen({ mode: "add", draft: emptyDraft() })} />}
        />
        {active.length === 0 ? (
          <View style={{ paddingVertical: 18, gap: 4, alignItems: "center" }}>
            <Feather name="repeat" size={22} color={c.ink3} />
            <Txt weight="semibold" align="center">
              لا عادات بعد
            </Txt>
            <Txt variant="ui" color="ink2" align="center">
              ابدأ بعادة واحدة صغيرة جداً. الثبات أولاً، ثم الحجم.
            </Txt>
          </View>
        ) : (
          <>
            <Row gap={4} style={{ paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {week.map((d) => (
                <View key={d} style={{ width: 36, alignItems: "center" }}>
                  <Txt variant="caption" weight={d === today ? "semibold" : "regular"} color={d === today ? "brand" : "ink3"} align="center">
                    {weekday(parseDay(d).getDay()).short}
                  </Txt>
                  <Txt variant="caption" color={d === today ? "brand" : "ink3"} align="center">
                    {DAY_NUM.format(parseDay(d))}
                  </Txt>
                </View>
              ))}
            </Row>
            {active.map((h, i) => (
              <HabitRow
                key={h.id}
                habit={h}
                week={week}
                today={today}
                history={habitHistory}
                streak={stats.get(h.id)!.streak}
                locked={habitLock(h, habitHistory, today).locked}
                valueTitle={values.find((v) => v.id === h.valueId)?.title}
                first={i === 0}
                onToggle={(d) => setHabitDay(h.id, d, !isDone(habitHistory, h.id, d))}
                onOpen={() => setDetailId(h.id)}
              />
            ))}
          </>
        )}
      </Card>

      {suggestions.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <SectionHeader title="عادات تنتظرك" description="من سلوك قيمك اليومي وعادات أهدافك التي كتبتها في دستور القيم. اختر واحدة إن كنت مستعداً لـ21 يوماً." />
          {suggestions.map((s) => (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              onPress={() => setFormOpen({ mode: "add", draft: s.draft })}
              style={({ pressed }) => ({
                borderRadius: radius.lg,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: pressed ? c.brand : c.lineStrong,
                paddingHorizontal: 14,
                paddingVertical: 10,
              })}
            >
              <Txt variant="ui">{s.draft.title}</Txt>
              <Txt variant="caption" color="accentStrong">
                من: {s.from}
              </Txt>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {archived.length > 0 ? (
        <Card style={{ gap: 8 }}>
          <Pressable onPress={() => setShowArchived((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showArchived }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Txt variant="ui" weight="medium" color="ink2">
                عادات مؤرشفة ({archived.length})
              </Txt>
              <Feather name={showArchived ? "chevron-up" : "chevron-down"} size={18} color={c.ink3} />
            </Row>
          </Pressable>
          {showArchived
            ? archived.map((h) => (
                <Row key={h.id} gap={6} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
                  <Txt variant="ui" color="ink2" style={{ flex: 1 }}>
                    {h.title}
                  </Txt>
                  <Button title="استعادة" icon="rotate-ccw" size="sm" variant="ghost" onPress={() => updateHabit(h.id, { archived: false })} />
                  <IconButton icon="trash-2" label={`حذف ${h.title} نهائياً`} onPress={() => removeBinaryHabit(h.id)} />
                </Row>
              ))
            : null}
        </Card>
      ) : null}

      <Sheet
        open={Boolean(formOpen)}
        onClose={() => setFormOpen(null)}
        title={formOpen?.mode === "edit" ? "تعديل العادة" : "عادة جديدة"}
        description="صغيرة، ومحددة الموعد، ومربوطة بقيمة. هكذا تبقى."
      >
        {formOpen ? (
          <HabitForm
            key={formOpen.mode === "edit" ? formOpen.habit.id : formOpen.draft.title}
            initial={formOpen.mode === "edit" ? draftFromHabit(formOpen.habit) : formOpen.draft}
            submitLabel={formOpen.mode === "edit" ? "حفظ" : "أضف العادة"}
            onSubmit={save}
            onCancel={() => setFormOpen(null)}
          />
        ) : null}
      </Sheet>

      <Sheet open={Boolean(detail)} onClose={() => setDetailId(null)} title={detail?.title}>
        {detail ? (
          <HabitDetail
            habit={detail}
            history={habitHistory}
            today={today}
            valueTitle={values.find((v) => v.id === detail.valueId)?.title}
            skillTitle={skills.find((s) => s.id === detail.skillId)?.title}
            onEdit={() => {
              setDetailId(null);
              setFormOpen({ mode: "edit", habit: detail });
            }}
            onArchive={() => {
              updateHabit(detail.id, { archived: true });
              setDetailId(null);
            }}
            onMap={() => {
              setDetailId(null);
              router.push("/vision");
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

function HabitRow({
  habit,
  week,
  today,
  history,
  streak,
  valueTitle,
  locked,
  first,
  onToggle,
  onOpen,
}: {
  habit: BinaryHabit;
  week: string[];
  today: string;
  history: HabitHistory;
  streak: number;
  valueTitle?: string;
  locked: boolean;
  first: boolean;
  onToggle: (day: string) => void;
  onOpen: () => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 8, paddingTop: first ? 0 : 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityHint="تفاصيل العادة">
        <Row gap={6}>
          <Txt weight="medium" numberOfLines={1} style={{ flex: 1 }}>
            {habit.title}
          </Txt>
          {locked ? <Feather name="lock" size={13} color={c.ink3} accessibilityLabel="ملتزم بها 21 يوماً" /> : null}
          <Row gap={3}>
            <Feather name="zap" size={14} color={streak > 0 ? c.accentStrong : c.ink3} />
            <Txt variant="ui" weight={streak > 0 ? "semibold" : "regular"} color={streak > 0 ? "accentStrong" : "ink3"}>
              {streak}
            </Txt>
          </Row>
        </Row>
        {habit.cue || valueTitle || habit.days?.length ? (
          <Row gap={10} style={{ flexWrap: "wrap" }}>
            {habit.cue ? (
              <Txt variant="caption" color="ink3">
                بعد أن {habit.cue}
              </Txt>
            ) : null}
            {valueTitle ? (
              <Row gap={3}>
                <Feather name="heart" size={11} color={c.accentStrong} />
                <Txt variant="caption" color="accentStrong">
                  {valueTitle}
                </Txt>
              </Row>
            ) : null}
            {habit.days?.length ? (
              <Txt variant="caption" color="ink3">
                {WEEKDAYS.filter((w) => habit.days!.includes(w.day))
                  .map((w) => w.short)
                  .join(" ")}
              </Txt>
            ) : null}
          </Row>
        ) : null}
      </Pressable>
      <Row gap={4}>
        {week.map((d) => {
          const done = isDone(history, habit.id, d);
          const due = isDue(habit, d);
          return (
            <Pressable
              key={d}
              onPress={() => onToggle(d)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${habit.title} — ${DAY_FULL.format(parseDay(d))}${due ? "" : " (ليس من أيامها)"}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? c.brand : "transparent",
                borderWidth: done ? 0 : d === today ? 2 : 1,
                borderStyle: !done && !due ? "dashed" : "solid",
                borderColor: d === today ? c.brand : due ? c.lineStrong : c.line,
              }}
            >
              {done ? <Feather name="check" size={16} color={c.brandInk} /> : null}
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/** One form for adding and editing: what, when (cue + days), the bad-day version, and which value it serves. */
function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: HabitDraft;
  submitLabel: string;
  onSubmit: (d: HabitDraft) => void;
  onCancel: () => void;
}) {
  const c = useColors();
  const values = useAppStore((s) => s.values);
  const skills = useAppStore((s) => s.skills);
  const [d, setD] = useState<HabitDraft>(initial);
  const everyDay = d.days.length === 0 || d.days.length === 7;

  const toggleDay = (day: number) => {
    const base = everyDay ? WEEKDAYS.map((w) => w.day) : d.days;
    const next = base.includes(day) ? base.filter((x) => x !== day) : [...base, day].sort();
    setD({ ...d, days: next.length === 7 ? [] : next });
  };

  const submit = () => {
    if (d.title.trim()) onSubmit({ ...d, title: d.title.trim(), cue: d.cue.trim(), minimum: d.minimum.trim() });
  };

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Label>العادة</Label>
        <Input value={d.title} onChangeText={(t) => setD({ ...d, title: t })} placeholder="مثال: قراءة 10 صفحات" maxLength={80} />
      </View>
      <View>
        <Label hint="اربطها بشيء تفعله كل يوم أصلاً، فيصير هو المنبّه.">متى بالضبط؟</Label>
        <Row gap={8}>
          <Txt variant="ui" color="ink2">
            بعد أن
          </Txt>
          <View style={{ flex: 1 }}>
            <Input value={d.cue} onChangeText={(t) => setD({ ...d, cue: t })} placeholder="أصلّي الفجر / أشرب قهوة الصباح" maxLength={80} />
          </View>
        </Row>
      </View>
      <View>
        <Label hint="في أسوأ أيامك: أصغر شيء يُحسب. القليل الدائم يغلب الكثير المنقطع.">النسخة الصغرى</Label>
        <Input value={d.minimum} onChangeText={(t) => setD({ ...d, minimum: t })} placeholder="مثال: صفحة واحدة" maxLength={80} />
      </View>
      <View>
        <Label>الأيام</Label>
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          <Chip label="كل يوم" selected={everyDay} onPress={() => setD({ ...d, days: [] })} />
          {WEEKDAYS.map((w) => (
            <Chip key={w.day} label={w.short} selected={!everyDay && d.days.includes(w.day)} onPress={() => toggleDay(w.day)} />
          ))}
        </View>
      </View>
      {values.length > 0 ? (
        <View>
          <Label hint="كل مرة تفعلها صوتٌ لهذه القيمة.">لأي قيمة؟</Label>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
            <Chip label="بلا قيمة" selected={!d.valueId} onPress={() => setD({ ...d, valueId: undefined })} />
            {values.map((v) => (
              <Chip key={v.id} label={v.title} selected={d.valueId === v.id} onPress={() => setD({ ...d, valueId: v.id })} />
            ))}
          </View>
        </View>
      ) : null}
      {skills.length > 0 ? (
        <View>
          <Label hint="اختياري">تبني مهارة؟</Label>
          <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
            <Chip label="لا" selected={!d.skillId} onPress={() => setD({ ...d, skillId: undefined })} />
            {skills.map((s) => (
              <Chip key={s.id} label={s.title} selected={d.skillId === s.id} onPress={() => setD({ ...d, skillId: s.id })} />
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ borderRadius: radius.md, backgroundColor: c.accentSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Txt variant="small" color="ink2">
          العادة التزام {HABIT_COMMITMENT_DAYS} يوماً: بعد أول {HABIT_GRACE_HOURS} ساعة لا تُعدَّل ولا تُؤرشف حتى يكتمل. اخترها صغيرة بما يكفي لتصمد.
        </Txt>
      </View>
      <Row style={{ justifyContent: "flex-start" }}>
        <Button title={submitLabel} disabled={!d.title.trim()} onPress={submit} />
        <Button title="إلغاء" variant="ghost" onPress={onCancel} />
      </Row>
    </View>
  );
}

function HabitDetail({
  habit,
  history,
  today,
  valueTitle,
  skillTitle,
  onEdit,
  onArchive,
  onMap,
}: {
  habit: BinaryHabit;
  history: HabitHistory;
  today: string;
  valueTitle?: string;
  skillTitle?: string;
  onEdit: () => void;
  onArchive: () => void;
  onMap: () => void;
}) {
  const c = useColors();
  const s = habitStats(habit, history, today);
  const start = habitStart(habit, history, today);
  const lock = habitLock(habit, history, today);
  // 12 full weeks, Saturday-first columns like the rest of the app, ending with the current week.
  const thisSaturday = shiftDay(today, -((parseDay(today).getDay() + 1) % 7));
  const firstSaturday = shiftDay(thisSaturday, -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => shiftDay(firstSaturday, w * 7 + d)));

  return (
    <View style={{ gap: 14 }}>
      {valueTitle || skillTitle || habit.cue ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {valueTitle ? (
            <Badge tone="accent" icon="heart">
              {valueTitle}
            </Badge>
          ) : null}
          {skillTitle ? (
            <Badge tone="neutral" icon="layers">
              {skillTitle}
            </Badge>
          ) : null}
          {habit.cue ? <Badge tone="neutral">بعد أن {habit.cue}</Badge> : null}
        </View>
      ) : null}
      {habit.minimum ? (
        <Row gap={6}>
          <Feather name="star" size={14} color={c.accentStrong} />
          <Txt variant="ui" color="ink2">
            النسخة الصغرى: <Txt variant="ui">{habit.minimum}</Txt>
          </Txt>
        </Row>
      ) : null}

      <CommitmentBar lock={lock} />

      <Row gap={8}>
        <Mini label="السلسلة" value={s.streak} icon="zap" />
        <Mini label="الأفضل" value={s.best} icon="award" />
        <Mini label="30 يوماً" value={`${s.rate30}%`} />
        <Mini label="مجموع" value={s.totalDone} />
      </Row>

      <View style={{ gap: 6 }}>
        <Txt variant="small" color="ink3">
          آخر 12 أسبوعاً
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: ROW, gap: 4 }}>
          <View style={{ gap: 4 }}>
            {WEEKDAYS.map((w) => (
              <Txt key={w.day} variant="caption" color="ink3" style={{ height: 16, lineHeight: 16, fontSize: 10 }}>
                {w.short}
              </Txt>
            ))}
          </View>
          {weeks.map((days, i) => (
            <View key={i} style={{ gap: 4 }}>
              {days.map((d) => {
                const future = d > today;
                const before = d < start;
                const done = isDone(history, habit.id, d);
                return (
                  <View
                    key={d}
                    accessibilityLabel={DAY_FULL.format(parseDay(d))}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: future ? "transparent" : before ? c.surface2 : done ? c.brand : isDue(habit, d) ? c.line : c.surface2,
                      opacity: before ? 0.5 : 1,
                      borderWidth: d === today ? 1 : 0,
                      borderColor: c.ink,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
        <Txt variant="caption" color="ink3">
          السلسلة تتحمّل يوماً فائتاً واحداً، وتنقطع بيومين متتاليين. القاعدة: لا تفوّتها مرتين.
        </Txt>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, gap: 10 }}>
        {lock.locked ? (
          <Row gap={6}>
            <Feather name="lock" size={14} color={c.ink3} />
            <Txt variant="small" color="ink3">
              التعديل والأرشفة بعد {lock.daysLeft} {lock.daysLeft === 1 ? "يوم" : "يوماً"}
            </Txt>
          </Row>
        ) : (
          <Row>
            <Button title="تعديل" icon="edit-2" size="sm" variant="secondary" onPress={onEdit} />
            <Button title="أرشفة" icon="archive" size="sm" variant="ghost" onPress={onArchive} />
          </Row>
        )}
        <View style={{ alignItems: "flex-end" }}>
          <LinkButton title="مكانها في خريطة الرؤية" icon="map" onPress={onMap} />
        </View>
      </View>
    </View>
  );
}

/** Day N of 21: the commitment made visible, and why the edit buttons wait. */
function CommitmentBar({ lock }: { lock: ReturnType<typeof habitLock> }) {
  const c = useColors();
  if (!lock.locked && !lock.inGrace) {
    return (
      <Row gap={8} style={{ borderRadius: radius.md, backgroundColor: c.brandSoft, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Feather name="award" size={16} color={c.brand} />
        <Txt variant="ui" color="brand" style={{ flex: 1 }}>
          أتممت التزام الـ{HABIT_COMMITMENT_DAYS} يوماً. صارت جزءاً منك — عدّلها إن احتجت.
        </Txt>
      </Row>
    );
  }
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, gap: 8 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={6}>
          <Feather name="lock" size={15} color={c.accentStrong} />
          <Txt variant="ui" weight="medium">
            التزام {HABIT_COMMITMENT_DAYS} يوماً
          </Txt>
        </Row>
        <Txt variant="small" color="ink2">
          اليوم {lock.day} من {HABIT_COMMITMENT_DAYS}
        </Txt>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: "hidden", flexDirection: ROW }}>
        <View style={{ width: `${(lock.day / HABIT_COMMITMENT_DAYS) * 100}%`, backgroundColor: c.accent, borderRadius: 3 }} />
      </View>
      <Txt variant="small" color="ink3">
        {lock.inGrace
          ? `أول ${HABIT_GRACE_HOURS} ساعة مفتوحة لتصحيح ما كتبت، ثم تُقفل حتى يكتمل الالتزام.`
          : "لا تعديل ولا أرشفة قبل اكتماله. العادة تحتاج وقتها لتثبت، والتغيير المبكر هروب لطيف."}
      </Txt>
    </View>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: "brand" | "accent" | "neutral"; icon?: IconName }) {
  const c = useColors();
  const color = tone === "brand" ? "brand" : tone === "accent" ? "accentStrong" : "ink";
  return (
    <Card style={{ flexGrow: 1, flexBasis: "45%", padding: 14, gap: 6 }}>
      <Txt variant="small" color="ink3">
        {label}
      </Txt>
      <Row gap={6}>
        {icon ? <Feather name={icon} size={18} color={c[color]} /> : null}
        <Txt variant="heading" weight="medium" color={color}>
          {value}
        </Txt>
      </Row>
    </Card>
  );
}

function Mini({ label, value, icon }: { label: string; value: number | string; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, borderRadius: radius.md, backgroundColor: c.surface2, paddingVertical: 10, alignItems: "center" }}>
      <Row gap={4}>
        {icon ? <Feather name={icon} size={14} color={c.accentStrong} /> : null}
        <Txt variant="title" weight="medium" align="center">
          {value}
        </Txt>
      </Row>
      <Txt variant="caption" color="ink3" align="center">
        {label}
      </Txt>
    </View>
  );
}
