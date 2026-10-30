import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import {
  FAITH_VALUE_TEMPLATE,
  FOCUS_AREAS,
  FOCUS_SUGGESTIONS,
  MAX_STARTER_HABITS,
  VALUE_TEMPLATES,
  customValue,
  starterHabitOptions,
  useAppStore,
  type FocusAreaId,
} from "@/stores/useAppStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { HABIT_COMMITMENT_DAYS, HABIT_GRACE_HOURS } from "@/lib/habits";
import { ROW, radius, useColors } from "@/theme";
import { Button, Chip, Input, Label, Row, Screen, Txt, type IconName } from "@/components/ui";
import { BackupPanel } from "@/components/settings/BackupPanel";
import { SyncPanel } from "@/components/settings/SyncPanel";
import { PERSONAL_SYNC_ENABLED } from "@/lib/sync/flag";

const STEPS = ["البداية", "عنك", "الطابع", "قيمك", "عاداتك", "اليوم"];

export default function OnboardingScreen() {
  const c = useColors();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [focusArea, setFocusArea] = useState<FocusAreaId | null>(null);
  const [faith, setFaith] = useState<boolean | null>(null);
  const [valueIds, setValueIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [showImport, setShowImport] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [ownValue, setOwnValue] = useState({ title: "", definition: "" });
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");

  if (onboardingDone) return <Redirect href="/" />;

  // The focus answer shapes what comes next: its values and habit are suggested first, and its example fills the first priority.
  const suggested = focusArea ? FOCUS_SUGGESTIONS[focusArea] : null;
  const isSuggested = (id: string) => Boolean(suggested?.valueIds.includes(id) || suggested?.habitId === id);
  const rank = (id: string) => suggested?.valueIds.indexOf(id) ?? -1;
  const firstSuggested = <T extends { id: string }>(list: T[]) => [
    ...list.filter((x) => isSuggested(x.id)).sort((a, b) => rank(a.id) - rank(b.id)),
    ...list.filter((x) => !isSuggested(x.id)),
  ];
  const valuePool = faith ? [FAITH_VALUE_TEMPLATE, ...firstSuggested(VALUE_TEMPLATES)] : firstSuggested(VALUE_TEMPLATES);
  const hasOwnValue = ownValue.title.trim().length > 0;
  const valueCount = valueIds.length + (hasOwnValue ? 1 : 0);
  const habitPool = firstSuggested(starterHabitOptions(Boolean(faith)));
  // Picks made before switching faith content off can't carry faith habits along.
  const pickedHabits = habitIds.filter((id) => habitPool.some((h) => h.id === id));
  const habitCount = pickedHabits.length + (customHabit.trim() ? 1 : 0);

  const canNext =
    step === 0 ||
    (step === 1 && name.trim().length > 0 && focusArea !== null) ||
    (step === 2 && faith !== null) ||
    (step === 3 && valueCount > 0 && valueCount <= 3) ||
    (step === 4 && habitCount <= MAX_STARTER_HABITS) ||
    (step === 5 && priorities.some((p) => p.trim()));
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!canNext) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    useJourneyStore.getState().startGuided();
    const habits = { ids: pickedHabits, custom: customHabit.trim() ? [customHabit] : [] };
    const customValues = hasOwnValue ? [customValue(ownValue.title, ownValue.definition)] : [];
    completeOnboarding({ name, focusArea, valueIds, customValues, priorities, faithContent: Boolean(faith), habits });
    router.replace("/");
  };

  const toggleValue = (id: string) =>
    setValueIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : valueCount >= 3 ? prev : [...prev, id]));
  const toggleHabit = (id: string) =>
    setHabitIds((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : habitCount >= MAX_STARTER_HABITS ? prev : [...pickedHabits, id]));

  return (
    <Screen>
      <Row gap={6} style={{ justifyContent: "center" }}>
        {STEPS.map((label, i) => (
          <View key={label} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.brand : c.line }} />
        ))}
      </Row>

      {step === 0 ? (
        <View style={{ gap: 12 }}>
          <Txt variant="heading" weight="semibold">
            أهلاً بك في أدرك عمرك
          </Txt>
          <Txt color="ink2">ثلاث أولويات فقط، وتركيز محمي، وإغلاق مسائي هادئ، وعودة سريعة حين تتعثر. خطوات قليلة ونبدأ.</Txt>
          {/* The personal build joins the founder's computer copy before any onboarding data exists:
              a phone that was never set up only pulls, so nothing here is merged into the real data.
              Once the pull lands, onboardingDone is true and the redirect above opens the app. */}
          {PERSONAL_SYNC_ENABLED ? (
            <>
              <Pressable onPress={() => setShowSync((v) => !v)} accessibilityRole="button">
                <Txt variant="ui" color="brand" weight="medium" align="center">
                  نسختك على الكمبيوتر؟ اربط المزامنة لتصلك بياناتك كما هي
                </Txt>
              </Pressable>
              {showSync ? <SyncPanel /> : null}
            </>
          ) : null}
          <Pressable onPress={() => setShowImport((v) => !v)} accessibilityRole="button">
            <Txt variant="ui" color="brand" weight="medium" align="center">
              لديك بيانات من نسخة الويب؟ استوردها بدل البدء من الصفر
            </Txt>
          </Pressable>
          {showImport ? <BackupPanel /> : null}
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: 14 }}>
          <Txt variant="heading" weight="semibold">
            عرّفنا بك
          </Txt>
          <View>
            <Label>ما اسمك؟</Label>
            <Input value={name} onChangeText={setName} placeholder="الاسم الأول يكفي" />
          </View>
          <View>
            <Label>أين تريد أن تركز الآن؟</Label>
            <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 8 }}>
              {FOCUS_AREAS.map((a) => (
                <Chip key={a.id} label={a.label} selected={focusArea === a.id} onPress={() => setFocusArea(a.id)} />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 12 }}>
          <Txt variant="heading" weight="semibold">
            هل تريد لمسة إيمانية في يومك؟
          </Txt>
          <Option
            icon="moon"
            title="نعم، أضِفها"
            text="آية يومية للتثبيت، والتاريخ الهجري، واقتراح عادات الصلاة والورد في خطوة العادات."
            selected={faith === true}
            onPress={() => setFaith(true)}
          />
          <Option
            icon="sun"
            title="ليس الآن"
            text="مبدأ يومي قصير في الإنتاجية والتعافي بدلاً منها. تستطيع تغييرها من الإعدادات."
            selected={faith === false}
            onPress={() => setFaith(false)}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 10 }}>
          <Txt variant="heading" weight="semibold">
            اختر ثلاث قيم تحكم قراراتك
          </Txt>
          <Txt color="ink2">حين يتعارض الواجب مع الرغبة، هذه القيم هي من تحسم. يمكنك تعديلها لاحقاً في دستور القيم.</Txt>
          {valuePool.map((v) => (
            <Option
              key={v.id}
              icon="heart"
              title={v.title}
              text={v.definition}
              badge={isSuggested(v.id) ? "مقترحة لك" : undefined}
              selected={valueIds.includes(v.id)}
              disabled={!valueIds.includes(v.id) && valueCount >= 3}
              onPress={() => toggleValue(v.id)}
            />
          ))}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Label>أو اكتب قيمة لا تجدها هنا</Label>
            <Input
              value={ownValue.title}
              onChangeText={(t) => setOwnValue({ ...ownValue, title: t })}
              editable={hasOwnValue || valueCount < 3}
              placeholder="مثال: خدمة الناس"
              maxLength={60}
            />
            {hasOwnValue ? (
              <Input
                accessibilityLabel="معناها لك"
                value={ownValue.definition}
                onChangeText={(t) => setOwnValue({ ...ownValue, definition: t })}
                placeholder="ماذا تعني لك في سطر؟ (اختياري)"
                maxLength={140}
              />
            ) : null}
          </View>
          <Txt variant="small" color="ink3">
            اخترت {valueCount} من 3.
          </Txt>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: 10 }}>
          <Txt variant="heading" weight="semibold">
            عادة أو اثنتان، لا أكثر
          </Txt>
          <Txt color="ink2">
            كل عادة تختارها التزام لـ{HABIT_COMMITMENT_DAYS} يوماً: لا تعديل ولا حذف قبلها، وأول {HABIT_GRACE_HOURS} ساعة مفتوحة لتصحيح الخطأ. ابدأ صغيراً.
          </Txt>
          {habitPool.map((h) => {
            const selected = pickedHabits.includes(h.id);
            return (
              <Option
                key={h.id}
                icon="repeat"
                title={h.title}
                badge={isSuggested(h.id) ? "مقترحة لك" : undefined}
                selected={selected}
                disabled={!selected && habitCount >= MAX_STARTER_HABITS}
                onPress={() => toggleHabit(h.id)}
              />
            );
          })}
          <View>
            <Label>أو اكتب عادتك</Label>
            <Input
              value={customHabit}
              onChangeText={setCustomHabit}
              editable={Boolean(customHabit.trim()) || habitCount < MAX_STARTER_HABITS}
              placeholder="مثال: قراءة 10 صفحات بعد الفجر"
              maxLength={80}
            />
          </View>
          <Txt variant="small" color="ink3">
            اخترت {habitCount} من {MAX_STARTER_HABITS}. {habitCount === 0 ? "يمكنك أن تبدأ بلا عادة وتضيفها لاحقاً من أداة العادات." : ""}
          </Txt>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={{ gap: 10 }}>
          <Txt variant="heading" weight="semibold">
            ما أهم ثلاثة أشياء تنجزها اليوم؟
          </Txt>
          <Txt color="ink2">أولويات كبرى فقط، لا قائمة مهام. إن أنجزتها وحدها فقد كان يوماً ناجحاً.</Txt>
          {priorities.map((p, i) => (
            <Input
              key={i}
              value={p}
              onChangeText={(t) => setPriorities((prev) => prev.map((x, j) => (j === i ? t : x)))}
              placeholder={i === 0 ? suggested?.priority ?? "الأهم أولاً — ما يصعب تأجيله" : i === 1 ? "الأولوية الثانية" : "الثالثة (اختياري)"}
              accessibilityLabel={`الأولوية ${i + 1}`}
            />
          ))}
        </View>
      ) : null}

      <Row style={{ justifyContent: "space-between", marginTop: 8 }}>
        <Button title={last ? "ابدأ يومك" : "التالي"} icon={last ? "check" : "arrow-left"} disabled={!canNext} onPress={next} />
        {step > 0 ? <Button title="رجوع" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
      </Row>
    </Screen>
  );
}

function Option({
  icon,
  title,
  text,
  badge,
  selected,
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  text?: string;
  badge?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={{
        opacity: disabled ? 0.5 : 1,
        borderRadius: radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.brand : c.line,
        backgroundColor: selected ? c.brandSoft : c.surface,
        padding: 14,
      }}
    >
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: selected ? c.surface : c.surface2, alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={17} color={c.brand} />
        </View>
        <View style={{ flex: 1 }}>
          {badge ? (
            <Txt variant="caption" weight="medium" color="accentStrong">
              {badge}
            </Txt>
          ) : null}
          <Txt weight="semibold">{title}</Txt>
          {text ? (
            <Txt variant="small" color="ink2">
              {text}
            </Txt>
          ) : null}
        </View>
      </Row>
    </Pressable>
  );
}
