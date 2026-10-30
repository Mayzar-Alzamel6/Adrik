"use client";

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { playStart, unlockAudio } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const on = useAppStore((s) => s.settings.sound !== false);
  const setSound = useAppStore((s) => s.setSound);

  const toggle = () => {
    unlockAudio();
    setSound(!on);
    if (!on) playStart(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "كتم الأصوات" : "تشغيل الأصوات"}
      title={on ? "كتم الأصوات" : "تشغيل الأصوات"}
      className={cn(
        "w-9 h-9 inline-flex items-center justify-center rounded-full transition",
        on ? "text-ink-2 hover:text-ink hover:bg-surface-2" : "text-ink-3 hover:text-ink hover:bg-surface-2",
        className
      )}
    >
      {on ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
    </button>
  );
}
