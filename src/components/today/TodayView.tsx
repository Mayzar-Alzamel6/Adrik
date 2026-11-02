"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Moon, Sun, SunMedium } from "lucide-react";
import { useAppStore, type DailyStation } from "@/stores/useAppStore";
import { useShallow } from "zustand/react/shallow";
import { SegmentedControl } from "@/components/ui/primitives";
import { RecoveryFlywheel } from "@/components/recovery/RecoveryFlywheel";
import { EveningClosure } from "@/components/stations/EveningClosure";
import { FocusCard } from "./FocusCard";
import { PrioritiesCard } from "./PrioritiesCard";
import { TodaySidebar } from "./TodaySidebar";

function greeting(hour: number) {
  if (hour < 5) return "ليلة هادئة";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك سعيد";
  return "مساء الخير";
}

function dateLines() {
  const now = new Date();
  const greg = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(now);
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(now);
  } catch {
    /* calendar not supported */
  }
  return { greg, hijri };
}

export function TodayView() {
  const {
    currentStation,
    setCurrentStation,
    profileName,
    faithContent,
    eveningCommittedDate,
    currentDay,
    frogs,
    neuroGateDone,
    isFocusRunning,
  } = useAppStore(
    useShallow((s) => ({
      currentStation: s.currentStation,
      setCurrentStation: s.setCurrentStation,
      profileName: s.profile.name,
      faithContent: s.settings.faithContent,
      eveningCommittedDate: s.eveningCommittedDate,
      currentDay: s.currentDay,
      frogs: s.frogs,
      neuroGateDone: s.neuroGateDate === s.currentDay && (s.neuroGatePassed || s.neuroGateSkipped),
      isFocusRunning: s.isFocusRunning,
    }))
  );
  const [header, setHeader] = useState({ hello: "", greg: "", hijri: "", hour: 12 });

  // Handle URL query param ?station=INTJ_PROTOCOL smoothly redirecting to DAY_FOCUS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("station") === "INTJ_PROTOCOL") {
        setCurrentStation("DAY_FOCUS");
      }
    }
  }, [setCurrentStation]);

  // An app left open all day must not keep saying "good morning" at night.
  useEffect(() => {
    const refresh = () => {
      const { greg, hijri } = dateLines();
      const hour = new Date().getHours();
      setHeader({ hello: greeting(hour), greg, hijri, hour });
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
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

  const eveningDue = header.hour >= 18 && currentStation !== "EVENING_CLOSURE" && eveningCommittedDate !== currentDay;

  const activeStation: DailyStation =
    currentStation === "EVENING_CLOSURE"
      ? "EVENING_CLOSURE"
      : currentStation === "NEURO_GATE"
      ? "NEURO_GATE"
      : "DAY_FOCUS";

  return (
    <div className="space-y-6 animate-rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ui text-ink-3 min-h-[1.5em]">
            {header.greg}
            {faithContent && header.hijri ? ` · ${header.hijri}` : ""}
          </p>
          <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink mt-0.5">
            {header.hello}
            {profileName ? `، ${profileName}` : ""}
          </h1>
        </div>

        {!isFocusRunning && (
          <SegmentedControl<DailyStation>
            ariaLabel="محطات اليوم"
            value={activeStation}
            onChange={(v) => setCurrentStation(v)}
            options={[
              {
                value: "NEURO_GATE",
                label: (
                  <>
                    <SunMedium className="w-4 h-4" strokeWidth={1.8} />
                    تهيئة الصباح {neuroGateDone ? "✓" : ""}
                  </>
                ),
              },
              {
                value: "DAY_FOCUS",
                label: (
                  <>
                    <Sun className="w-4 h-4" strokeWidth={1.8} />
                    التركيز المنضبط
                  </>
                ),
              },
              {
                value: "EVENING_CLOSURE",
                label: (
                  <>
                    <Moon className="w-4 h-4" strokeWidth={1.8} />
                    المساء {eveningCommittedDate === currentDay ? "✓" : ""}
                  </>
                ),
              },
            ]}
          />
        )}
      </header>

      {!isFocusRunning && <RecoveryFlywheel />}

      {!isFocusRunning && eveningDue && (
        <button
          type="button"
          onClick={() => setCurrentStation("EVENING_CLOSURE")}
          className="w-full flex items-center gap-3 rounded-xl2 border border-accent/30 bg-accent-soft/60 px-4 py-3 text-right hover:border-accent transition"
        >
          <Moon className="w-5 h-5 text-accent-strong shrink-0" strokeWidth={1.8} />
          <span className="flex-1 min-w-0">
            <span className="block text-body font-medium text-ink">حان وقت إغلاق اليوم</span>
            <span className="block text-small text-ink-2">3 دقائق: عادات اليوم، وصوت لهويتك، وأولويات الغد.</span>
          </span>
          <ArrowLeft className="w-4 h-4 text-accent-strong shrink-0" />
        </button>
      )}

      {activeStation === "EVENING_CLOSURE" ? (
        <EveningClosure />
      ) : isFocusRunning ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <FocusCard />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          <div className="space-y-6 min-w-0">
            <FocusCard />
            <PrioritiesCard />
          </div>
          <TodaySidebar />
        </div>
      )}
    </div>
  );
}
