import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { findTool, type ToolId } from "@/lib/tools";
import { Button, IconButton, Row, Screen, Txt } from "@/components/ui";
import { EisenhowerTool } from "@/components/tools/EisenhowerTool";
import { ProjectsTool } from "@/components/tools/ProjectsTool";
import { CalendarTool } from "@/components/tools/CalendarTool";
import { CompoundTool } from "@/components/tools/CompoundTool";
import { CbtTool } from "@/components/tools/CbtTool";
import { VaultTool } from "@/components/tools/VaultTool";
import { IdentityTool } from "@/components/tools/IdentityTool";
import { SkillsTool } from "@/components/tools/SkillsTool";
import { VisionTool } from "@/components/tools/VisionTool";
import { HabitsTool } from "@/components/tools/HabitsTool";
import { StageGate } from "@/components/journey/Journey";
import { useJourney } from "@/lib/journey";

const TOOLS: Record<ToolId, () => React.JSX.Element> = {
  eisenhower: EisenhowerTool,
  projects: ProjectsTool,
  calendar: CalendarTool,
  compound: CompoundTool,
  cbt: CbtTool,
  vault: VaultTool,
  identity: IdentityTool,
  meta: SkillsTool,
  tawahhum: VisionTool,
  habits: HabitsTool,
};

const back = () => (router.canGoBack() ? router.back() : router.replace("/tools"));

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = findTool(id);
  const { isToolOpen, stageOfTool } = useJourney();

  if (!tool) {
    return (
      <Screen>
        <Txt variant="title" weight="semibold">
          الأداة غير موجودة
        </Txt>
        <Button title="العودة إلى الأدوات" onPress={back} />
      </Screen>
    );
  }

  const Tool = TOOLS[tool.id];
  return (
    <Screen>
      <Row style={{ alignItems: "flex-start" }}>
        <IconButton icon="arrow-right" label="رجوع" color="ink2" onPress={back} />
        <View style={{ flex: 1 }}>
          <Txt variant="heading" weight="semibold">
            {tool.title}
          </Txt>
          <Txt variant="ui" color="ink2">
            {tool.description}
          </Txt>
        </View>
      </Row>
      {isToolOpen(tool.id) || !stageOfTool(tool.id) ? (
        // Keyed so switching tools never carries state across.
        <Tool key={tool.id} />
      ) : (
        <StageGate stage={stageOfTool(tool.id)!} what={tool.title} />
      )}
    </Screen>
  );
}
