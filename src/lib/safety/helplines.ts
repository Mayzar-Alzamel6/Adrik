/**
 * Support lines shown on the crisis screen, by region.
 * Part of the portable safety kit (see README.md): copy verbatim, no imports, no platform APIs.
 *
 * Regions are the pricing zones (same ids as ZoneId in data/pricing.ts); each platform decides the zone
 * itself (web: lib/safety/region.ts, the pricing page's logic).
 *
 * Numbers are left empty on purpose: none may be written here without checking an official source.
 * A line with an empty number is hidden, and the screen then shows only the emergency advice.
 */

export type HelplineZone = "eg" | "gulf" | "mid" | "global";

export interface Helpline {
  /** Who answers, e.g. the name of the national mental-health line. */
  name: string;
  /** Country or area it serves, shown under the name. */
  area: string;
  /** Digits as dialled. Empty until verified. */
  number: string;
  note?: string;
}

export const HELPLINES: Record<HelplineZone, Helpline[]> = {
  eg: [
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "مصر", number: "" },
  ],
  gulf: [
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "السعودية", number: "" },
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "الإمارات", number: "" },
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "الكويت", number: "" },
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "قطر", number: "" },
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "البحرين", number: "" },
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط الدعم النفسي", area: "عُمان", number: "" },
  ],
  // Other Arab countries: add a line per country here; until then they get the general list.
  mid: [],
  global: [
    // TODO: تحقق من الرقم من مصدر رسمي
    { name: "خط دعم دولي", area: "عام", number: "" },
  ],
};

const verified = (lines: Helpline[]) => lines.filter((h) => h.number.trim());

/** Verified lines for the zone; a zone with none borrows the general list. May be empty. */
export function helplinesFor(zone: HelplineZone): Helpline[] {
  const own = verified(HELPLINES[zone] ?? []);
  return own.length ? own : verified(HELPLINES.global);
}
