/**
 * On-device thought reframing: the same rule engine the web app falls back to without an AI key.
 * Nothing leaves the phone. The crisis check lives in the safety kit (lib/safety) and runs before this.
 */

export interface ReframeResult {
  distortionType: string;
  reframedThought: string;
  nextSmallAction: string;
}

// Fold spelling variants (tashkeel, tanween, hamza forms, ta marbuta / alef maqsura).
const normalizeArabic = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

export function reframeThought(automaticThought: string): ReframeResult {
  const t = normalizeArabic(automaticThought);
  const has = (keyword: string) => t.includes(normalizeArabic(keyword));

  if (has("كارثة") || has("ضياع") || has("ضاع") || has("مستحيل") || has("انتهيت")) {
    return {
      distortionType: "التضخيم والتهويل الكارثي",
      reframedThought:
        "الموقف الحالي غير مريح ومربك، لكنه ليس نهاية المطاف. دماغك يبالغ في استشعار الخطر بينما الواقع يمكن معالجته خطوة بخطوة.",
      nextSmallAction: "خذ 3 أنفاس عميقة واكتب أصغر مهمة ممكنة في سطر واحد ثم باشرها فوراً.",
    };
  }
  if (has("دائماً") || has("أبداً") || has("كل مرة") || has("عاداتي")) {
    return {
      distortionType: "التعميم المفرط",
      reframedThought:
        "حقيقة أنك تعثرت في هذه اللحظة لا تعني أنك تتعثر «دائماً». هذا حدث منفصل، ولديك اليوم فرصة جديدة للاختيار السليم.",
      nextSmallAction: "افصل هذا الموقف عن ماضيك وابدأ في كتلة عمل مصغرة مدتها 15 دقيقة فقط.",
    };
  }
  if (has("أنا فاشل") || has("ذنبي") || has("أنا السبب") || has("لا أستحق")) {
    return {
      distortionType: "الشخصنة وجلد الذات",
      reframedThought:
        "أنت إنسان يواجه تحديات طبيعية؛ سلوكك اللحظي لا يُعرّف قيمتك ولا هويتك كمهني أو كمتعلم.",
      nextSmallAction: "ذكّر نفسك بقيمتك النواة وأكمل دقيقة عمل واحدة فقط الآن.",
    };
  }
  if (has("أشعر") || has("حاسس") || has("مزاجي") || has("لست في المود")) {
    return {
      distortionType: "الاستدلال الانفعالي",
      reframedThought:
        "المشاعر مؤشرات عابرة وليست حقائق مطلقة؛ السلوك هو ما يقود الشعور وليس العكس، والبدء بالحركة يغيّر المزاج تدريجياً.",
      nextSmallAction: "قف وغيّر وضعية جسدك، وابدأ العمل الفعلي دون انتظار أن تصبح متحمساً.",
    };
  }
  return {
    distortionType: "التفكير القطبي (الكل أو لا شيء)",
    reframedThought:
      "التعثر المؤقت ليس فشلاً شاملاً؛ النتيجة التراكمية تُبنى بالاستئناف السريع وليس بالبدايات الخالية من الأخطاء.",
    nextSmallAction: "إتمام خطوة واحدة فقط لمدة دقيقتين (مثال: فتح الملف أو قراءة فقرة واحدة).",
  };
}
