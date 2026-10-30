import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
// Per-weight entry points: the package index requires all seven weights, and the bundler ships every one it sees.
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { useAppStore } from "@/stores/useAppStore";
import { useStoresHydrated } from "@/lib/stores";
import { useColors } from "@/theme";
import { AppRuntime } from "@/components/AppRuntime";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
  });
  const hydrated = useStoresHydrated();
  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;
  const c = useColors();
  const mode = useAppStore((s) => s.themeMode);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="tool/[id]" />
        <Stack.Screen name="vision" />
      </Stack>
      <AppRuntime />
    </SafeAreaProvider>
  );
}
