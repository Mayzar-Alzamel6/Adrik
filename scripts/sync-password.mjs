// Chooses (or replaces) the Wi-Fi sync password. Runs only on this computer, never over the network.
// Usage, from the app folder: npm run sync-password
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const { setLanPassword, MIN_PASSWORD } = await import("../src/lib/sync/lanServer.ts");

const rl = createInterface({ input: stdin, output: stdout });
const lines = rl[Symbol.asyncIterator]();
const ask = async (q) => {
  stdout.write(q);
  const { value } = await lines.next();
  return (value ?? "").trim();
};
const password = await ask(`كلمة المزامنة الجديدة (${MIN_PASSWORD} أحرف على الأقل): `);
const again = await ask("أعدها للتأكيد: ");
rl.close();

if (password !== again) {
  console.error("الكلمتان غير متطابقتين. لم يتغير شيء.");
  process.exit(1);
}
const res = setLanPassword(password);
if (!res.ok) {
  console.error(res.error);
  process.exit(1);
}
console.log("تم. اكتب الكلمة نفسها في الكمبيوتر والهاتف عند «ربط وبدء المزامنة».");
