"use client";

import React from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTool, type ToolId } from "@/lib/tools";
import { useAppStore } from "@/stores/useAppStore";
import { CbtTriangleModal } from "@/components/cbt/CbtTriangleModal";
import { IdentityConstitution } from "@/components/identity/IdentityConstitution";
import { HorizonCalendar } from "@/components/calendar/HorizonCalendar";
import { TasksEisenhowerView } from "@/components/planner/TasksEisenhowerView";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { QalilDaimWidget } from "@/components/widgets/QalilDaimWidget";
import { DelayVaultModal } from "@/components/vault/DelayVaultModal";
import { MetaLearningView } from "@/components/meta-learning/MetaLearningView";
import { TawahhumAnchor } from "@/components/vision/TawahhumAnchor";
import { HabitTracker } from "@/components/habits/HabitTracker";
import { StageGate } from "@/components/journey/Journey";
import { useJourney } from "@/lib/journey";

export default function ToolPage() {
  const params = useParams<{ tool: string }>();
  const router = useRouter();
  const tool = getTool(params.tool);
  const { isToolOpen, stageOfTool } = useJourney();
  if (!tool) notFound();
  const lockedStage = isToolOpen(tool.id) ? undefined : stageOfTool(tool.id);

  const render = (id: ToolId) => {
    switch (id) {
      case "cbt":
        return <CbtTriangleModal />;
      case "identity":
        return <IdentityConstitution />;
      case "calendar":
        return <HorizonCalendar />;
      case "eisenhower":
        return <TasksEisenhowerView />;
      case "projects":
        return <ProjectsView />;
      case "compound":
        return <QalilDaimWidget />;
      case "habits":
        return <HabitTracker />;
      case "vault":
        return <DelayVaultModal />;
      case "meta":
        return <MetaLearningView />;
      case "tawahhum":
        return (
          <TawahhumAnchor
            onClose={() => router.push("/app/tools")}
            onStartFluencyTimer={(mode) => {
              // The session starts on the Today screen, where the user writes its commitment.
              useAppStore.getState().resetFocus(mode);
              router.push("/app");
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-6 animate-rise-in">
      <div>
        <Link href="/app/tools" className="inline-flex items-center gap-1 text-ui text-ink-2 hover:text-ink transition">
          <ChevronRight className="w-4 h-4" />
          الأدوات
        </Link>
        <h1 className="font-display text-heading-lg sm:text-display font-semibold text-ink mt-2">{tool.title}</h1>
        <p className="text-ink-2 mt-1 max-w-xl">{tool.description}</p>
      </div>
      {lockedStage ? <StageGate stage={lockedStage} what={tool.title} /> : render(tool.id)}
    </div>
  );
}
