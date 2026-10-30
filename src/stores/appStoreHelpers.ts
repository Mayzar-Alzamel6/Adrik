import { toLocalDateString, weekOf, weeksInYear, type WeekRef } from "@/lib/utils";
import type {
  CoreValueItem,
  FocusAreaId,
  BinaryHabit,
  FrogTask,
  FluencyPracticeState,
  HabitChoice,
  BeliefAuditItem,
  ReframedStoryItem,
  GoalToIdentityItem,
  CalendarEventItem,
  TimeEntryItem,
  SkillProjectItem,
  SymbolismLogItem,
  WeekAuditItem,
  FocusTimerMode,
} from "./appStoreTypes";

/** The early-exit reason that never counts against the streak. */
export const EXTERNAL_INTERRUPTION = "مقاطعة خارجية لا مفر منها";

export const FOCUS_MODE_MINUTES: Partial<Record<FocusTimerMode, number>> = {
  WORK_90: 90,
  WORK_60: 60,
  WORK_45: 45,
  WORDS_25: 25,
  FLUENCY_15: 15,
};

/** Rest scales with the effort it follows: a deep 90-minute block earns a real break. */
export function breakMinutesFor(sessionMinutes: number) {
  if (sessionMinutes >= 90) return 20;
  if (sessionMinutes >= 25) return 5;
  return 3;
}

