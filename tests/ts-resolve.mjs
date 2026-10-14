// Lets `node --test` load the safety kit as written for the bundlers: `./crisis-detector` → `./crisis-detector.ts`.
// Node strips the TypeScript types itself (Node 22.18+ / 23.6+), so no extra dependency is needed.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    let target = specifier;
    if (target.startsWith("@/")) {
      target = new URL(`../src/${target.slice(2)}`, import.meta.url).href;
    }
    try {
      return next(target, context);
    } catch (err) {
      if ((target.startsWith(".") || target.startsWith("file:")) && !/\.[cm]?[jt]sx?$/.test(target)) {
        try {
          return next(`${target}.ts`, context);
        } catch {
          return next(`${target}.tsx`, context);
        }
      }
      throw err;
    }
  },
});
