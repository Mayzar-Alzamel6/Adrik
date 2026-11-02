import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Hands a JSON file to the phone's share sheet (WhatsApp, email, Drive…).
 * On the web preview it downloads the file instead.
 */
export async function shareJsonFile(name: string, data: unknown, dialogTitle: string): Promise<"shared" | "downloaded"> {
  const json = JSON.stringify(data, null, 2);

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return "downloaded";
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle });
  return "shared";
}
