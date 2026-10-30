/**
 * Every word the safety layer shows, in one place, so the web and phone screens say exactly the same thing.
 * Part of the portable safety kit (see README.md): copy verbatim, no imports, no platform APIs.
 */
export const SAFETY_TEXT = {
  disclaimer: "هذه أداة لتطوير الذات وليست بديلاً عن مختص نفسي.",

  consent: {
    title: "قبل أن نحلل فكرتك",
    body: "النص الذي تكتبه يُرسَل إلى خدمة Google Gemini ليُحلَّل. إن لم توافق، نحلله هنا على جهازك بقواعد أبسط.",
    note: "يمكنك تغيير اختيارك متى شئت من الإعدادات.",
    accept: "موافق، استخدم الذكاء الاصطناعي",
    decline: "لا، استخدم التحليل المحلي فقط",
  },

  crisis: {
    title: "يبدو أن ما تمرّ به ثقيل الآن",
    body: "شكراً لأنك كتبته. ما تشعر به يستحق أن يسمعه إنسان، لا أداة. لن نحلل هذه الفكرة؛ الأهم الآن أن تكون بخير.",
    reachOut: "تحدّث الآن مع شخص تثق به: صديق، أو أحد من أهلك، أو مختص نفسي. لست مضطراً لأن تحمل هذا وحدك.",
    emergency: "إن كنت في خطر الآن، اتصل برقم الطوارئ في بلدك أو اذهب إلى أقرب مستشفى.",
    done: "أنا بخير، أكمل لاحقاً",
  },

  engine: {
    ai: "حُلّلت بالذكاء الاصطناعي (Gemini)",
    local: "حُلّلت على جهازك بالقواعد المحلية",
  },

  settings: {
    title: "تفكيك الأفكار بالذكاء الاصطناعي",
    description: "عند التفعيل يُرسَل ما تكتبه في أداة تفكيك الأفكار إلى Google Gemini ليُحلَّل. عند الإطفاء يُحلَّل على جهازك فقط.",
  },
} as const;
