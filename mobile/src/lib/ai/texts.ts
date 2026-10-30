import type { CoachAccess } from "@/lib/ai/coachClient";

/** Every word the phone's coach shows about AI and privacy (the web's lib/ai/texts.ts, adapted). */
export const COACH_TEXT = {
  consent: {
    title: "قبل أن يساعدك المدرّب",
    body: "المدرّب يرسل عناوين أهدافك ومشاريعك ومهامك وأرقام أسبوعك إلى خدمة Google Gemini، عبر حسابك في المزامنة. لا يرسل أفكارك في أداة تفكيك الأفكار ولا ملاحظاتك.",
    note: "يمكنك تغيير اختيارك متى شئت من الإعدادات.",
    accept: "موافق، استخدم الذكاء الاصطناعي",
    decline: "لا، بدون ذكاء اصطناعي",
  },
  engine: {
    ai: "كتبها المدرّب (Gemini)",
    local: "كُتبت على هاتفك بالقواعد المحلية",
  },
  settings: {
    title: "المدرّب بالذكاء الاصطناعي",
    description: "تفكيك الأهداف والمراجعة الأسبوعية. عند التفعيل تُرسل العناوين والأرقام فقط إلى Google Gemini.",
  },
  noConsent: "تفكيك الأهداف يحتاج الذكاء الاصطناعي، وأنت اخترت العمل بدونه. يمكنك تفعيله من الإعدادات، أو إضافة المهام بنفسك.",
  failed: "لم يصل رد صالح من المدرّب. حاول مرة أخرى بعد قليل.",
  access: {
    "no-sync": "المدرّب الذكي يعمل عبر حسابك في المزامنة. اربط المزامنة من الإعدادات أولاً.",
    "no-function": "المدرّب الذكي غير منشور على مشروعك في Supabase بعد.",
    "no-key": "المدرّب الذكي ينتظر مفتاح Gemini في أسرار مشروعك على Supabase.",
    offline: "لا اتصال بالإنترنت الآن. جرّب حين يعود.",
  } satisfies Record<Exclude<CoachAccess, "ready">, string>,
} as const;
