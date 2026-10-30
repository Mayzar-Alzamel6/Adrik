import React, { useEffect, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useVaultStore } from "@/stores/useVaultStore";
import { useAppStore } from "@/stores/useAppStore";
import { ROW, radius, useColors } from "@/theme";
import { Badge, Button, Card, Input, Label, Row, SectionHeader, Segmented, Sheet, Txt } from "@/components/ui";
import { SendTo } from "@/components/flow/SendTo";
import { sendToInbox } from "@/lib/flow";
import { successFeedback } from "@/lib/feedback";

// 4-4-6 breathing: 14 seconds per cycle.
const PHASES = [
  { key: "in", label: "شهيق", seconds: 4 },
  { key: "hold", label: "ثبات", seconds: 4 },
  { key: "out", label: "زفير", seconds: 6 },
] as const;
const CYCLE = 14;

function remaining(unlocksAt: number, now: number) {
  const diff = unlocksAt - now;
  if (diff <= 0) return "انتهى التأجيل، القرار لك الآن";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `متبقٍ ${h} س ${m} د` : `متبقٍ ${m} د`;
}

/** Impulse delay & Architect Sandbox: postpone the urge 2h/24h or freeze architecture rabbit holes for 48h. */
export function VaultTool() {
  const c = useColors();
  const {
    vaultItems,
    addVaultItem,
    addArchitectVaultItem,
    resolveVaultItem,
    markSurfingCompleted,
    isSurfingModalOpen,
    currentSurfingItem,
    openSurfingModal,
    closeSurfingModal,
  } = useVaultStore();
  const { symbolismLogs, addSymbolismLog } = useAppStore();
  const faith = useAppStore((s) => s.settings.faithContent);

  const [vaultTab, setVaultTab] = useState<"impulse" | "architect">("impulse");

  // Impulse state
  const [text, setText] = useState("");
  const [intensity, setIntensity] = useState(6);
  const [hours, setHours] = useState<"2" | "24">("2");
  const [decoding, setDecoding] = useState(false);

  // Architect state
  const [archTitle, setArchTitle] = useState("");
  const [realProblem, setRealProblem] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [roiReason, setRoiReason] = useState("");

  const [now, setNow] = useState(() => Date.now());

  // Countdowns refresh once a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const postpone = () => {
    if (!text.trim()) return;
    const item = addVaultItem(text.trim(), intensity, Number(hours) as 2 | 24);
    setText("");
    setDecoding(false);
    openSurfingModal(item);
  };

  const submitArchitectIdea = () => {
    if (!archTitle.trim() || !realProblem.trim() || !mechanism.trim() || !roiReason.trim()) return;
    addArchitectVaultItem(archTitle.trim(), realProblem.trim(), mechanism.trim(), roiReason.trim());
    successFeedback();
    setArchTitle("");
    setRealProblem("");
    setMechanism("");
    setRoiReason("");
  };

  const active = vaultItems.filter((i) => !i.isResolved);
  const resolvedCount = vaultItems.length - active.length;

  return (
    <View style={{ gap: 16 }}>
      {/* Tab Switcher */}
      <Segmented<"impulse" | "architect">
        value={vaultTab}
        onChange={setVaultTab}
        options={[
          { value: "impulse", label: "تجميد نزوة (2-24س)", icon: "clock" },
          { value: "architect", label: "أفكار معمارية (48س)", icon: "cpu" },
        ]}
      />

      <Card style={{ gap: 14 }}>
        {vaultTab === "architect" ? (
          /* Architect Sandbox Mode */
          <View style={{ gap: 12 }}>
            <SectionHeader
              title="مستودع الأفكار المعمارية (Sandbox)"
              description="تحييد النزوات البرمجية والمشاريع الجانبية: تجميد إجباري 48 ساعة لفصل الحماس عن الجدوى."
            />

            <Row
              gap={10}
              style={{
                backgroundColor: c.accentSoft,
                borderRadius: radius.md,
                padding: 12,
                alignItems: "flex-start",
              }}
            >
              <Feather name="shield" size={16} color={c.accentStrong} style={{ marginTop: 2 }} />
              <Txt variant="small" color="accentStrong" style={{ flex: 1, lineHeight: 18 }}>
                المهندس (INTJ) يهرب من الروتين الثقيل بابتكار ميزات جانبية وأفكار تقنية غير مجدولة. قيّد الفكرة هنا
                بالمعايير الثلاثة ودعها تنضج 48 ساعة قبل أن تلمس الكود.
              </Txt>
            </Row>

            <View>
              <Label>عنوان الفكرة أو الميزة المعمارية</Label>
              <Input
                value={archTitle}
                onChangeText={setArchTitle}
                placeholder="مثال: إعادة بناء محرك المزامنة..."
              />
            </View>

            <View>
              <Label hint="ما الذي يتعطل حالياً ويستوجب هذا الحل؟">1. المشكلة الحقيقية (Real Problem)</Label>
              <Input
                value={realProblem}
                onChangeText={setRealProblem}
                placeholder="ما المشكلة الفعلية التي تحلها الفكرة؟"
              />
            </View>

            <View>
              <Label hint="كيف تعمل الخوارزمية في جملتين بأقل تعقيد؟">2. الآلية المختصرة (Mechanism)</Label>
              <Input
                value={mechanism}
                onChangeText={setMechanism}
                placeholder="كيف تعمل بأقل تعقيد ممكن؟"
              />
            </View>

            <View>
              <Label hint="لماذا تستحق وقتك مقارنة بأولوياتك الحالية؟">3. العائد على الاستثمار (ROI vs Priorities)</Label>
              <Input
                value={roiReason}
                onChangeText={setRoiReason}
                placeholder="ما الرافعة الحقيقية مقارنة بالأولويات؟"
              />
            </View>

            <Button
              title="إيداع الفكرة وتجميدها 48 ساعة ❄️"
              disabled={!archTitle.trim() || !realProblem.trim() || !mechanism.trim() || !roiReason.trim()}
              onPress={submitArchitectIdea}
            />
          </View>
        ) : decoding ? (
          <Decoder
            escapeActivity={text}
            faith={faith}
            onCancel={() => setDecoding(false)}
            onDecoded={(data) => {
              addSymbolismLog({ escapeActivity: text.trim(), ...data });
              postpone();
            }}
          />
        ) : (
          /* Regular Impulse Delay Form */
          <>
            <SectionHeader title="رغبة مفاجئة الآن؟" description="أنت لا تحرم نفسك؛ أنت تؤجل القرار فقط، لتفصل الانفعال عن السلوك." />
            <View>
              <Label>ما الذي تريد فعله؟</Label>
              <Input value={text} onChangeText={setText} placeholder="مثال: فتح إنستغرام، شراء شيء غير مخطط" />
            </View>
            <View>
              <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <Txt variant="ui" weight="medium">
                  شدة الرغبة
                </Txt>
                <Txt variant="lead">{intensity} من 10</Txt>
              </Row>
              <View style={{ flexDirection: ROW, gap: 3 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setIntensity(n)}
                    accessibilityLabel={`شدة ${n}`}
                    style={{ flex: 1, height: 28, borderRadius: 6, backgroundColor: n <= intensity ? (n >= 8 ? c.danger : c.brand) : c.surface2 }}
                  />
                ))}
              </View>
              <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
                <Txt variant="caption" color="ink3">
                  خفيفة
                </Txt>
                <Txt variant="caption" color="ink3">
                  ملحّة جداً
                </Txt>
              </Row>
            </View>
            <View>
              <Label>أجّلها لمدة</Label>
              <Segmented value={hours} onChange={setHours} options={[{ value: "2", label: "ساعتين" }, { value: "24", label: "يوم كامل" }]} />
            </View>
            <Row style={{ flexWrap: "wrap" }}>
              <Button title="أجّلها" onPress={postpone} disabled={!text.trim()} />
              <Button title="افهم سببها أولاً" icon="compass" variant="secondary" disabled={!text.trim()} onPress={() => setDecoding(true)} />
            </Row>
          </>
        )}
      </Card>

      {/* Active Vault Items Card */}
      <Card style={{ gap: 10 }}>
        <SectionHeader title="مؤجلة في الصندوق" action={resolvedCount > 0 ? <Badge tone="brand">{`${resolvedCount} قرار واعٍ`}</Badge> : undefined} />
        {active.length === 0 ? (
          <Txt variant="ui" color="ink2" align="center" style={{ paddingVertical: 12 }}>
            لا شيء مجمد الآن. حين تداهمك رغبة أو فكرة معمارية جانبية، أودعها هنا.
          </Txt>
        ) : (
          active.map((item) => {
            const isArchitect = item.itemType === "architect";
            const isReady = item.unlocksAt <= now;

            return (
              <View
                key={item.id}
                style={{
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: isArchitect ? c.accent : c.line,
                  backgroundColor: isArchitect ? c.accentSoft : c.surface,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    {isArchitect ? (
                      <View style={{ alignSelf: "flex-start", marginBottom: 4 }}>
                        <Badge tone="accent" icon="cpu">فكرة معمارية (قفل 48س)</Badge>
                      </View>
                    ) : null}
                    <Txt weight="bold">{item.impulseTitle}</Txt>
                  </View>
                  <Txt variant="caption" color="ink3">
                    {isArchitect ? "تجميد 48 س" : `شدة ${item.cravingIntensity} من 10`}
                  </Txt>
                </Row>

                {isArchitect ? (
                  <View
                    style={{
                      backgroundColor: c.surface,
                      padding: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: c.line,
                      gap: 4,
                    }}
                  >
                    {item.realProblem ? (
                      <Txt variant="small">
                        <Txt variant="small" weight="bold">المشكلة: </Txt>
                        {item.realProblem}
                      </Txt>
                    ) : null}
                    {item.mechanism ? (
                      <Txt variant="small">
                        <Txt variant="small" weight="bold">الآلية: </Txt>
                        {item.mechanism}
                      </Txt>
                    ) : null}
                    {item.roiReason ? (
                      <Txt variant="small">
                        <Txt variant="small" weight="bold">الـ ROI: </Txt>
                        {item.roiReason}
                      </Txt>
                    ) : null}
                  </View>
                ) : null}

                <Row gap={6}>
                  <Feather name="clock" size={13} color={c.ink2} />
                  <Txt variant="small" color="ink2">
                    {remaining(item.unlocksAt, now)}
                  </Txt>
                </Row>

                <Row style={{ flexWrap: "wrap", gap: 6 }}>
                  <Button
                    title={isArchitect ? "إسقاط الفكرة (عدم جدوى)" : "تراجعت عنها"}
                    icon="check"
                    size="sm"
                    variant="ghost"
                    onPress={() => resolveVaultItem(item.id, isArchitect ? "إلغاء واعٍ لعدم الجدوى" : "تراجعت عنها بوعي")}
                  />
                  {!isArchitect && !item.surfingCompleted ? (
                    <Button title="تنفّس معها" icon="wind" size="sm" variant="quiet" onPress={() => openSurfingModal(item)} />
                  ) : null}
                  {isReady ? (
                    <Button
                      title={isArchitect ? "ما زالت مجدية — حوّلها لمهمة" : "ما زلت أريدها — حوّلها لمهمة"}
                      icon="inbox"
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        sendToInbox(item.impulseTitle);
                        resolveVaultItem(item.id, isArchitect ? "اعتُمدت بعد انقضاء الـ 48 ساعة" : "تحوّلت إلى مهمة مدروسة");
                      }}
                    />
                  ) : null}
                </Row>
              </View>
            );
          })
        )}
      </Card>

      {symbolismLogs.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <SectionHeader title="ما تعلّمته عن رغباتك" description="أنماط تتكرر؛ وعي بدل لوم." />
          {symbolismLogs.slice(0, 6).map((log, i) => (
            <View key={log.id} style={{ paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, gap: 4 }}>
              <Row style={{ flexWrap: "wrap" }}>
                <Txt>{log.escapeActivity}</Txt>
                <Badge tone="accent">{log.avoidedEmotion}</Badge>
              </Row>
              <Txt variant="ui" color="ink2">
                البديل: {log.correctiveStep}
              </Txt>
              <SendTo title={log.correctiveStep} label="اجعل البديل فعلاً:" />
            </View>
          ))}
        </Card>
      ) : null}

      <Sheet
        open={isSurfingModalOpen && Boolean(currentSurfingItem)}
        onClose={closeSurfingModal}
        title="تنفّس مع الموجة"
        description="الرغبة موجة: ترتفع لدقائق ثم تنكسر. لا تقاومها، راقبها فقط وأنت تتنفس."
      >
        {isSurfingModalOpen && currentSurfingItem ? (
          <WaveBreathing
            onDone={() => {
              markSurfingCompleted(currentSurfingItem.id);
              closeSurfingModal();
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

/** 4-4-6 breathing derived from elapsed time; mounted fresh each time the sheet opens. */
function WaveBreathing({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [scale] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((now - startedAt) / 1000);
  const cycles = Math.floor(elapsed / CYCLE);
  const inCycle = elapsed % CYCLE;
  const phase = inCycle < 4 ? PHASES[0] : inCycle < 8 ? PHASES[1] : PHASES[2];
  const phaseStart = phase.key === "in" ? 0 : phase.key === "hold" ? 4 : 8;
  const left = phase.seconds - (inCycle - phaseStart);

  const phaseKey = `${cycles}-${phase.key}`;
  useEffect(() => {
    const key = phaseKey.split("-")[1];
    Animated.timing(scale, {
      toValue: key === "out" ? 0.6 : 1,
      duration: key === "hold" ? 0 : key === "out" ? 6000 : 4000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phaseKey, scale]);

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: c.brandSoft, transform: [{ scale }] }} />
        <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="subtitle" weight="semibold" color="brandInk" align="center">
            {phase.label}
          </Txt>
          <Txt variant="display" weight="medium" color="brandInk" align="center">
            {left}
          </Txt>
        </View>
      </View>
      <Txt variant="ui" color="ink2" align="center">
        شهيق 4 · ثبات 4 · زفير 6، أكملت {cycles} {cycles === 1 ? "دورة" : "دورات"}
      </Txt>
      <Button title="هدأت الموجة" size="lg" onPress={onDone} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

/** Names the feeling the urge is trying to escape, and proposes the smallest corrective step. */
function Decoder({
  escapeActivity,
  faith,
  onDecoded,
  onCancel,
}: {
  escapeActivity: string;
  faith: boolean;
  onDecoded: (data: { avoidedEmotion: string; rootMeaning: string; correctiveStep: string }) => void;
  onCancel: () => void;
  }) {
  const c = useColors();
  const roots = [
    { id: "fear", label: "خوف من الفشل", meaning: "هروب من ألم المحاولة واحتمال التعثّر إلى نشاط سهل ومضمون.", corrective: "خمس دقائق فقط: سطر واحد أو مسألة واحدة، دون تقييم النتيجة." },
    { id: "perfectionism", label: "كمالية وتدقيق زائد", meaning: "تريد عملاً مثالياً من المحاولة الأولى، فتصبح البداية مخيفة.", corrective: "اسمح لنفسك بمسودة سيئة. العمل الناقص المنجز خير من الكامل المؤجل." },
    { id: "inertia", label: "ثِقل البداية", meaning: "المهمة تبدو جبلاً واحداً لا يمكن تفكيكه، فيرفض الدماغ الانطلاق.", corrective: "افتح الملف فقط، أو جهّز مكانك. أصغر حركة مادية ممكنة." },
    {
      id: "emptiness",
      label: "تعب أو فراغ داخلي",
      meaning: "طلب جرعة متعة سريعة لملء فراغ أو إرهاق تراكم خلال اليوم.",
      corrective: faith ? "توضّأ وصلِّ ركعتين، أو امشِ عشر دقائق مع كوب ماء بارد." : "امشِ عشر دقائق في الهواء الطلق، واشرب كوب ماء بارد.",
    },
  ];
  const [selected, setSelected] = useState(roots[0]);
  const [meaning, setMeaning] = useState(roots[0].meaning);
  const [step, setStep] = useState(roots[0].corrective);

  return (
    <View style={{ gap: 12 }}>
      <Txt variant="ui" color="ink2">
        الرغبة: <Txt variant="ui" weight="medium">«{escapeActivity}»</Txt>
      </Txt>
      <Txt variant="subtitle" weight="semibold">
        ما الشعور الذي تحاول الهروب منه؟
      </Txt>
      <Txt variant="ui" color="ink3">
        الاندفاع ليس عيباً أخلاقياً؛ إنه رسالة تطلب الأمان لا المتعة.
      </Txt>
      {roots.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => {
            setSelected(r);
            setMeaning(r.meaning);
            setStep(r.corrective);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: selected.id === r.id }}
          style={{ minHeight: 48, justifyContent: "center", borderRadius: radius.md, borderWidth: selected.id === r.id ? 2 : 1, borderColor: selected.id === r.id ? c.brand : c.line, paddingHorizontal: 14 }}
        >
          <Txt weight={selected.id === r.id ? "medium" : "regular"} color={selected.id === r.id ? "ink" : "ink2"}>
            {r.label}
          </Txt>
        </Pressable>
      ))}
      <View>
        <Label>ماذا يعني هذا؟</Label>
        <Input multiline value={meaning} onChangeText={setMeaning} />
      </View>
      <View>
        <Label>أصغر خطوة بديلة</Label>
        <Input value={step} onChangeText={setStep} />
      </View>
      <Row>
        <Button title="احفظ وأجّل الرغبة" onPress={() => onDecoded({ avoidedEmotion: selected.label, rootMeaning: meaning, correctiveStep: step })} />
        <Button title="رجوع" variant="ghost" onPress={onCancel} />
      </Row>
    </View>
  );
}
