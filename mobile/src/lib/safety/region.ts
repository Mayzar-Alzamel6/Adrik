import { getCalendars } from "expo-localization";
import type { HelplineZone } from "./helplines";

/**
 * Phone adapter of the safety kit (see README.md): the person's region for the helplines.
 * The web copies use the pricing page's logic; the phone has no pricing data, so this is the same
 * time-zone table as adrik-app's data/pricing.ts. Keep the two in step.
 */
const ZONE_BY_TIMEZONE: Record<string, HelplineZone> = {
  "Africa/Cairo": "eg",
  "Asia/Riyadh": "gulf",
  "Asia/Dubai": "gulf",
  "Asia/Kuwait": "gulf",
  "Asia/Qatar": "gulf",
  "Asia/Bahrain": "gulf",
  "Asia/Muscat": "gulf",
  "Asia/Amman": "mid",
  "Asia/Baghdad": "mid",
  "Asia/Beirut": "mid",
  "Asia/Damascus": "mid",
  "Asia/Gaza": "mid",
  "Asia/Hebron": "mid",
  "Asia/Aden": "mid",
  "Africa/Casablanca": "mid",
  "Africa/El_Aaiun": "mid",
  "Africa/Algiers": "mid",
  "Africa/Tunis": "mid",
  "Africa/Tripoli": "mid",
  "Africa/Khartoum": "mid",
  "Africa/Nouakchott": "mid",
};

export function currentZone(): HelplineZone {
  const tz = getCalendars()[0]?.timeZone ?? undefined;
  return (tz && ZONE_BY_TIMEZONE[tz]) || "global";
}
