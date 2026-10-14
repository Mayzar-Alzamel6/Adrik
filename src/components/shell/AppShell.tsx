"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, LayoutGrid, Map as MapIcon, Moon, NotebookPen, Settings2, Sun, SunMedium } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { playEnd, playStart, unlockAudio } from "@/lib/sounds";
import { Logo } from "./Logo";
import { useHydrated, useThemeClass } from "./useHydrated";
import { NeuroGateModal } from "@/components/stations/NeuroGateModal";
import { VariableRewardModal } from "@/components/rewards/VariableRewardModal";
import { SessionReviewSheet } from "@/components/today/SessionReviewSheet";
import { DistractionScratchpad } from "@/components/focus/DistractionScratchpad";
import { JourneyWatcher } from "@/components/journey/Journey";
import { SyncWatcher } from "@/components/settings/SyncPanel";

const NAV = [
  { href: "/app", label: "اليوم", icon: SunMedium, exact: true },
  { href: "/app/review", label: "المراجعة", icon: CalendarRange },
  { href: "/app/vision", label: "الرؤية", icon: MapIcon },
  { href: "/app/tools", label: "الأدوات", icon: LayoutGrid },
  { href: "/app/settings", label: "الإعدادات", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  useThemeClass();
  const router = useRouter();
  const pathname = usePathname();
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const themeMode = useAppStore((s) => s.themeMode);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const profileName = useAppStore((s) => s.profile.name);
  const isFocusRunning = useAppStore((s) => s.isFocusRunning);
  const tickFocus = useAppStore((s) => s.tickFocus);
  const rolloverIfNewDay = useAppStore((s) => s.rolloverIfNewDay);
  const [scratchOpen, setScratchOpen] = useState(false);

  // First-run gate
  useEffect(() => {
    if (hydrated && !onboardingDone) router.replace("/onboarding");
  }, [hydrated, onboardingDone, router]);

  // Daily rollover on mount / refocus
  useEffect(() => {
    if (!hydrated) return;
    rolloverIfNewDay();
    const onVisible = () => document.visibilityState === "visible" && rolloverIfNewDay();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", rolloverIfNewDay);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", rolloverIfNewDay);
    };
  }, [hydrated, rolloverIfNewDay]);

  // Focus timer keeps ticking on every app page
  useEffect(() => {
    if (!isFocusRunning) return;
    tickFocus();
    const id = setInterval(tickFocus, 1000);
    const onVisible = () => document.visibilityState === "visible" && tickFocus();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isFocusRunning, tickFocus]);

  // Audio may only start after a user gesture: unlock it on the first interaction.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Session start / completion sounds, on whichever page the user is on.
  // Refs start from the hydrated values so reloading mid-session or with a pending review stays silent.
  const pendingReviewId = useAppStore((s) => s.pendingSessionReviewId);
  const soundOn = useAppStore((s) => s.settings.sound !== false);
  const prevRunning = useRef<boolean | null>(null);
  const prevPending = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!hydrated) return;
    if (prevRunning.current === false && isFocusRunning) playStart(soundOn);
    prevRunning.current = isFocusRunning;
  }, [hydrated, isFocusRunning, soundOn]);
  useEffect(() => {
    if (!hydrated) return;
    if (prevPending.current === null && pendingReviewId) playEnd(soundOn);
    prevPending.current = pendingReviewId;
  }, [hydrated, pendingReviewId, soundOn]);

  // Break countdown: wall-clock based like the focus timer, with the bell when it ends.
  const breakEndsAt = useAppStore((s) => s.breakEndsAt);
  useEffect(() => {
    if (!hydrated || !breakEndsAt) return;
    const check = () => {
      if (Date.now() < breakEndsAt) return;
      useAppStore.getState().endBreak();
      playEnd(useAppStore.getState().settings.sound !== false);
    };
    check();
    const id = setInterval(check, 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [hydrated, breakEndsAt]);

  // Ctrl/⌘+K or custom event → quick capture
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setScratchOpen((v) => !v);
      }
    };
    const onOpen = () => setScratchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-scratchpad", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-scratchpad", onOpen);
    };
  }, []);

  if (!hydrated || !onboardingDone) {
    return <div className="min-h-screen bg-bg" />;
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Desktop sidebar (sits on the right in RTL, dimmed during hyper-focus) */}
      <aside
        className={cn(
          "hidden lg:flex w-[248px] shrink-0 flex-col sticky top-0 h-screen border-l border-line bg-surface/50 px-4 py-6 transition-opacity duration-300",
          isFocusRunning && "opacity-30 hover:opacity-100"
        )}
      >
        <Link href="/app" className="px-2 mb-8">
          <Logo />
        </Link>

        <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 h-11 px-3 rounded-xl text-body transition",
                  active
                    ? "bg-surface text-ink font-semibold shadow-soft border border-line"
                    : "text-ink-2 hover:text-ink hover:bg-surface-2"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-brand" : "text-ink-3")} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setScratchOpen(true)}
          className="mt-6 flex items-center gap-3 h-11 px-3 rounded-xl text-ui text-ink-2 border border-dashed border-line hover:border-ink-3 hover:text-ink transition"
        >
          <NotebookPen className="w-[18px] h-[18px] text-ink-3" strokeWidth={1.8} />
          <span className="flex-1 text-right">تفريغ خاطرة</span>
          <kbd className="text-micro text-ink-3 font-sans" dir="ltr">
            Ctrl K
          </kbd>
        </button>

        <div className="mt-auto flex items-center justify-between gap-2 px-2 pt-4 border-t border-line">
          <div className="min-w-0">
            <p className="text-ui font-medium text-ink truncate">{profileName || "حسابي"}</p>
            <p className="text-caption text-ink-3">نسختي الشخصية</p>
          </div>
          <ThemeButton isDark={themeMode === "dark"} onClick={toggleTheme} />
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-bg/90 backdrop-blur border-b border-line">
          <Link href="/app" aria-label="أدرك عمرك">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScratchOpen(true)}
              aria-label="تفريغ خاطرة"
              className="w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <NotebookPen className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <ThemeButton isDark={themeMode === "dark"} onClick={toggleTheme} />
          </div>
        </header>

        <main className="max-w-[1080px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-28 lg:pb-12">{children}</main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="التنقل الرئيسي"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-16 text-caption transition",
                active ? "text-brand font-semibold" : "text-ink-3"
              )}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.1 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <JourneyWatcher />
      <SyncWatcher />
      <NeuroGateModal />
      <SessionReviewSheet />
      <VariableRewardModal />
      <DistractionScratchpad isOpen={scratchOpen} onClose={() => setScratchOpen(false)} />
    </div>
  );
}

function ThemeButton({ isDark, onClick }: { isDark: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      className="w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-surface-2 transition"
    >
      {isDark ? <Sun className="w-5 h-5" strokeWidth={1.8} /> : <Moon className="w-5 h-5" strokeWidth={1.8} />}
    </button>
  );
}
