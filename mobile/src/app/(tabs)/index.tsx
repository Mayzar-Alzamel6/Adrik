import React, { useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore, type DailyStation } from "@/stores/useAppStore";
import { dateLines, greeting } from "@/lib/utils";
import { radius, useColors } from "@/theme";
import { Row, Screen, Segmented, Txt } from "@/components/ui";
import { FocusCard } from "@/components/today/FocusCard";
import { PrioritiesCard } from "@/components/today/PrioritiesCard";
import { TuningCard } from "@/components/today/TuningCard";
import { TodayStats } from "@/components/today/TodayStats";
import { EveningClosure } from "@/components/today/EveningClosure";
import { RecoveryBanner } from "@/components/today/RecoveryBanner";
import { NeuroGate } from "@/components/today/NeuroGate";
import { ScratchpadSheet } from "@/components/today/ScratchpadSheet";
import { HabitsTodayCard } from "@/components/today/HabitsTodayCard";
import { JourneyCard } from "@/components/journey/Journey";

const readHeader = () => {
  const hour = new Date().getHours();
  return { ...dateLines(), hello: greeting(hour), hour };
};

export default function TodayScreen() {
  const currentStation = useAppStore((s) => s.currentStation);
  const setCurrentStation = useAppStore((s) => s.setCurrentStation);
  const name = useAppStore((s) => s.profile.name);
  const faith = useAppStore((s) => s.settings.faithContent);
  const eveningCommittedDate = useAppStore((s) => s.eveningCommittedDate);
  const currentDay = useAppStore((s) => s.currentDay);
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const frogs = useAppStore((s) => s.frogs);
  const neuroGateDone = useAppStore(
    (s) => s.neuroGateDate === s.currentDay && (s.neuroGatePassed || s.neuroGateSkipped)
  );
  const [scratchOpen, setScratchOpen] = useState(false);
  const c = useColors();

  // An app left open all day must not keep saying "good morning" at night.
  const [header, setHeader] = useState(readHeader);
  useEffect(() => {
    const refresh = () => setHeader(readHeader());
    const id = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener("change", (state) => state === "active" && refresh());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  // Auto-route to EVENING_CLOSURE after 20:00 if all frogs done and not yet committed today
  useEffect(() => {
    const allFrogsDone = frogs.length > 0 && frogs.every((f) => f.isCompleted);
    if (
      header.hour >= 20 &&
      allFrogsDone &&
      eveningCommittedDate !== currentDay &&
      currentStation !== "EVENING_CLOSURE" &&
      !isFocusRunning
    ) {
      setCurrentStation("EVENING_CLOSURE");
    }
  }, [header.hour, frogs, eveningCommittedDate, currentDay, currentStation, isFocusRunning, setCurrentStation]);

  const eveningDue =
    header.hour >= 18 &&
    currentStation !== "EVENING_CLOSURE" &&
    eveningCommittedDate !== currentDay;

  return (
    <Screen>
      <View>
        <Txt variant="ui" color="ink3">
          {header.greg}
          {faith && header.hijri ? ` · ${header.hijri}` : ""}
        </Txt>
        <Txt variant="heading" weight="semibold">
          {header.hello}
          {name ? `، ${name}` : ""}
        </Txt>
      </View>

      {!isFocusRunning && (
        <Segmented<DailyStation>
          value={currentStation}
          onChange={(val) => setCurrentStation(val)}
          options={[
            { value: "NEURO_GATE", label: neuroGateDone ? "الصباح ✓" : "الصباح", icon: "sunrise" },
            { value: "DAY_FOCUS", label: "التركيز", icon: "sun" },
            { value: "EVENING_CLOSURE", label: eveningCommittedDate === currentDay ? "المساء ✓" : "المساء", icon: "moon" },
          ]}
        />
      )}

      {!isFocusRunning && <RecoveryBanner />}

      {!isFocusRunning && eveningDue ? (
        <Pressable
          onPress={() => setCurrentStation("EVENING_CLOSURE")}
          accessibilityRole="button"
          style={({ pressed }) => ({
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.accent,
            backgroundColor: c.accentSoft,
            paddingHorizontal: 14,
            paddingVertical: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Row gap={12}>
            <Feather name="moon" size={20} color={c.accentStrong} />
            <View style={{ flex: 1 }}>
              <Txt weight="medium">حان وقت إغلاق اليوم</Txt>
              <Txt variant="small" color="ink2">
                3 دقائق: عادات اليوم، وصوت لهويتك، وأولويات الغد.
              </Txt>
            </View>
            <Feather name="arrow-left" size={16} color={c.accentStrong} />
          </Row>
        </Pressable>
      ) : null}

      {currentStation === "EVENING_CLOSURE" ? (
        <EveningClosure />
      ) : isFocusRunning ? (
        <FocusCard onOpenScratchpad={() => setScratchOpen(true)} />
      ) : (
        <>
          <FocusCard onOpenScratchpad={() => setScratchOpen(true)} />
          <TuningCard />
          <PrioritiesCard />
          <JourneyCard />
          <HabitsTodayCard />
          <TodayStats />
        </>
      )}

      <NeuroGate />
      <ScratchpadSheet open={scratchOpen} onClose={() => setScratchOpen(false)} />
    </Screen>
  );
}
