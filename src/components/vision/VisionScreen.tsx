"use client";

import React from "react";
import { useJourney } from "@/lib/journey";
import { StageGate } from "@/components/journey/Journey";
import { VisionMap } from "./VisionMap";

export function VisionScreen() {
  const { isFeatureOpen, stageOfFeature } = useJourney();
  const stage = stageOfFeature("vision");
  if (!isFeatureOpen("vision") && stage) return <StageGate stage={stage} what="خريطة الرؤية" />;
  return <VisionMap />;
}
