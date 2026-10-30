import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { IconButton, Row, Screen, Txt } from "@/components/ui";
import { VisionScreen } from "@/components/vision/VisionMap";

const back = () => (router.canGoBack() ? router.back() : router.replace("/tools"));

export default function VisionRoute() {
  return (
    <Screen>
      <Row style={{ alignItems: "flex-start" }}>
        <IconButton icon="arrow-right" label="رجوع" color="ink2" onPress={back} />
        <View style={{ flex: 1 }}>
          <Txt variant="heading" weight="semibold">
            خريطة الرؤية
          </Txt>
          <Txt variant="ui" color="ink2">
            من قيمك إلى أولوية اليوم في صفحة واحدة. ترى كل خيط، وترى أين ينقطع.
          </Txt>
        </View>
      </Row>
      <VisionScreen />
    </Screen>
  );
}
