"use client";

import React from "react";
import { Gift } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/** Occasional surprise reward after a completed focus session (intermittent reinforcement). */
export const VariableRewardModal: React.FC = () => {
  const randomRewardAvailable = useAppStore((s) => s.randomRewardAvailable);
  const lastRewardWon = useAppStore((s) => s.lastRewardWon);
  const claimRandomReward = useAppStore((s) => s.claimRandomReward);
  const dismissRandomReward = useAppStore((s) => s.dismissRandomReward);
  const open = randomRewardAvailable && Boolean(lastRewardWon);

  return (
    <Sheet open={open} onClose={dismissRandomReward} size="sm">
      <div className="text-center pt-2">
        <div className="w-14 h-14 rounded-full bg-accent-soft text-accent-strong mx-auto flex items-center justify-center animate-rise-in">
          <Gift className="w-6 h-6" strokeWidth={1.8} />
        </div>
        <h2 className="font-display text-title-lg font-semibold text-ink mt-5">مكافأة مفاجئة</h2>
        <p className="text-ink-2 mt-1">أتممت جلسة تركيز كاملة دون أن تستسلم للمشتتات. هذه لك:</p>
        <p className="mt-5 rounded-xl2 bg-accent-soft/70 px-5 py-4 font-display text-subtitle text-ink leading-relaxed">
          {lastRewardWon}
        </p>
        <p className="text-small text-ink-3 mt-4">خذها الآن براحة بال، بلا تأنيب ضمير.</p>
        <Button size="lg" className="w-full mt-6" onClick={claimRandomReward}>
          استمتع بها
        </Button>
      </div>
    </Sheet>
  );
};
