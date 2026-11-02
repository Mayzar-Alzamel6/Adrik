// Builds without personal sync (anything but EXPO_PUBLIC_PERSONAL_SYNC=1) get empty stand-ins for the sync
// screens, so the sync code, the PIN and the Supabase calls are left out of the app file entirely.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_PUBLIC_PERSONAL_SYNC !== "1") {
  const stubs = {
    "@/components/settings/SyncPanel": path.join(__dirname, "src/components/settings/SyncPanel.off.tsx"),
    // The coach's AI goes through the founder's sync sign-in, so it leaves with the sync code.
    "@/lib/ai/coachClient": path.join(__dirname, "src/lib/ai/coachClient.off.ts"),
  };
  config.resolver.resolveRequest = (context, moduleName, platform) =>
    stubs[moduleName]
      ? { type: "sourceFile", filePath: stubs[moduleName] }
      : context.resolveRequest(context, moduleName, platform);
}

module.exports = config;
