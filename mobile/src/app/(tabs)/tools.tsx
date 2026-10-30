import React from "react";
import { Pressable, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useColors, type ColorName } from "@/theme";
import { TOOL_GROUPS } from "@/lib/tools";
import { useJourney } from "@/lib/journey";
import { Card, Row, Screen, Txt, type IconName } from "@/components/ui";

export default function ToolsScreen() {
  const { isToolOpen, stageOfTool, isFeatureOpen, stageOfFeature } = useJourney();
  return (
    <Screen>
      <View>
        <Txt variant="heading" weight="semibold">
          الأدوات
        </Txt>
        <Txt variant="ui" color="ink2">
          أدوات منهجية لكل لحظة في يومك. استخدم ما تحتاجه فقط، حين تحتاجه.
        </Txt>
      </View>

      <ToolCard
        icon="map"
        title="خريطة الرؤية"
        description="من قيمك إلى أولوية اليوم في صفحة واحدة. ترى كل خيط، وترى أين ينقطع."
        open={isFeatureOpen("vision")}
        stage={stageOfFeature("vision")?.title}
        onPress={() => router.push("/vision")}
      />

      {TOOL_GROUPS.map((g) => (
        <View key={g.title} style={{ gap: 10 }}>
          <View>
            <Txt variant="subtitle" weight="semibold">
              {g.title}
            </Txt>
            <Txt variant="small" color="ink2">
              {g.description}
            </Txt>
          </View>
          {g.tools.map((t) => (
            <ToolCard
              key={t.id}
              icon={t.icon}
              title={t.title}
              description={t.description}
              open={isToolOpen(t.id)}
              stage={stageOfTool(t.id)?.title}
              onPress={() => router.push({ pathname: "/tool/[id]", params: { id: t.id } })}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

/** A tool whose stage hasn't opened yet still opens, onto its stage gate. */
function ToolCard({
  icon,
  title,
  description,
  open,
  stage,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  open: boolean;
  stage?: string;
  onPress: () => void;
}) {
  const c = useColors();
  const ink: ColorName = open ? "ink" : "ink2";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card style={{ padding: 14, backgroundColor: open ? c.surface : c.surface2, shadowOpacity: open ? 0.05 : 0, elevation: open ? 1 : 0 }}>
        <Row gap={12}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: open ? c.brandSoft : c.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name={open ? icon : "lock"} size={18} color={open ? c.brand : c.ink3} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="medium" color={ink}>
              {title}
            </Txt>
            <Txt variant="small" color="ink2">
              {description}
            </Txt>
            {!open && stage ? (
              <Txt variant="caption" color="ink3">
                مرحلة «{stage}»
              </Txt>
            ) : null}
          </View>
          <Feather name="chevron-left" size={18} color={c.ink3} />
        </Row>
      </Card>
    </Pressable>
  );
}
