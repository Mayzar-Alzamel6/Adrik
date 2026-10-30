/**
 * Launch prices, approved by the founder on 2026-09-29.
 * Reasoning and the full plan live in research/pricing-plan-2026-09.md.
 * Prices are set per purchasing-power zone; change them here only.
 */

export type ZoneId = "eg" | "gulf" | "mid" | "global";
export type Billing = "monthly" | "yearly";

export interface PriceZone {
  id: ZoneId;
  label: string;
  hint: string;
  /** "$" is written right after the number (7.99$); local units after a space (699 جنيه). */
  unit: string;
  unitAttached: boolean;
  plus: { monthly: number; yearly: number };
  family: number;
  program: number;
  lifetime: { price: number; seats: number };
  /** Daily cost of the yearly plan; keep in sync with plus.yearly. */
  dailyNote: string;
  studentFrom?: number;
}

export const PRICE_ZONES: PriceZone[] = [
  {
    id: "eg",
    label: "مصر",
    hint: "بالجنيه المصري",
    unit: "جنيه",
    unitAttached: false,
    plus: { monthly: 99, yearly: 699 },
    family: 1199,
    program: 499,
    lifetime: { price: 1499, seats: 300 },
    dailyNote: "أقل من جنيهين في اليوم",
    studentFrom: 249,
  },
  {
    id: "gulf",
    label: "الخليج",
    hint: "بالريال، أو ما يعادله بعملتك",
    unit: "ريال",
    unitAttached: false,
    plus: { monthly: 29, yearly: 219 },
    family: 379,
    program: 199,
    lifetime: { price: 369, seats: 200 },
    dailyNote: "أقل من ريال في اليوم",
  },
  {
    id: "mid",
    label: "دول عربية أخرى",
    hint: "الأردن والمغرب وتونس والجزائر والعراق وغيرها",
    unit: "$",
    unitAttached: true,
    plus: { monthly: 3.99, yearly: 29.99 },
    family: 49.99,
    program: 25,
    lifetime: { price: 49, seats: 200 },
    dailyNote: "أقل من 10 سنتات في اليوم",
  },
  {
    id: "global",
    label: "أمريكا وأوروبا وباقي العالم",
    hint: "بالدولار",
    unit: "$",
    unitAttached: true,
    plus: { monthly: 7.99, yearly: 59.99 },
    family: 99.99,
    program: 49,
    lifetime: { price: 99, seats: 200 },
    dailyNote: "أقل من 20 سنتاً في اليوم",
  },
];

export const DEFAULT_ZONE: ZoneId = "global";

const ZONE_BY_TIMEZONE: Record<string, ZoneId> = {
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

/** Best guess of the visitor's zone from the browser time zone; the page also lets them switch. */
export const zoneFromTimeZone = (tz: string | undefined): ZoneId => (tz && ZONE_BY_TIMEZONE[tz]) || DEFAULT_ZONE;

export const getZone = (id: ZoneId) => PRICE_ZONES.find((z) => z.id === id) ?? PRICE_ZONES[PRICE_ZONES.length - 1];

export const formatAmount = (amount: number): string =>
  Number.isInteger(amount) ? amount.toLocaleString("en-US") : amount.toFixed(2).replace(/\.?0+$/, "");

export function formatPrice(zone: PriceZone, amount: number): string {
  const n = formatAmount(amount);
  return zone.unitAttached ? `${n}${zone.unit}` : `${n} ${zone.unit}`;
}

/** Monthly equivalent of the yearly Plus price (rounded for display). */
export function yearlyPerMonth(zone: PriceZone): string {
  const v = zone.plus.yearly / 12;
  return formatPrice(zone, zone.unitAttached ? Math.round(v * 100) / 100 : Math.round(v));
}

export const yearlySavingPercent = (zone: PriceZone) =>
  Math.round((1 - zone.plus.yearly / (zone.plus.monthly * 12)) * 100);

export const FREE_FEATURES = [
  "الأولويات الثلاث، وجلسات التركيز بكل أطوالها",
  "مفكرة العوارض، والإغلاق المسائي، وتخطيط الغد",
  "مسار العودة بعد الانقطاع بخطوة صغيرة",
  "تأجيل الاندفاع، وتفكيك الأفكار بنسخته الأساسية",
  "المحتوى الإيماني الاختياري",
  "سجل آخر 30 يوماً، ونسخة احتياطية لبياناتك",
];

export const PLUS_FEATURES = [
  "كل ما في المجانية، والسجل كاملاً بلا حد",
  "المراجعة الأسبوعية وخريطة الـ52 أسبوعاً",
  "مصفوفة الأولويات، والمشاريع، والمواعيد",
  "دستور القيم، وتعلّم مهارة، ورؤية المستقبل",
  "سلسلة القيم ← المشاريع ← المهارات ← الأولويات، ومثال كامل تبدأ منه",
  "تفكيك الأفكار بالذكاء الاصطناعي",
];

export const PROGRAM_FEATURES = [
  "4 جلسات جماعية مباشرة مع المؤسس، جلسة كل أسبوع",
  "مجموعة التزام صغيرة طوال الشهر",
  "3 أشهر من الباقة الكاملة",
  "30 مقعداً فقط في كل دفعة",
];

/** Promised as free but not built yet; shown as "coming soon" so the page stays honest. */
export const COMING_SOON_FREE = "قريباً في المجانية: المزامنة بين الأجهزة والتذكيرات.";

/**
 * TODO(المؤسس): رابط الحجز للبرنامج والعائلة والعضوية المؤسِّسة (واتساب أو صفحة دفع).
 * While empty, those buttons show "the booking opens soon" instead of a dead link.
 */
export const BOOKING_URL = "";
