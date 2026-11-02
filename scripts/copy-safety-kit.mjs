// Copies the portable safety kit (lib/safety + its tests) from this project into another copy of the app.
//
//   node scripts/copy-safety-kit.mjs ../adrik-app            copy (overwrites the kit files there)
//   node scripts/copy-safety-kit.mjs ../adrik-mobile --check  only report which kit files differ
//
// Platform adapters (aiConsent.ts, region.ts) and the screens are not copied: see src/lib/safety/README.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = [
  "src/lib/safety/README.md",
  "src/lib/safety/crisis-detector.ts",
  "src/lib/safety/analysis.ts",
  "src/lib/safety/helplines.ts",
  "src/lib/safety/texts.ts",
  "tests/ts-resolve.mjs",
  "tests/crisis-detector.test.mjs",
  "tests/safety-kit.test.mjs",
];

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [target, flag] = process.argv.slice(2);
if (!target || !existsSync(join(resolve(target), "package.json"))) {
  console.error("Usage: node scripts/copy-safety-kit.mjs <path-to-other-project> [--check]");
  process.exit(1);
}
const there = resolve(target);
const check = flag === "--check";

const same = (a, b) => existsSync(b) && readFileSync(a).equals(readFileSync(b));
let differs = 0;
for (const file of KIT) {
  const from = join(here, file);
  const to = join(there, file);
  if (same(from, to)) continue;
  differs++;
  if (check) {
    console.log(`${existsSync(to) ? "differs" : "missing"}  ${file}`);
  } else {
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
    console.log(`copied   ${file}`);
  }
}
console.log(differs ? `${differs} kit file(s) ${check ? "out of date" : "copied"}.` : "Kit is identical.");
if (check && differs) process.exit(1);