export const VALUE_TEMPLATES: CoreValueItem[] = [
  {
    id: "val-1",
    title: "الأمان والاستقرار المالي والمهني",
    englishTitle: "Security & Professional Stability",
    definition: "بناء أرضية صلبة ومصادر دخل ومهارات قابلة للتداول دون خوف من الغد.",
    dailyAction: "ساعتان من العمل غير المنقطع على تنمية المهارة الأساسية أو مشروعي الأساسي.",
    redLine: "التسويف المقنع بدراسة غير مجدية، أو الاستهلاك المالي الاندفاعي.",
    conflictRule: "عند التعارض مع الراحة اللحظية، يُقدّم تأمين المستقبل على إغراء الاسترخاء العاجل.",
    order: 1,
  },
  {
    id: "val-2",
    title: "النمو والإتقان المهني",
    englishTitle: "Growth & High Craftsmanship",
    definition: "أن أكون رقماً صعباً وذا جودة رفيعة لا يمكن تجاهلها في تخصصي.",
    dailyAction: "كتلة تعلم عميق يومية في مهارتك الأساسية مع تطبيق عملي.",
    redLine: "السطحية والمرور العابر على المعارف دون تطبيق عملي واختبار صارم.",
    conflictRule: "عند التعارض مع السهولة، يُقدّم التحدي الذهني الصاقل على الأعمال الروتينية الخادعة.",
    order: 2,
  },
  {
    id: "val-3",
    title: "الاعتماد على الذات والاستقلالية",
    englishTitle: "Autonomy & Self-Reliance",
    definition: "القدرة على توجيه دفتي بوعي دون انتظار ظروف مثالية أو محفزات خارجية.",
    dailyAction: "حل مشكلة واحدة معقدة أو البدء دون مساعدة عندما يراودني التسويف.",
    redLine: "إلقاء اللوم على البيئة أو الظروف والتحول لوضعية الضحية.",
    conflictRule: "عند التعارض مع الخوف من المجهول، تُقدّم المبادرة الذاتية على انتظار توجيه أو عون خارجي.",
    order: 3,
  },
  {
    id: "val-4",
    title: "الانضباط والتركيز الفائق",
    englishTitle: "Discipline & Deep Focus",
    definition: "تقديم ما يجب فعله على ما أشتهي فعله في اللحظة الراهنة.",
    dailyAction: "جلسة تركيز 90 دقيقة خالية تماماً من الهاتف والتصفح العشوائي.",
    redLine: "التجاوب مع النزوات اللحظية أو فتح مواقع التواصل أثناء العمل العميق.",
    conflictRule: "عند التعارض مع النزوات والشهوات اللحظية، يُقدّم الواجب الأثقل فوراً لحماية السيادة.",
    order: 4,
  },
  {
    id: "val-5",
    title: "الصمود والمثابرة (دوامة التعافي)",
    englishTitle: "Resilience & Continuity",
    definition: "الاستئناف الفوري بعد أي كبوة؛ فالعبرة بالدوامة لا بالبداية المثالية.",
    dailyAction: "إتمام دقيقة كايزن واحدة حتى في أسوأ الأيام، ومحاسبة النفس دون جلد للذات.",
    redLine: "الاستسلام لمتلازمة 'خربت خربت' بعد تفويت مهمة واحدة.",
    conflictRule: "عند التعارض مع مشاعر الإحباط ولوم النفس، تُقدّم خطوة كايزن صغرى على الاستسلام للشلل.",
    order: 5,
  },
  {
    id: "val-6",
    title: "الصحة والطاقة",
    englishTitle: "Health & Energy",
    definition: "جسد قوي ونوم منتظم هما الوقود الحقيقي لكل إنجاز.",
    dailyAction: "30 دقيقة حركة، ونوم قبل منتصف الليل.",
    redLine: "السهر بلا سبب والتضحية بالنوم مقابل التصفح.",
    conflictRule: "عند التعارض مع العمل الإضافي، تُقدّم الراحة التي تحفظ طاقة الغد.",
    order: 6,
  },
  {
    id: "val-7",
    title: "الأسرة والعلاقات",
    englishTitle: "Family & Relationships",
    definition: "حضور حقيقي مع من أحب، لا حضور جسدي بذهن مشغول.",
    dailyAction: "وقت يومي بلا هاتف مع الأسرة أو صديق مقرّب.",
    redLine: "تأجيل من أحب دائماً بحجة الانشغال.",
    conflictRule: "عند التعارض مع المهام غير الحرجة، يُقدّم حق الأقربين.",
    order: 7,
  },
  {
    id: "val-8",
    title: "العلم والتفوق الدراسي",
    englishTitle: "Knowledge & Academic Excellence",
    definition: "أن أفهم ما أدرسه فهماً أفخر به، لا أن أحفظه ليلة الاختبار.",
    dailyAction: "جلسة مذاكرة مركّزة يومية، ومراجعة ما درسته أمس قبل الجديد.",
    redLine: "تأجيل المذاكرة إلى ما قبل الاختبار، أو المذاكرة والهاتف في اليد.",
    conflictRule: "عند التعارض مع التسلية، يُقدّم الفهم اليوم على الاستدراك المرهق غداً.",
    order: 8,
  },
  {
    id: "val-9",
    title: "المبادرة وبناء ما يخصّني",
    englishTitle: "Initiative & Building My Own",
    definition: "أن أصنع شيئاً له قيمة للناس بيدي، بدل انتظار الفرصة المثالية.",
    dailyAction: "خطوة يومية ملموسة في مشروعي: عميل، أو منتج، أو تجربة.",
    redLine: "التخطيط بلا تنفيذ، والتحسين اللانهائي قبل أي إطلاق.",
    conflictRule: "عند التعارض مع الكمال، يُقدّم الإطلاق الصغير على الانتظار الطويل.",
    order: 9,
  },
];

/** The answer to "where do you need focus most?" — which values and habit onboarding suggests first. */
export const FOCUS_SUGGESTIONS: Record<FocusAreaId, { valueIds: string[]; habitId: string; priority: string }> = {
  work: { valueIds: ["val-1", "val-2", "val-4"], habitId: "h-2", priority: "مثال: إنهاء التقرير الأهم قبل الظهر" },
  study: { valueIds: ["val-8", "val-4", "val-5"], habitId: "h-3", priority: "مثال: مراجعة فصل كامل وحل تمارينه" },
  business: { valueIds: ["val-9", "val-3", "val-1"], habitId: "h-5", priority: "مثال: التواصل مع 5 عملاء محتملين" },
  skill: { valueIds: ["val-2", "val-4", "val-5"], habitId: "h-3", priority: "مثال: ساعة تمرين متعمّد في المهارة" },
};

