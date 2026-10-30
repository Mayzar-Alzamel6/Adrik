/**
 * Founder example: a complete, linked chain (values → projects → skills → frogs).
 * Shown on the public /founder page and copied into a new user's app when they choose
 * "ابدأ من تجربة المؤسس". The copy is independent: editing it never touches this file.
 *
 * TODO(المؤسس): كل ما في هذا الملف بيانات مؤقتة للتجربة. استبدلها بتجربتك الحقيقية.
 * - اربط بالمفاتيح (key) لا بالأسماء: valueKeys في المشروع، projectKeys في المهارة، projectKey/skillKey في الضفدع.
 * - المفتاح أي نص إنجليزي قصير فريد، ولا يظهر للمستخدم.
 * - loggedHours و status تظهر في صفحة /founder فقط؛ نسخة المستخدم تبدأ من الصفر.
 */

export type FounderTaskStatus = "TODO" | "DOING" | "DONE";

export interface FounderExample {
  founder: {
    name: string;
    role: string;
    story: string;
    quote: string;
  };
  values: {
    key: string;
    title: string;
    englishTitle: string;
    definition: string;
    dailyAction: string;
    redLine: string;
  }[];
  projects: {
    key: string;
    name: string;
    description: string;
    /** Target date as days from the day the user copies the template. */
    targetInDays?: number;
    valueKeys: string[];
    tasks: { title: string; status: FounderTaskStatus }[];
  }[];
  skills: {
    key: string;
    title: string;
    projectKeys: string[];
    /** Founder's own progress, shown on /founder only. */
    loggedHours: number;
    elements: { category: "CONCEPT" | "FACT" | "PROCEDURE"; content: string }[];
  }[];
  frogs: {
    title: string;
    projectKey?: string;
    skillKey?: string;
  }[];
}

export const FOUNDER_EXAMPLE: FounderExample = {
  // TODO(المؤسس): اسمك، وصفك بسطر، وقصتك في سطرين أو ثلاثة.
  founder: {
    name: "المؤسس (بيانات مؤقتة)",
    role: "صانع تطبيق «أدرك عمرك»",
    story:
      "هذه مساحة قصتك: من أين بدأت، وما الذي تغيّر حين ربطت كل مهمة يومية بقيمة تؤمن بها. (نص مؤقت)",
    quote: "لا أبدأ يومي بقائمة مهام، بل بسؤال: ما القيمة التي أخدمها اليوم؟ (نص مؤقت)",
  },

  // TODO(المؤسس): قيمك الحقيقية (3 إلى 5).
  values: [
    {
      key: "freedom",
      title: "الحرية",
      englishTitle: "Freedom",
      definition: "أن أملك وقتي وقراري، وأبني ما يعمل حتى في غيابي.",
      dailyAction: "جلسة تركيز واحدة على مشروع يصنع دخلاً مستقلاً.",
      redLine: "لا أبيع صباحي لما لا يخدم أهدافي.",
    },
    {
      key: "mastery",
      title: "الإتقان",
      englishTitle: "Mastery",
      definition: "أن أتعلّم بعمق، وأسلّم عملاً أفخر به.",
      dailyAction: "ممارسة متعمّدة لمهارة واحدة، ولو نصف ساعة.",
      redLine: "لا أقفز بين المصادر قبل أن أنهي ما بدأته.",
    },
    {
      key: "family",
      title: "الأسرة",
      englishTitle: "Family",
      definition: "حضور حقيقي مع من أحب، لا حضور جسد وذهن غائب.",
      dailyAction: "وقت يومي بلا هاتف مع العائلة.",
      redLine: "لا عمل على مائدة العشاء.",
    },
  ],

  // TODO(المؤسس): مشاريعك، وكل مشروع يخدم قيمة أو أكثر.
  projects: [
    {
      key: "app",
      name: "بناء تطبيق أدرك عمرك",
      description: "منتج يساعد الناس على تحويل النية إلى إنجاز يومي.",
      targetInDays: 60,
      valueKeys: ["freedom", "mastery"],
      tasks: [
        { title: "تصميم شاشة اليوم", status: "DONE" },
        { title: "بناء مؤقت التركيز", status: "DONE" },
        { title: "ربط القيم بالمشاريع والضفادع", status: "DOING" },
        { title: "صفحة الاشتراك والدفع", status: "TODO" },
      ],
    },
    {
      key: "language",
      name: "إتقان لغة جديدة",
      description: "الوصول إلى محادثة مريحة في مواقف الحياة اليومية.",
      targetInDays: 120,
      valueKeys: ["mastery"],
      tasks: [
        { title: "إنهاء مستوى القواعد الأساسي", status: "DONE" },
        { title: "محادثة أسبوعية مع شريك لغة", status: "DOING" },
        { title: "اجتياز اختبار تجريبي", status: "TODO" },
      ],
    },
    {
      key: "home",
      name: "بيت هادئ ومترابط",
      description: "طقوس صغيرة ثابتة تجمع العائلة كل أسبوع.",
      valueKeys: ["family"],
      tasks: [
        { title: "عشاء أسبوعي بلا شاشات", status: "DOING" },
        { title: "نزهة شهرية مخططة مسبقاً", status: "TODO" },
      ],
    },
  ],

  // TODO(المؤسس): المهارات التي تحتاجها مشاريعك.
  skills: [
    {
      key: "programming",
      title: "البرمجة",
      projectKeys: ["app"],
      loggedHours: 34,
      elements: [
        { category: "CONCEPT", content: "كيف تتدفق البيانات بين الواجهة والتخزين" },
        { category: "PROCEDURE", content: "بناء شاشة كاملة من الصفر يومياً" },
      ],
    },
    {
      key: "content",
      title: "التسويق بالمحتوى",
      projectKeys: ["app"],
      loggedHours: 22,
      elements: [{ category: "PROCEDURE", content: "كتابة منشور واحد يومياً عن رحلة البناء" }],
    },
    {
      key: "speaking",
      title: "المحادثة باللغة الجديدة",
      projectKeys: ["language"],
      loggedHours: 9,
      elements: [
        { category: "FACT", content: "أهم 300 كلمة في الحديث اليومي" },
        { category: "PROCEDURE", content: "10 دقائق حديث ذاتي بصوت مسموع" },
      ],
    },
  ],

  // TODO(المؤسس): ثلاثة ضفادع من يوم حقيقي من أيامك.
  frogs: [
    { title: "إنهاء شاشة ربط القيم في التطبيق", projectKey: "app", skillKey: "programming" },
    { title: "30 دقيقة محادثة مع شريك اللغة", projectKey: "language", skillKey: "speaking" },
    { title: "عشاء بلا هاتف مع العائلة", projectKey: "home" },
  ],
};
