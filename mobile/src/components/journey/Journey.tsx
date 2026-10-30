import React, { useEffect } from "react";
import { View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useAppStore } from "@/stores/useAppStore";
import { useJourneyStore } from "@/stores/useJourneyStore";
import { useJourney, type StageStatus } from "@/lib/journey";
import { findTool } from "@/lib/tools";
import { ROW, radius, useColors } from "@/theme";
import { Button, Card, LinkButton, Row, Sheet, Txt, type IconName } from "@/components/ui";

/**
 * Mounted once: settles the mode for people who used the app before stages existed,
 * opens stages in order as their conditions are met, and announces each newly opened stage once.
 * Mirrors the web app's JourneyWatcher (the phone has no founder template).
 */
export function JourneyWatcher() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const { mode, stages } = useJourney();
  const announced = useJourneyStore((s) => s.announced);
  const { setMode, unlock, markAnnounced } = useJourneyStore.getState();

  useEffect(() => {
    if (onboardingDone && mode === null) setMode("open");
  }, [onboardingDone, mode, setMode]);

  useEffect(() => {
    if (mode !== "guided") return;
    // In order only: a stage never opens before the one it builds on.
    for (let i = 1; i < stages.length; i++) {
      const s = stages[i];
      if (s.unlocked) continue;
      if (stages[i - 1].unlocked && s.ready) unlock(s.id);
      break;
    }
  }, [mode, stages, unlock]);

  const toAnnounce = mode === "guided" ? stages.find((s) => s.unlocked && !announced.includes(s.id)) : undefined;

  return (
    <Sheet
      open={Boolean(toAnnounce)}
      onClose={() => toAnnounce && markAnnounced(toAnnounce.id)}
      title={toAnnounce ? `فُتحت مرحلة «${toAnnounce.title}»` : undefined}
      description="بنيت الأساس الذي تحتاجه هذه المرحلة. خذ منها ما ينفعك الآن، والباقي ينتظرك."
    >
      {toAnnounce ? <StageUnlocked stage={toAnnounce} onDone={() => markAnnounced(toAnnounce.id)} /> : null}
    </Sheet>
  );
}

/** Where a stage's first screen lives on the phone. */
const stageHref = (stage: StageStatus) => stage.features[0]?.href ?? (stage.tools[0] ? `/tool/${stage.tools[0]}` : "/");

function IconTile({ icon, tone }: { icon: IconName; tone: "accent" | "neutral" }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: tone === "accent" ? c.accentSoft : c.surface2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={icon} size={18} color={tone === "accent" ? c.accentStrong : c.ink2} />
    </View>
  );
}

function StageUnlocked({ stage, onDone }: { stage: StageStatus; onDone: () => void }) {
  const c = useColors();
  const labels = [...stage.features.map((f) => f.label), ...stage.tools.map((t) => findTool(t)?.title ?? t)];
  return (
    <View style={{ gap: 14 }}>
      <Row gap={12} style={{ alignItems: "flex-start", borderRadius: radius.lg, backgroundColor: c.accentSoft, padding: 14 }}>
        <IconTile icon={stage.icon} tone="accent" />
        <Txt style={{ flex: 1 }}>{stage.promise}</Txt>
      </Row>
      {labels.map((label) => (
        <Row key={label} gap={8}>
          <Feather name="star" size={14} color={c.accentStrong} />
          <Txt variant="ui">{label}</Txt>
        </Row>
      ))}
      <Row>
        <Button
          title="افتحها الآن"
          onPress={() => {
            onDone();
            router.push(stageHref(stage) as never);
          }}
        />
        <Button title="لاحقاً" variant="ghost" onPress={onDone} />
      </Row>
    </View>
  );
}

/** Opening a stage by hand needs no announcement: the user already knows. */
function openNow(id: StageStatus["id"]) {
  const { unlock, markAnnounced } = useJourneyStore.getState();
  markAnnounced(id);
  unlock(id);
}

function CriteriaList({ stage }: { stage: StageStatus }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {stage.criteria.map((cr) => (
        <Row key={cr.label} gap={10}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: cr.met ? c.brand : "transparent",
              borderWidth: cr.met ? 0 : 1,
              borderColor: c.lineStrong,
            }}
          >
            {cr.met ? <Feather name="check" size={12} color={c.brandInk} /> : null}
          </View>
          <Txt variant="ui" color={cr.met ? "ink3" : "ink"} style={[{ flex: 1 }, cr.met ? { textDecorationLine: "line-through" } : null]}>
            {cr.label}
          </Txt>
          <Txt variant="caption" color="ink3">
            {cr.current} / {cr.target}
          </Txt>
        </Row>
      ))}
    </View>
  );
}

/** Today card: where the user is in the journey and what opens next. Hidden once everything is open. */
export function JourneyCard() {
  const c = useColors();
  const { guided, stages, next } = useJourney();
  if (!guided || !next) return null;
  const doneCount = stages.filter((s) => s.unlocked).length;

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="small" color="ink3">
          رحلة البناء
        </Txt>
        <Txt variant="caption" color="ink3">
          {doneCount} من {stages.length}
        </Txt>
      </Row>
      <View style={{ flexDirection: ROW, gap: 4 }}>
        {stages.map((s) => (
          <View key={s.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: s.unlocked ? c.brand : s.id === next.id ? c.accent : c.line, opacity: s.id === next.id && !s.unlocked ? 0.6 : 1 }} />
        ))}
      </View>
      <Row gap={12} style={{ alignItems: "flex-start" }}>
        <IconTile icon={next.icon} tone="accent" />
        <View style={{ flex: 1 }}>
          <Txt weight="medium">التالي: {next.title}</Txt>
          <Txt variant="small" color="ink2">
            {next.promise}
          </Txt>
        </View>
      </Row>
      <CriteriaList stage={next} />
      <View style={{ alignItems: "flex-end" }}>
        <LinkButton title="لا أريد الانتظار، افتحها الآن" color="ink3" onPress={() => openNow(next.id)} />
      </View>
    </Card>
  );
}

/** Shown in place of a tool or screen whose stage hasn't opened yet. Never a wall: one tap opens it. */
export function StageGate({ stage, what }: { stage: StageStatus; what: string }) {
  const c = useColors();
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12}>
        <IconTile icon="lock" tone="neutral" />
        <View style={{ flex: 1 }}>
          <Txt variant="caption" weight="medium" color="accentStrong">
            مرحلة «{stage.title}»
          </Txt>
          <Txt variant="subtitle" weight="semibold">
            {what} تنتظرك
          </Txt>
        </View>
      </Row>
      <Txt color="ink2">نبني النظام طبقة بعد طبقة حتى لا يثقل عليك. {stage.promise}</Txt>
      <Txt variant="small" color="ink3">
        هذا ليس قفل اشتراك: المرحلة تُفتح باستعمالك للتطبيق، أو الآن بزر واحد.
      </Txt>
      {stage.criteria.length > 0 ? (
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="ui" weight="medium">
              تُفتح تلقائياً حين تُكمل:
            </Txt>
            <Txt variant="caption" color="ink3">
              {stage.progress}%
            </Txt>
          </Row>
          <CriteriaList stage={stage} />
        </View>
      ) : null}
      <Row style={{ flexWrap: "wrap" }}>
        <Button title="افتحها الآن على أي حال" variant="secondary" size="sm" onPress={() => openNow(stage.id)} />
        <LinkButton title="عُد إلى يومك" icon="chevron-left" onPress={() => router.navigate("/")} />
      </Row>
    </Card>
  );
}