/** A value the user wrote themselves: the rest of its fields are filled in later in the constitution. */
export const customValue = (title: string, definition = ""): CoreValueItem => ({
  id: `val-own-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: title.trim(),
  englishTitle: "",
  definition: definition.trim(),
  dailyAction: "",
  redLine: "",
  order: 0,
});

export const FAITH_VALUE_TEMPLATE: CoreValueItem = {
  id: "val-faith",
  title: "الإيمان والصلة بالله",
  englishTitle: "Faith",
  definition: "أن يكون العمل عبادة، والوقت أمانة أُسأل عنها.",
  dailyAction: "الصلاة في وقتها وورد يومي ثابت ولو قليل.",
  redLine: "تأخير الصلاة من أجل مهمة أو تصفح.",
  conflictRule: "عند التعارض، يُقدّم حق الله على كل انشغال.",
  order: 0,
};

export const INITIAL_BELIEF_AUDITS: BeliefAuditItem[] = [];
export const INITIAL_REFRAMED_STORIES: ReframedStoryItem[] = [];
export const INITIAL_GOAL_IDENTITIES: GoalToIdentityItem[] = [];

export const FLUENCY_WEEK_FROGS: FrogTask[] = [];
export const STANDARD_FROGS: FrogTask[] = [];
export const INITIAL_FROGS: FrogTask[] = [];

export const INITIAL_FLUENCY_PRACTICE: FluencyPracticeState = {
  words: [],
  sentences: [],
  monologueTopic: "",
  shadowingDone: false,
  monologueDone: false,
  spokenAloudDone: false,
};

export const INITIAL_BINARY_HABITS: BinaryHabit[] = [
  { id: "h-2", title: "جلسة تركيز عميق دون هاتف", isCompleted: false },
  { id: "h-3", title: "30 دقيقة تعلّم في مهارتك الأساسية", isCompleted: false },
  { id: "h-4", title: "30 دقيقة حركة أو مشي", isCompleted: false },
  { id: "h-5", title: "لا تواصل اجتماعي قبل إنهاء الأولويات", isCompleted: false },
];

/** The starter habit a completed focus session ticks by itself. */
export const FOCUS_HABIT_ID = "h-2";

export const FAITH_HABITS: BinaryHabit[] = [
  { id: "h-faith-1", title: "الصلوات في وقتها", isCompleted: false },
  { id: "h-faith-2", title: "ورد يومي ولو صفحة", isCompleted: false },
];

/** Which template value each starter habit lives out — linked only when the user picked that value. */
export const STARTER_HABIT_VALUES: Record<string, string[]> = {
  "h-faith-1": ["val-faith"],
  "h-faith-2": ["val-faith"],
  "h-2": ["val-4"],
  "h-3": ["val-2", "val-8"],
  "h-4": ["val-6"],
  "h-5": ["val-4", "val-9"],
};

/** Each habit is a 21-day commitment, so onboarding asks for one or two, never a ready-made six. */
export const MAX_STARTER_HABITS = 2;

/** The ready-made habits onboarding offers to pick from. */
export const starterHabitOptions = (faith: boolean) => (faith ? [...FAITH_HABITS, ...INITIAL_BINARY_HABITS] : INITIAL_BINARY_HABITS);

/**
 * The picked habits, stamped with today's date (so missed days count from the start, not from the first tick)
 * and tied to the user's values when they chose the matching one.
 */
export function starterHabits(choice: HabitChoice, valueIds: string[]): BinaryHabit[] {
  const createdAt = new Date().toISOString();
  const picked = [...FAITH_HABITS, ...INITIAL_BINARY_HABITS]
    .filter((h) => choice.ids.includes(h.id))
    .map((h) => {
      const valueId = STARTER_HABIT_VALUES[h.id]?.find((id) => valueIds.includes(id));
      return { ...h, createdAt, ...(valueId ? { valueId } : {}) };
    });
  const own = choice.custom
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title, i) => ({ id: `h-${Date.now()}-${i}`, title, isCompleted: false, createdAt }));
  return [...picked, ...own].slice(0, MAX_STARTER_HABITS);
}

export const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalDateString(tomorrow);
};

export const INITIAL_EVENTS: CalendarEventItem[] = [];
export const INITIAL_TIME_ENTRIES: TimeEntryItem[] = [];

/**
 * Week color per the PRD: green needs >=70% completion AND a huge action (4);
 * a decline / no action (1-2) is never better than red, whatever the completion.
 */
export const computeWeekColor = (
  completionRate: number,
  actionLevel: 1 | 2 | 3 | 4
): "GREEN" | "YELLOW" | "RED" => {
  if (actionLevel <= 2) return "RED";
  if (completionRate >= 70 && actionLevel === 4) return "GREEN";
  return completionRate >= 50 ? "YELLOW" : "RED";
};

export const pendingWeek = ({ year, week }: WeekRef): WeekAuditItem => ({
  weekNumber: week,
  year,
  completionRate: 0,
  escapeHoursTotal: 0,
  actionLevel: 3,
  colorStatus: "PENDING",
  rewardClaimed: false,
});

/**
 * Before version 2 a "week" was a 7-day block counted from 1 January. Each saved review moves to the
 * Saturday-to-Friday week that holds the last day of its old block; unsaved placeholders are dropped.
 */
export function migrateLegacyAudits(audits: WeekAuditItem[]): WeekAuditItem[] {
  const moved = new Map<string, WeekAuditItem>();
  for (const a of audits) {
    if (a.colorStatus === "PENDING" || !a.year) continue;
    const ref = weekOf(new Date(a.year, 0, a.weekNumber * 7));
    moved.set(`${ref.year}-${ref.week}`, { ...a, year: ref.year, weekNumber: ref.week });
  }
  return [...moved.values()];
}

/** Every week of a year, 52 or 53, with the reviews already saved for it. A new year needs no reset. */
export const weeksOfYear = (audits: WeekAuditItem[], year: number): WeekAuditItem[] =>
  Array.from(
    { length: weeksInYear(year) },
    (_, i) => audits.find((w) => w.year === year && w.weekNumber === i + 1) ?? pendingWeek({ year, week: i + 1 })
  );

export const HIMMA_VERSES = [
  {
    verse: "فَمَا وَهَنُوا لِمَا أَصَابَهُمْ فِي سَبِيلِ اللَّهِ وَمَا ضَعُفُوا وَمَا اسْتَكَانُوا ۗ وَاللَّهُ يُحِبُّ الصَّابِرِينَ",
    source: "سورة آل عمران: 146",
    focus: "عزيمة الصمود وقوة النفس أمام المشاق والابتلاءات ومحو أوهام الضعف والاستكانة.",
  },
  {
    verse: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ",
    source: "سورة العنكبوت: 69",
    focus: "وعد الهداية والفتح وبصيرة القرار لمن يبذل وسعه بالفعل الصادق لا بالأماني.",
  },
  {
    verse: "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ",
    source: "سورة آل عمران: 159",
    focus: "الحسم بعد التردد والبدء بالعمل الفعلي دون تسويف مقنع بدراسات لا تنتهي.",
  },
  {
    verse: "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ ۝ وَأَنَّ سَعْيَهُ سَوْفَ يُرَىٰ",
    source: "سورة النجم: 39-40",
    focus: "التركيز على مدخلات السعي المتقنة لا على النتائج المتوهمة السريعة.",
  },
];

export const INITIAL_SKILLS: SkillProjectItem[] = [];
export const INITIAL_SYMBOLISM_LOGS: SymbolismLogItem[] = [];
