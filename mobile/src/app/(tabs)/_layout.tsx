import { Redirect, Tabs } from "expo-router";
import { I18nManager } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAppStore } from "@/stores/useAppStore";
import { fonts, useColors } from "@/theme";

export const unstable_settings = { initialRouteName: "index" };

type TabDef = { name: string; title: string; icon: React.ComponentProps<typeof Feather>["name"] };

// Right-to-left reading order: "Today" sits at the right edge.
const TABS: TabDef[] = [
  { name: "index", title: "اليوم", icon: "sun" },
  { name: "review", title: "المراجعة", icon: "calendar" },
  { name: "tools", title: "الأدوات", icon: "grid" },
  { name: "settings", title: "الإعدادات", icon: "settings" },
];

export default function TabsLayout() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const c = useColors();
  if (!onboardingDone) return <Redirect href="/onboarding" />;

  // Native RTL is off, so the tab bar lays out left-to-right; list the tabs reversed to read right-to-left.
  const ordered = I18nManager.isRTL ? TABS : [...TABS].reverse();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.ink3,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {ordered.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <Feather name={t.icon} color={color} size={size - 2} /> }}
        />
      ))}
    </Tabs>
  );
}
