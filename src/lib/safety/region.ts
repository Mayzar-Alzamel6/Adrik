import { DEFAULT_ZONE, PRICE_ZONES, zoneFromTimeZone } from "@/data/pricing";
import type { HelplineZone } from "./helplines";

/**
 * Web adapter of the safety kit (see README.md): the person's region, by the pricing page's logic
 * (their saved choice there, else the browser time zone). Client-only.
 */
const ZONE_KEY = "adrik-pricing-zone"; // same key PricingSection saves under

export function currentZone(): HelplineZone {
  if (typeof window === "undefined") return DEFAULT_ZONE;
  try {
    const saved = window.localStorage.getItem(ZONE_KEY);
    if (PRICE_ZONES.some((z) => z.id === saved)) return saved as HelplineZone;
  } catch {
    /* storage blocked: fall back to the time zone */
  }
  return zoneFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}
