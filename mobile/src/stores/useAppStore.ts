import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalDateString, isInWeek, weekOf, weeksInYear, type WeekRef } from "@/lib/utils";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { habitLock } from "@/lib/habits";

export type TaskCategory = "QUALITY" | "EMERGENCY" | "DELEGATE" | "ESCAPE";
export type DailyStation = "NEURO_GATE" | "DAY_FOCUS" | "EVENING_CLOSURE";
export type EnergyTaxonomy = "genius" | "drain" | "neutral";

export interface FrogTask {
  id: string;
  title: string;
  /** Position in today's list. Finished priorities keep theirs, so the list can pass 3 while no more than 3 are open. */
  order: number;
  isCompleted: boolean;
  category: TaskCategory;
  createdAt: string;
  completedAt?: string;
  /** Optional lineage links; absent on frogs saved before they existed. */
  projectId?: string;
  skillId?: string;
  /** The project task this priority is; finishing one finishes the other. */
  projectTaskId?: string;
  /** INTJ-A Operating System additions */
  definitionOfDone?: string;
  energyTag?: EnergyTaxonomy;
  isRerouted?: boolean;
  isDropped?: boolean;
  dropReason?: string;
  /** The anchored priority this task was pulled under. */
  anchorId?: string;
  /** Days this task was carried over unfinished; three suggest a conscious drop. */
  rolloverCount?: number;
}

/** A priority that stays every day until closed by hand, tied to one project; today's tasks are pulled from it. */
export interface AnchorPriority {
  id: string;
  title: string;
  projectId: string;
  /** The far goal and its date. */
  goal: string;
  targetDate?: string;
  order: number;
  createdAt: string;
  closedAt?: string;
}

export const MAX_ANCHORS = 3;
export const MAX_TASKS_PER_ANCHOR = 3;
/** Open tasks on today's list, anchored or not: the rule of three holds for the whole day. */
export const MAX_OPEN_TODAY = 3;
const FULL_DAY = "لديك ثلاث مهام مفتوحة اليوم. أنجز واحدة أولاً، أو أرسل هذه إلى صندوق المهام.";

/** Groups today's list under the anchors in their order (unanchored last), so the first task of anchor #1 is the frog. */
export function groupByAnchor<T extends { order: number; anchorId?: string }>(frogs: T[], anchors: AnchorPriority[]): T[] {
  const open = anchors.filter((a) => !a.closedAt).sort((a, b) => a.order - b.order);
  const rank = (f: T) => {
    const i = open.findIndex((a) => a.id === f.anchorId);
    return i < 0 ? open.length : i;
  };
  return [...frogs].sort((a, b) => rank(a) - rank(b) || a.order - b.order).map((f, i) => ({ ...f, order: i + 1 }));
}

export type FrogLinks = Pick<FrogTask, "projectId" | "skillId">;

export interface FrogDayRecord {
  date: string; // "YYYY-MM-DD" the frogs were planned for
  frogs: (Pick<FrogTask, "id" | "title" | "order" | "completedAt" | "projectId" | "skillId"> & {
    category?: TaskCategory;
    energyTag?: EnergyTaxonomy;
    definitionOfDone?: string;
    isRerouted?: boolean;
    isDropped?: boolean;
    dropReason?: string;
    anchorId?: string;
    rolloverCount?: number;
  })[];
}

export interface RerouteEvent {
  id: string;
  date: string;
  incident: string;
  negotiatedHours: number;
  bufferTarget: "tonight" | "tomorrow";
  timestamp: string;
}

export interface WeeklyFrogStats {
  done: number;
  total: number;
  rate: number;
  items: { id: string; title: string; completedAt: string }[];
}

export interface BinaryHabit {
  id: string;
  title: string;
  /** Done today; the full record lives in `habitHistory`. */
  isCompleted: boolean;
  /** The value this habit is a daily vote for. */
  valueId?: string;
  skillId?: string;
  /** Weekdays it is due (0 = Sunday). Absent or empty means every day. */
  days?: number[];
  /** Habit stacking: "after I …". */
  cue?: string;
  /** The smallest version that still counts on a bad day. */
  minimum?: string;
  createdAt?: string;
  /** Kept with its history but no longer tracked. */
  archived?: boolean;
}

export type HabitInput = Partial<Pick<BinaryHabit, "valueId" | "skillId" | "days" | "cue" | "minimum">>;

export interface TimeEntryItem {
  id: string;
  taskId?: string;
  taskTitle?: string;
  category: TaskCategory;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
  /** Lineage snapshot of the frog the time went to; absent on entries logged before it existed. */
  projectId?: string;
  skillId?: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "14:30"
  location?: string;
  notes?: string;
  isMandatory: boolean;
  createdAt: string;
  /** The project this appointment belongs to (a delivery, a meeting about it…). */
  projectId?: string;
}

export interface VaultItem {
  id: string;
  impulseTitle: string;
  delayHours: 2 | 24;
  lockedAt: number;
  unlocksAt: number;
  isResolved: boolean;
  actionTaken?: string;
}

export interface CbtLogEntry {
  id: string;
  createdAt: string;
  event: string;
  automaticThought: string;
  emotion: string;
  bodyLocation: string;
  distortionType: string;
  reframedThought: string;
  nextSmallAction: string;
}

export interface CoreValueItem {
  id: string;
  title: string;
  englishTitle: string;
  definition: string;
  dailyAction: string;
  redLine: string;
  conflictRule?: string; // قاعدة حسم التعارض
  order: number;
}

export interface BeliefAuditItem {
  id: string;
  belief: string;
  origin: string;
  action: "KEEP" | "MODIFY" | "DROP"; // [أُبقي] | [أُعدّل] | [أترك]
  notes?: string;
  createdAt: string;
}

export interface ReframedStoryItem {
  id: string;
  event: string;
  victimStory: string;
  creatorStory: string;
  createdAt: string;
}

export interface GoalToIdentityItem {
  id: string;
  goal: string;
  coreValue: string;
  selfNarrative: string;
  microHabit: string;
  redLine: string;
  createdAt: string;
}

export interface IdentityVoteItem {
  id: string;
  date: string;
  voteText: string;
}

export interface WeekAuditItem {
  weekNumber: number;
  year: number;
  completionRate: number; // 0 - 100
  escapeHoursTotal: number;
  actionLevel: 1 | 2 | 3 | 4;
  colorStatus: "GREEN" | "YELLOW" | "RED" | "PENDING";
  rewardClaimed: boolean;
  notes?: string;
}

export interface SkillElementItem {
  id: string;
  projectId: string;
  category: "CONCEPT" | "FACT" | "PROCEDURE";
  content: string;
  isMastered: boolean;
}

export interface SkillProjectItem {
  id: string;
  title: string;
  targetHours: number; // default 20
  loggedHours: number;
  isLocked: boolean; // Anti Method-Hopping Lock
  lockEndDate?: string;
  elements: SkillElementItem[];
  createdAt: string;
}

export interface SymbolismLogItem {
  id: string;
  escapeActivity: string;
  avoidedEmotion: string;
  rootMeaning: string;
  correctiveStep: string;
  createdAt: string;
}

export interface FourGatesState {
  khatarat: boolean; // حراسة الخَطَرات
  nazharat: boolean; // حراسة النَّظَرات
  lafadhat: boolean; // حراسة اللَّفَظات
  khotuwat: boolean; // حراسة الخُطُوات
}

export type FocusTimerMode =
  | "WORK_90"
  | "WORK_60"
  | "WORK_45"
  | "FLUENCY_15"
  | "WORDS_25"
  | "KICKOFF_10"
  | "MICRO_BREAK"
  | "DMN_STILLNESS";

export type SessionOutcome = "DONE" | "PARTIAL" | "NOT";

export interface FocusSessionLog {
  id: string;
  startedAt: string;
  endedAt: string;
  plannedMinutes: number;
  actualMinutes: number;
  commitment: string;
  taskId?: string;
  taskTitle?: string;
  /** Ran to the end (or the commitment was delivered) without an early exit. */
  completed: boolean;
  outcome: SessionOutcome | null;
  earlyExitReason?: string;
  projectId?: string;
  skillId?: string;
}

/** The early-exit reason that never counts against the streak. */
export const EXTERNAL_INTERRUPTION = "مقاطعة خارجية لا مفر منها";

export const FOCUS_MODE_MINUTES: Partial<Record<FocusTimerMode, number>> = {
  WORK_90: 90,
  WORK_60: 60,
  WORK_45: 45,
  WORDS_25: 25,
  FLUENCY_15: 15,
  KICKOFF_10: 10,
};

/** Rest scales with the effort it follows: a deep 90-minute block earns a real break. */
export function breakMinutesFor(sessionMinutes: number) {
  if (sessionMinutes >= 90) return 20;
  if (sessionMinutes >= 60) return 15;
  if (sessionMinutes >= 45) return 10;
  if (sessionMinutes >= 25) return 5;
  return 3;
}

export interface FluencyPracticeState {
  words: string[];
  sentences: string[];
  monologueTopic: string;
  shadowingDone: boolean;
  monologueDone: boolean;
  spokenAloudDone: boolean;
}

interface AppState {
  // Navigation & Station
  currentStation: DailyStation;
  setCurrentStation: (station: DailyStation) => void;

  // 1. Neuro-Gate Station
  neuroGatePassed: boolean;
  neuroGateDate: string | null;
  neuroGateSkipped: boolean;
  breathCompleted: boolean;
  gazeCompleted: boolean;
  passNeuroGate: () => void;
  skipNeuroGate: () => void;
  resetNeuroGate: () => void;
  setBreathCompleted: (val: boolean) => void;
  setGazeCompleted: (val: boolean) => void;

  // 2. Day Focus Station (3-Frog Planner) & Daily Rollover
  currentDay: string;
  tomorrowFrogs: FrogTask[] | null;
  activeFrogId: string | null;
  setTomorrowFrogs: (frogs: FrogTask[]) => void;
  rolloverIfNewDay: () => void;
  getCurrentFrog: () => FrogTask | undefined;
  /** Moves a priority to a new position in today's list (0 = first). The first open one is the one the timer works on. */
  reorderFrog: (id: string, toIndex: number) => void;
  frogs: FrogTask[];
  previousFrogs: FrogTask[] | null;
  isEveningLocked: boolean;
  eveningCommittedDate: string | null;
  addFrog: (title: string, order: number, category: TaskCategory, links?: FrogLinks) => void;
  /**
   * Adds a priority at the end of today's list. Refuses when three are already open — the rule is
   * "three at a time", and finished ones never make room by being erased.
   */
  appendFrog: (
    title: string,
    category: TaskCategory,
    links?: FrogLinks & { projectTaskId?: string }
  ) => { ok: true; id: string } | { ok: false; message: string };
  // Anchored priorities
  anchors: AnchorPriority[];
  addAnchor: (input: { title: string; projectId: string; goal: string; targetDate?: string }) => { ok: true } | { ok: false; message: string };
  updateAnchor: (id: string, updates: Partial<Pick<AnchorPriority, "title" | "goal" | "targetDate">>) => void;
  closeAnchor: (id: string) => void;
  moveAnchor: (id: string, toIndex: number) => void;
  /** Pulls an open task of the anchor's project into today, under the anchor. */
  pullAnchorTask: (anchorId: string, taskId: string) => { ok: true } | { ok: false; message: string };
  /** Makes a project task one of today's priorities, in the first free slot. */
  addFrogFromProjectTask: (projectId: string, taskId: string) => { ok: true } | { ok: false; message: string };
  /** Mirrors a status change made on the project side onto today's matching priority. */
  syncFrogWithProjectTask: (taskId: string, done: boolean) => void;
  updateFrog: (id: string, updates: Partial<FrogTask>) => void;
  toggleFrog: (id: string) => void;
  deleteFrog: (id: string) => void;
  frogHistory: FrogDayRecord[];
  getWeeklyFrogStats: (week: WeekRef) => WeeklyFrogStats;
  commitEveningPlan: () => void;
  unlockMorningOverride: () => void;
  setFluencyWeekFrogs: () => void;
  restorePreviousFrogs: () => void;
  resetToStandardFrogs: () => void;

  // Hyper-Focus Engine
  focusSecondsRemaining: number;
  isFocusRunning: boolean;
  focusEndsAt: number | null;
  focusStartedAt: number | null;
  focusCommitment: string;
  focusSessions: FocusSessionLog[];
  pendingSessionReviewId: string | null;
  focusStreak: number;
  bestFocusStreak: number;
  /** "Never miss twice": one early exit puts the streak at risk instead of erasing it; a second in a row resets it. */
  focusStreakAtRisk: boolean;
  /** The one-time "ready for a 90-minute session?" suggestion was answered. */
  deepSessionNudgeDone: boolean;
  answerDeepSessionNudge: (tryDeep: boolean) => void;
  finishFocusSession: (opts: { completed: boolean; outcome?: SessionOutcome; earlyExitReason?: string }) => void;
  rateFocusSession: (outcome: SessionOutcome | null) => void;
  repeatLastSession: () => boolean;
  breakEndsAt: number | null;
  breakMinutes: number;
  lastBreakEndedAt: number | null;
  breakOffer: { minutes: number; frogTitle: string } | null;
  startBreak: (minutes: number) => void;
  endBreak: () => void;
  dismissBreakOffer: () => void;
  focusMode: FocusTimerMode;
  distractions: string[];
  completedDeepWorkSessions: number;
  startFocus: (commitment: string) => void;
  resetFocus: (mode?: FocusTimerMode) => void;
  tickFocus: () => void;
  addDistraction: (thought: string) => void;
  removeDistraction: (index: number) => void;
  clearDistractions: () => void;

  // Production & Fluency Week Lab
  fluencyPractice: FluencyPracticeState;
  updateFluencyPractice: (updates: Partial<FluencyPracticeState>) => void;

  // Task-Linked Time Tracking
  timeEntries: TimeEntryItem[];
  logTimeEntry: (entry: Omit<TimeEntryItem, "id" | "createdAt">) => void;
  logEscapeMinutes: (minutes: number, notes?: string) => void;
  getWeeklyAggregatedMinutes: (week: WeekRef) => {
    qualityMinutes: number;
    escapeMinutes: number;
    emergencyMinutes: number;
    delegateMinutes: number;
  };

  // Horizon Planning Events Calendar
  events: CalendarEventItem[];
  addEvent: (entry: Omit<CalendarEventItem, "id" | "createdAt">) => void;
  deleteEvent: (id: string) => void;
  getTomorrowEvents: () => CalendarEventItem[];

  // Impulse Delay Vault
  vaultItems: VaultItem[];
  addVaultItem: (title: string, delayHours: 2 | 24) => void;
  resolveVaultItem: (id: string, actionTaken: string) => void;

  // Agile Reroute
  rerouteHistory: RerouteEvent[];
  addRerouteEvent: (event: Omit<RerouteEvent, "id" | "timestamp">) => void;

  // Evening Quality Gate
  eveningQualityCheck: Record<string, boolean>;
  setEveningQualityCheck: (date: string, passed: boolean) => void;

  // 3. Evening Closure Station (Binary habits & Identity)
  binaryHabits: BinaryHabit[];
  /** Completed habit ids per local day ("YYYY-MM-DD"). */
  habitHistory: Record<string, string[]>;
  toggleBinaryHabit: (id: string) => void;
  /** Marks a habit done or not on any day, for honest catch-up of the last days. */
  setHabitDay: (id: string, date: string, done: boolean) => void;
  addBinaryHabit: (title: string, input?: HabitInput) => void;
  updateHabit: (id: string, updates: Partial<Omit<BinaryHabit, "id" | "isCompleted">>) => void;
  removeBinaryHabit: (id: string) => void;
  identityVotes: IdentityVoteItem[];
  addIdentityVote: (voteText: string) => void;

  // CBT Triangle
  cbtLogs: CbtLogEntry[];
  addCbtLog: (entry: Omit<CbtLogEntry, "id" | "createdAt">) => void;

  // Identity & Constitution
  values: CoreValueItem[];
  updateCoreValue: (id: string, updates: Partial<CoreValueItem>) => void;
  addCoreValue: (value: CoreValueItem) => void;
  removeCoreValue: (id: string) => void;
  beliefAudits: BeliefAuditItem[];
  addBeliefAudit: (item: Omit<BeliefAuditItem, "id" | "createdAt">) => void;
  deleteBeliefAudit: (id: string) => void;
  reframedStories: ReframedStoryItem[];
  addReframedStory: (item: Omit<ReframedStoryItem, "id" | "createdAt">) => void;
  goalIdentities: GoalToIdentityItem[];
  addGoalIdentity: (item: Omit<GoalToIdentityItem, "id" | "createdAt">) => void;
  deleteGoalIdentity: (id: string) => void;

  // 52-Week Audit (Sharik Shahih)
  weeklyAudits: WeekAuditItem[];
  submitWeeklyAudit: (
    week: WeekRef,
    escapeHours: number,
    completionRate: number,
    actionLevel: 1 | 2 | 3 | 4,
    notes?: string
  ) => void;
  claimWeeklyReward: (week: WeekRef) => void;

  // Flywheel Recovery
  lastActiveDate: string;
  hasSeenRecoveryPrompt: boolean;
  recordActivity: () => void;
  dismissRecovery: () => void;
  performKaizenReset: () => void;

  // Meta-Learning 3-Column Organizer & Anti Method-Hopping Lock
  skills: SkillProjectItem[];
  addSkillProject: (title: string, targetHours?: number) => { success: boolean; message?: string };
  addSkillElement: (projectId: string, category: "CONCEPT" | "FACT" | "PROCEDURE", content: string) => void;
  toggleSkillElement: (projectId: string, elementId: string) => void;
  deleteSkillElement: (projectId: string, elementId: string) => void;
  addSkillLoggedTime: (projectId: string, hours: number) => void;

  // Escape Symbolism Decoder
  symbolismLogs: SymbolismLogItem[];
  addSymbolismLog: (log: Omit<SymbolismLogItem, "id" | "createdAt">) => void;

  // The 4 Ingress Gates of Ibn al-Qayyim
  fourGates: FourGatesState;
  toggleFourGate: (gate: keyof FourGatesState) => void;
  resetFourGates: () => void;

  // Variable Dopamine Reward Engine (Intermittent 35% probability)
  randomRewardAvailable: boolean;
  lastRewardWon: string | null;
  rollVariableReward: () => boolean;
  claimRandomReward: () => void;
  dismissRandomReward: () => void;

  // Quranic Himma Header
  himmaIndex: number;
  nextHimmaVerse: () => void;

  // Smart Buffer Time (Anti-Packing)
  bufferTimeMinutes: number;
  setBufferTimeMinutes: (minutes: number) => void;

  // Product profile, onboarding & settings
  profile: { name: string; focusArea: FocusAreaId | null; vision?: string };
  onboardingDone: boolean;
  /** `sound` is undefined in data saved before the option existed; treat that as on. */
  settings: { faithContent: boolean; sound?: boolean };
  setSound: (enabled: boolean) => void;
  completeOnboarding: (input: {
    name: string;
    focusArea: FocusAreaId | null;
    valueIds: string[];
    /** Values the user wrote themselves, kept after the chosen templates. */
    customValues?: CoreValueItem[];
    priorities: string[];
    faithContent: boolean;
    habits: HabitChoice;
  }) => void;
  /** The founder template: its values now; its projects and skills arrive as their stages open (lib/founderTemplate). */
  completeOnboardingWithTemplate: (input: {
    name: string;
    focusArea: FocusAreaId | null;
    faithContent: boolean;
    values: CoreValueItem[];
    priorities: string[];
    habits: HabitChoice;
  }) => void;
  setFaithContent: (enabled: boolean) => void;
  updateProfile: (updates: Partial<{ name: string; focusArea: FocusAreaId | null; vision: string }>) => void;
  resetAllData: () => void;

  // Theme Management
  themeMode: "light" | "dark";
  toggleTheme: () => void;
  setThemeMode: (mode: "light" | "dark") => void;
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

const INITIAL_BELIEF_AUDITS: BeliefAuditItem[] = [];

const INITIAL_REFRAMED_STORIES: ReframedStoryItem[] = [];

const INITIAL_GOAL_IDENTITIES: GoalToIdentityItem[] = [];

export const FLUENCY_WEEK_FROGS: FrogTask[] = [];

export const STANDARD_FROGS: FrogTask[] = [];

const INITIAL_FROGS: FrogTask[] = [];

export const INITIAL_FLUENCY_PRACTICE: FluencyPracticeState = {
  words: [],
  sentences: [],
  monologueTopic: "",
  shadowingDone: false,
  monologueDone: false,
  spokenAloudDone: false,
};

const INITIAL_BINARY_HABITS: BinaryHabit[] = [
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
const STARTER_HABIT_VALUES: Record<string, string[]> = {
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

/** What the user picked in onboarding: ready-made habit ids, and any habit they wrote themselves. */
export interface HabitChoice {
  ids: string[];
  custom: string[];
}

/**
 * The picked habits, stamped with today's date (so missed days count from the start, not from the first tick)
 * and tied to the user's values when they chose the matching one.
 */
function starterHabits(choice: HabitChoice, valueIds: string[]): BinaryHabit[] {
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

export const FOCUS_AREAS = [
  { id: "work", label: "العمل والمسار المهني" },
  { id: "study", label: "الدراسة والاختبارات" },
  { id: "business", label: "مشروع خاص" },
  { id: "skill", label: "تعلّم مهارة أو لغة" },
] as const;

export type FocusAreaId = (typeof FOCUS_AREAS)[number]["id"];

const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalDateString(tomorrow);
};

const INITIAL_EVENTS: CalendarEventItem[] = [];

const INITIAL_TIME_ENTRIES: TimeEntryItem[] = [];

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
function migrateLegacyAudits(audits: WeekAuditItem[]): WeekAuditItem[] {
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

const INITIAL_SKILLS: SkillProjectItem[] = [];

const INITIAL_SYMBOLISM_LOGS: SymbolismLogItem[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Current Station Navigation
      currentStation: "DAY_FOCUS",
      setCurrentStation: (station) => set({ currentStation: station }),

      // 1. Neuro-Gate
      neuroGatePassed: false,
      neuroGateDate: null,
      neuroGateSkipped: false,
      breathCompleted: false,
      gazeCompleted: false,
      passNeuroGate: () => {
        const today = toLocalDateString();
        set({
          neuroGatePassed: true,
          neuroGateSkipped: false,
          neuroGateDate: today,
          breathCompleted: true,
          gazeCompleted: true,
          currentStation: "DAY_FOCUS",
        });
      },
      skipNeuroGate: () => {
        const today = toLocalDateString();
        set({
          neuroGatePassed: false,
          neuroGateSkipped: true,
          neuroGateDate: today,
          currentStation: "DAY_FOCUS",
        });
      },
      resetNeuroGate: () => {
        set({
          neuroGatePassed: false,
          neuroGateSkipped: false,
          breathCompleted: false,
          gazeCompleted: false,
          currentStation: "NEURO_GATE",
        });
      },
      setBreathCompleted: (val) => set({ breathCompleted: val }),
      setGazeCompleted: (val) => set({ gazeCompleted: val }),

      // 2. 3-Frog Planner & Daily Rollover
      currentDay: toLocalDateString(),
      tomorrowFrogs: null,
      activeFrogId: null,
      setTomorrowFrogs: (tomorrowFrogs) => set({ tomorrowFrogs }),
      rolloverIfNewDay: () => {
        const today = toLocalDateString();
        const state = get();
        if (state.currentDay !== today) {
          const nextFrogs =
            state.tomorrowFrogs && state.tomorrowFrogs.length > 0
              ? state.tomorrowFrogs.map((f, idx) => ({
                  ...f,
                  isCompleted: false,
                  order: idx + 1,
                }))
              : // No plan for today: carry what was left unfinished — never yesterday's finished work.
                state.frogs.filter((f) => !f.isCompleted).map((f, idx) => ({ ...f, order: idx + 1, rolloverCount: (f.rolloverCount ?? 0) + 1 }));
          // Unfinished tasks of an open anchor always roll over under it, even when tomorrow was planned.
          const planned = new Set(nextFrogs.flatMap((f) => [f.id, f.projectTaskId].filter(Boolean)));
          const anchorCarry =
            state.tomorrowFrogs && state.tomorrowFrogs.length > 0
              ? state.frogs
                  .filter((f) => !f.isCompleted && !f.isDropped && f.anchorId && state.anchors.some((a) => a.id === f.anchorId && !a.closedAt))
                  .filter((f) => !planned.has(f.id) && !(f.projectTaskId && planned.has(f.projectTaskId)))
                  .map((f) => ({ ...f, order: nextFrogs.length + 1, rolloverCount: (f.rolloverCount ?? 0) + 1 }))
              : [];

          const isNeuroDoneToday =
            state.neuroGateDate === today && (state.neuroGatePassed || state.neuroGateSkipped);
          // Mandatory morning Neuro-Gate is between 04:00 and 10:00 AM only.
          const hour = new Date().getHours();
          const isMorning = hour >= 4 && hour < 10;

          const closedDay: FrogDayRecord = {
            date: state.currentDay,
            frogs: state.frogs.map(({ id, title, order, isCompleted, completedAt, projectId, skillId, category, energyTag, definitionOfDone, isRerouted, isDropped, dropReason, anchorId, rolloverCount }) => ({
              id,
              title,
              order,
              category,
              completedAt: isCompleted ? completedAt ?? `${state.currentDay}T12:00:00` : undefined,
              ...(projectId ? { projectId } : {}),
              ...(skillId ? { skillId } : {}),
              ...(energyTag ? { energyTag } : {}),
              ...(definitionOfDone ? { definitionOfDone } : {}),
              ...(isRerouted ? { isRerouted } : {}),
              ...(isDropped ? { isDropped } : {}),
              ...(dropReason ? { dropReason } : {}),
              ...(anchorId ? { anchorId } : {}),
              ...(rolloverCount ? { rolloverCount } : {}),
            })),
          };

          const closedHabits = new Set([
            ...(state.habitHistory[state.currentDay] ?? []),
            ...state.binaryHabits.filter((h) => h.isCompleted).map((h) => h.id),
          ]);

          set({
            currentDay: today,
            habitHistory: closedHabits.size ? { ...state.habitHistory, [state.currentDay]: [...closedHabits] } : state.habitHistory,
            frogHistory: [closedDay, ...state.frogHistory.filter((d) => d.date !== state.currentDay)].slice(0, 400),
            frogs: groupByAnchor([...nextFrogs, ...anchorCarry], state.anchors).map((f) => ({ ...f, completedAt: undefined })),
            tomorrowFrogs: null,
            activeFrogId: null,
            binaryHabits: state.binaryHabits.map((h) => ({ ...h, isCompleted: false })),
            fourGates: {
              khatarat: false,
              nazharat: false,
              lafadhat: false,
              khotuwat: false,
            },
            completedDeepWorkSessions: 0,
            isEveningLocked: false,
            ...(!isNeuroDoneToday && isMorning
              ? {
                  currentStation: "NEURO_GATE",
                  neuroGatePassed: false,
                  neuroGateSkipped: false,
                  breathCompleted: false,
                  gazeCompleted: false,
                }
              : {}),
          });
        } else {
          if (
            state.neuroGateDate !== today &&
            !state.neuroGatePassed &&
            !state.neuroGateSkipped &&
            new Date().getHours() >= 4 &&
            new Date().getHours() < 10
          ) {
            set({ currentStation: "NEURO_GATE" });
          }
        }
      },
      getCurrentFrog: () => {
        const { frogs, activeFrogId } = get();
        if (activeFrogId) {
          const active = frogs.find((f) => f.id === activeFrogId && !f.isCompleted);
          if (active) return active;
        }
        const byOrder = [...frogs].sort((a, b) => a.order - b.order);
        return byOrder.find((f) => !f.isCompleted) || byOrder[byOrder.length - 1];
      },
      reorderFrog: (id, toIndex) => {
        const list = [...get().frogs].sort((a, b) => a.order - b.order);
        const from = list.findIndex((f) => f.id === id);
        if (from < 0) return;
        const [moved] = list.splice(from, 1);
        list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, moved);
        // A task moves within its anchor's group only; grouping snaps a move past the group back to its edge.
        set({ frogs: groupByAnchor(list.map((f, i) => ({ ...f, order: i + 1 })), get().anchors) });
      },
      frogs: INITIAL_FROGS,
      previousFrogs: null,
      isEveningLocked: false,
      eveningCommittedDate: null,
      addFrog: (title, order, category, links) => {
        const newFrog: FrogTask = {
          id: `frog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title,
          order,
          category,
          isCompleted: false,
          createdAt: new Date().toISOString(),
          ...(links?.projectId ? { projectId: links.projectId } : {}),
          ...(links?.skillId ? { skillId: links.skillId } : {}),
        };
        const filtered = get().frogs.filter((f) => f.order !== order || f.isCompleted);
        const taken = filtered.some((f) => f.order === order);
        const placed = taken ? { ...newFrog, order: Math.max(...filtered.map((f) => f.order)) + 1 } : newFrog;
        const updated = [...filtered, placed].sort((a, b) => a.order - b.order);
        set({ frogs: updated });
      },
      appendFrog: (title, category, links = {}) => {
        const frogs = get().frogs;
        if (frogs.filter((f) => !f.isCompleted && !f.isDropped).length >= MAX_OPEN_TODAY) return { ok: false, message: FULL_DAY };
        const id = `frog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const frog: FrogTask = {
          id,
          title: title.trim(),
          order: frogs.length ? Math.max(...frogs.map((f) => f.order)) + 1 : 1,
          category,
          isCompleted: false,
          createdAt: new Date().toISOString(),
          ...(links.projectId ? { projectId: links.projectId } : {}),
          ...(links.skillId ? { skillId: links.skillId } : {}),
          ...(links.projectTaskId ? { projectTaskId: links.projectTaskId } : {}),
        };
        set({ frogs: [...frogs, frog] });
        return { ok: true, id };
      },
      anchors: [],
      addAnchor: ({ title, projectId, goal, targetDate }) => {
        const open = get().anchors.filter((a) => !a.closedAt);
        if (open.length >= MAX_ANCHORS) return { ok: false, message: "ثلاث أولويات ثابتة كحد أقصى. أغلق واحدة أولاً." };
        if (open.some((a) => a.projectId === projectId)) return { ok: false, message: "هذا المشروع مرتبط بأولوية ثابتة بالفعل." };
        if (!title.trim()) return { ok: false, message: "اكتب اسم الأولوية." };
        const anchor: AnchorPriority = {
          id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: title.trim(),
          projectId,
          goal: goal.trim(),
          ...(targetDate ? { targetDate } : {}),
          order: open.length ? Math.max(...open.map((a) => a.order)) + 1 : 1,
          createdAt: new Date().toISOString(),
        };
        set({ anchors: [...get().anchors, anchor] });
        return { ok: true };
      },
      updateAnchor: (id, updates) => set({ anchors: get().anchors.map((a) => (a.id === id ? { ...a, ...updates } : a)) }),
      closeAnchor: (id) => {
        const anchors = get().anchors.map((a) => (a.id === id ? { ...a, closedAt: new Date().toISOString() } : a));
        set({ anchors, frogs: groupByAnchor(get().frogs, anchors) });
      },
      moveAnchor: (id, toIndex) => {
        const open = get().anchors.filter((a) => !a.closedAt).sort((a, b) => a.order - b.order);
        const from = open.findIndex((a) => a.id === id);
        if (from < 0) return;
        const [moved] = open.splice(from, 1);
        open.splice(Math.max(0, Math.min(toIndex, open.length)), 0, moved);
        const order = new Map(open.map((a, i) => [a.id, i + 1]));
        const anchors = get().anchors.map((a) => (order.has(a.id) ? { ...a, order: order.get(a.id)! } : a));
        set({ anchors, frogs: groupByAnchor(get().frogs, anchors) });
      },
      pullAnchorTask: (anchorId, taskId) => {
        const state = get();
        const anchor = state.anchors.find((a) => a.id === anchorId && !a.closedAt);
        const project = useProjectsStore.getState().projects.find((p) => p.id === anchor?.projectId);
        const task = project?.tasks.find((t) => t.id === taskId);
        if (!anchor || !project || !task) return { ok: false, message: "لم أجد المهمة." };
        if (state.frogs.some((f) => f.projectTaskId === taskId && !f.isCompleted && !f.isDropped)) {
          return { ok: false, message: "هذه المهمة ضمن اليوم بالفعل." };
        }
        if (state.frogs.filter((f) => !f.isCompleted && !f.isDropped).length >= MAX_OPEN_TODAY) return { ok: false, message: FULL_DAY };
        if (state.frogs.filter((f) => f.anchorId === anchorId && !f.isCompleted && !f.isDropped).length >= MAX_TASKS_PER_ANCHOR) {
          return { ok: false, message: `${MAX_TASKS_PER_ANCHOR} مهام مفتوحة تحت هذه الأولوية. أنجز واحدة أولاً.` };
        }
        const frog: FrogTask = {
          id: `frog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: task.title,
          order: state.frogs.length + 1,
          category: task.quadrant === "EMERGENCY" ? "EMERGENCY" : "QUALITY",
          isCompleted: false,
          createdAt: new Date().toISOString(),
          projectId: project.id,
          projectTaskId: taskId,
          anchorId,
          ...(project.skillIds?.length === 1 ? { skillId: project.skillIds[0] } : {}),
        };
        set({ frogs: groupByAnchor([...state.frogs, frog], state.anchors) });
        if (task.status === "TODO") useProjectsStore.getState().setTaskStatus(project.id, taskId, "DOING");
        return { ok: true };
      },
      addFrogFromProjectTask: (projectId, taskId) => {
        const state = get();
        const project = useProjectsStore.getState().projects.find((p) => p.id === projectId);
        const task = project?.tasks.find((t) => t.id === taskId);
        if (!project || !task) return { ok: false, message: "لم أجد المهمة." };
        if (state.frogs.some((f) => f.projectTaskId === taskId && !f.isCompleted)) {
          return { ok: false, message: "هذه المهمة ضمن أولويات اليوم بالفعل." };
        }
        // Only one skill can be inferred safely: a project needing several leaves the choice to the user.
        const skillId = project.skillIds?.length === 1 ? project.skillIds[0] : undefined;
        const res = state.appendFrog(task.title, task.quadrant === "EMERGENCY" ? "EMERGENCY" : "QUALITY", {
          projectId,
          skillId,
          projectTaskId: taskId,
        });
        if (!res.ok) return res;
        if (task.status === "TODO") useProjectsStore.getState().setTaskStatus(projectId, taskId, "DOING");
        return { ok: true };
      },
      syncFrogWithProjectTask: (taskId, done) => {
        set({
          frogs: get().frogs.map((f) =>
            f.projectTaskId === taskId && f.isCompleted !== done
              ? { ...f, isCompleted: done, completedAt: done ? new Date().toISOString() : undefined }
              : f
          ),
        });
      },
      updateFrog: (id, updates) => {
        set({
          frogs: get().frogs.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        });
      },
      toggleFrog: (id) => {
        const state = get();
        const target = state.frogs.find((f) => f.id === id);
        if (!target) return;

        const isLocked = Boolean(
          state.activeFrogId &&
          state.frogs.some((f) => f.id === state.activeFrogId && !f.isCompleted)
        );

        // Guard: while locked, only allow completing the active frog, or uncompleting an already completed frog
        if (isLocked && !target.isCompleted && state.activeFrogId !== id) {
          return;
        }

        const willBeCompleted = !target.isCompleted;
        if (target.projectId && target.projectTaskId) {
          const projects = useProjectsStore.getState();
          const exists = projects.projects
            .find((p) => p.id === target.projectId)
            ?.tasks.some((t) => t.id === target.projectTaskId);
          if (exists) projects.setTaskStatus(target.projectId, target.projectTaskId, willBeCompleted ? "DONE" : "DOING");
        }
        const shouldUnlock = state.activeFrogId === id && willBeCompleted;
        const lastToday = state.focusSessions.find((s) => toLocalDateString(new Date(s.endedAt)) === toLocalDateString());
        const sessionMinutes = lastToday?.plannedMinutes ?? FOCUS_MODE_MINUTES[state.focusMode] ?? 90;

        set({
          breakOffer:
            willBeCompleted && !state.breakEndsAt && !(state.lastBreakEndedAt && Date.now() - state.lastBreakEndedAt < 10 * 60000)
              ? { minutes: breakMinutesFor(sessionMinutes), frogTitle: target.title }
              : null,
          lastActiveDate: toLocalDateString(),
          activeFrogId: shouldUnlock ? null : state.activeFrogId,
          frogs: state.frogs.map((f) =>
            f.id === id
              ? { ...f, isCompleted: willBeCompleted, completedAt: willBeCompleted ? new Date().toISOString() : undefined }
              : f
          ),
        });
      },
      frogHistory: [],
      getWeeklyFrogStats: (week) => {
        const { frogHistory, frogs, currentDay } = get();
        const inWeek = (d: Date) => isInWeek(d, week);
        const fromDay = (day: string) => {
          const [y, m, d] = day.split("-").map(Number);
          return new Date(y, m - 1, d);
        };

        const days: FrogDayRecord[] = [
          {
            date: currentDay,
            frogs: frogs.map((f) => ({
              ...f,
              completedAt: f.isCompleted ? f.completedAt ?? `${currentDay}T12:00:00` : undefined,
            })),
          },
          ...frogHistory.filter((d) => d.date !== currentDay),
        ].filter((d) => inWeek(fromDay(d.date)));

        const total = days.reduce((a, d) => a + d.frogs.length, 0);
        const items = days
          .flatMap((d) => d.frogs)
          .filter((f): f is typeof f & { completedAt: string } => Boolean(f.completedAt) && inWeek(new Date(f.completedAt!)))
          .map(({ id, title, completedAt }) => ({ id, title, completedAt }))
          .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
        const done = items.length;
        return { done, total, rate: total ? Math.round((done / total) * 100) : 0, items };
      },
      deleteFrog: (id) => {
        const state = get();
        set({
          activeFrogId: state.activeFrogId === id ? null : state.activeFrogId,
          frogs: state.frogs.filter((f) => f.id !== id),
        });
      },
      commitEveningPlan: () => {
        const today = toLocalDateString();
        set({
          isEveningLocked: true,
          eveningCommittedDate: today,
        });
      },
      unlockMorningOverride: () => {
        set({ isEveningLocked: false });
      },
      setFluencyWeekFrogs: () => {
        const { frogs, activeFrogId } = get();
        const hasActiveLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
        if (hasActiveLocked) return;

        const isFluency = frogs.some((f) => f.id.startsWith("frog-fluency"));
        if (!isFluency && frogs.length > 0) {
          set({
            previousFrogs: frogs,
            frogs: FLUENCY_WEEK_FROGS,
          });
        } else {
          set({ frogs: FLUENCY_WEEK_FROGS });
        }
      },
      restorePreviousFrogs: () => {
        const { frogs, activeFrogId, previousFrogs } = get();
        const hasActiveLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
        if (hasActiveLocked) return;

        if (previousFrogs && previousFrogs.length > 0) {
          set({
            previousFrogs: frogs,
            frogs: previousFrogs,
          });
        } else {
          set({
            previousFrogs: frogs,
            frogs: STANDARD_FROGS,
          });
        }
      },
      resetToStandardFrogs: () => {
        const { frogs, activeFrogId } = get();
        const hasActiveLocked = Boolean(activeFrogId && frogs.some((f) => f.id === activeFrogId && !f.isCompleted));
        if (hasActiveLocked) return;

        set({
          previousFrogs: get().frogs,
          frogs: STANDARD_FROGS,
        });
      },

      // Hyper-Focus Engine
      // A new user starts with 25 minutes; the 90-minute block is suggested once three sessions are complete.
      focusSecondsRemaining: 25 * 60,
      isFocusRunning: false,
      focusEndsAt: null,
      focusMode: "WORDS_25",
      distractions: [],
      completedDeepWorkSessions: 0,
      focusStartedAt: null,
      focusCommitment: "",
      focusSessions: [],
      pendingSessionReviewId: null,
      focusStreak: 0,
      bestFocusStreak: 0,
      focusStreakAtRisk: false,
      deepSessionNudgeDone: false,
      answerDeepSessionNudge: (tryDeep) => {
        set({ deepSessionNudgeDone: true });
        if (tryDeep && !get().isFocusRunning) get().resetFocus("WORK_90");
      },
      startFocus: (commitment) => {
        const state = get();
        const current = state.getCurrentFrog();
        const hasValidActive = state.activeFrogId && state.frogs.some((f) => f.id === state.activeFrogId && !f.isCompleted);
        const activeFrogId = hasValidActive ? state.activeFrogId : (current ? current.id : null);
        const now = Date.now();
        set({
          isFocusRunning: true,
          focusStartedAt: now,
          focusEndsAt: now + state.focusSecondsRemaining * 1000,
          focusCommitment: commitment.trim(),
          lastActiveDate: toLocalDateString(),
          activeFrogId,
          breakEndsAt: null,
          breakOffer: null,
          lastBreakEndedAt: null,
        });
      },
      finishFocusSession: ({ completed, outcome, earlyExitReason }) => {
        const s = get();
        const plannedMinutes = FOCUS_MODE_MINUTES[s.focusMode] ?? 90;
        const now = Date.now();
        const remaining = s.focusEndsAt ? Math.max(0, Math.ceil((s.focusEndsAt - now) / 1000)) : s.focusSecondsRemaining;
        const endedAtMs = remaining === 0 && s.focusEndsAt ? s.focusEndsAt : now;
        const actualMinutes = Math.max(0, Math.round((plannedMinutes * 60 - remaining) / 60));
        const startedAtMs = s.focusStartedAt ?? endedAtMs - actualMinutes * 60000;
        const frog = s.getCurrentFrog();

        if (actualMinutes >= 1) {
          s.logTimeEntry({
            taskId: frog?.id,
            taskTitle: frog?.title ?? s.focusCommitment,
            category: frog?.category ?? "QUALITY",
            durationMinutes: actualMinutes,
            startTime: new Date(startedAtMs).toISOString(),
            endTime: new Date(endedAtMs).toISOString(),
            notes: completed ? `جلسة كاملة: ${s.focusCommitment}` : `جلسة مقطوعة: ${earlyExitReason ?? ""}`,
            ...(frog?.projectId ? { projectId: frog.projectId } : {}),
            ...(frog?.skillId ? { skillId: frog.skillId } : {}),
          });
        }

        // Focus spent on a skill-linked priority is practice: it counts toward the skill's first 20 hours.
        if (actualMinutes >= 1 && frog?.skillId && s.skills.some((sk) => sk.id === frog.skillId)) {
          s.addSkillLoggedTime(frog.skillId, actualMinutes / 60);
        }

        const session: FocusSessionLog = {
          id: `fs-${now}`,
          startedAt: new Date(startedAtMs).toISOString(),
          endedAt: new Date(endedAtMs).toISOString(),
          plannedMinutes,
          actualMinutes,
          commitment: s.focusCommitment,
          taskId: frog?.id,
          taskTitle: frog?.title,
          completed,
          outcome: outcome ?? null,
          earlyExitReason,
          ...(frog?.projectId ? { projectId: frog.projectId } : {}),
          ...(frog?.skillId ? { skillId: frog.skillId } : {}),
        };
        // Never miss twice: a slip puts the streak at risk, the next full session saves it, a second slip resets it.
        // An interruption the user could not prevent is not a slip at all.
        let streak = s.focusStreak;
        let atRisk = s.focusStreakAtRisk;
        if (completed) {
          streak += 1;
          atRisk = false;
        } else if (earlyExitReason !== EXTERNAL_INTERRUPTION) {
          if (atRisk) {
            streak = 0;
            atRisk = false;
          } else {
            atRisk = streak > 0;
          }
        }

        set({
          focusSessions: [session, ...s.focusSessions].slice(0, 500),
          focusStreak: streak,
          focusStreakAtRisk: atRisk,
          bestFocusStreak: Math.max(s.bestFocusStreak, streak),
          completedDeepWorkSessions: s.completedDeepWorkSessions + (completed ? 1 : 0),
          pendingSessionReviewId: completed && !outcome ? session.id : null,
          isFocusRunning: false,
          focusEndsAt: null,
          focusStartedAt: null,
          focusCommitment: "",
          focusSecondsRemaining: plannedMinutes * 60,
        });

        // The variable reward is earned by completion only; an unrated completion rolls after its review.
        // A full session is the "deep focus session" habit done: tick it for today (the user can untick it).
        const focusHabit = completed ? get().binaryHabits.find((h) => h.id === FOCUS_HABIT_ID && !h.archived) : undefined;
        if (focusHabit && !get().habitHistory[get().currentDay]?.includes(focusHabit.id)) {
          get().setHabitDay(focusHabit.id, get().currentDay, true);
        }

        if (completed && outcome) get().rollVariableReward();
      },
      breakEndsAt: null,
      breakMinutes: 0,
      lastBreakEndedAt: null,
      breakOffer: null,
      startBreak: (minutes) => {
        if (get().isFocusRunning) return;
        set({ breakEndsAt: Date.now() + minutes * 60000, breakMinutes: minutes, breakOffer: null, lastBreakEndedAt: null });
      },
      endBreak: () => set({ breakEndsAt: null, lastBreakEndedAt: Date.now() }),
      dismissBreakOffer: () => set({ breakOffer: null }),
      repeatLastSession: () => {
        const s = get();
        const last = s.focusSessions[0];
        if (!last || s.isFocusRunning) return false;
        const mode = (Object.keys(FOCUS_MODE_MINUTES) as FocusTimerMode[]).find(
          (m) => FOCUS_MODE_MINUTES[m] === last.plannedMinutes
        );
        const taskStillOpen = s.frogs.some((f) => f.id === last.taskId && !f.isCompleted);
        if (taskStillOpen) set({ activeFrogId: last.taskId });
        s.resetFocus(mode ?? "WORK_90");
        get().startFocus(last.commitment || last.taskTitle || "");
        return true;
      },
      rateFocusSession: (outcome) => {
        const id = get().pendingSessionReviewId;
        if (!id) return;
        set({
          pendingSessionReviewId: null,
          focusSessions: get().focusSessions.map((x) => (x.id === id ? { ...x, outcome } : x)),
        });
        get().rollVariableReward();
      },
      resetFocus: (mode = "WORK_90") => {
        const durations: Record<FocusTimerMode, number> = {
          WORK_90: 90 * 60,
          WORK_60: 60 * 60,
          WORK_45: 45 * 60,
          FLUENCY_15: 15 * 60,
          WORDS_25: 25 * 60,
          KICKOFF_10: 10 * 60,
          MICRO_BREAK: 10,
          DMN_STILLNESS: 15 * 60,
        };
        set({
          focusMode: mode,
          focusSecondsRemaining: durations[mode] ?? 90 * 60,
          isFocusRunning: false,
          focusEndsAt: null,
          focusStartedAt: null,
        });
      },
      tickFocus: () => {
        const { focusEndsAt, focusSecondsRemaining } = get();
        // Derived from wall-clock time: the browser throttles intervals while the window is minimized.
        const current = focusEndsAt ? Math.ceil((focusEndsAt - Date.now()) / 1000) : focusSecondsRemaining - 1;
        if (current <= 0) {
          if (FOCUS_MODE_MINUTES[get().focusMode]) {
            get().finishFocusSession({ completed: true });
          } else {
            set({ focusSecondsRemaining: 0, isFocusRunning: false, focusEndsAt: null });
          }
        } else if (current !== focusSecondsRemaining) {
          set({ focusSecondsRemaining: current });
        }
      },
      addDistraction: (thought) => {
        if (!thought.trim()) return;
        set({ distractions: [thought.trim(), ...get().distractions] });
      },
      removeDistraction: (index) => {
        set({
          distractions: get().distractions.filter((_, i) => i !== index),
        });
      },
      clearDistractions: () => set({ distractions: [] }),

      // Production & Fluency Week Lab
      fluencyPractice: INITIAL_FLUENCY_PRACTICE,
      updateFluencyPractice: (updates) => {
        set({
          fluencyPractice: { ...get().fluencyPractice, ...updates },
        });
      },

      // Task-Linked Time Tracking
      timeEntries: INITIAL_TIME_ENTRIES,
      logTimeEntry: (entry) => {
        const newEntry: TimeEntryItem = {
          ...entry,
          id: `te-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
        };
        set({ timeEntries: [newEntry, ...get().timeEntries] });
      },
      logEscapeMinutes: (minutes, notes = "وقت مشتّت") => {
        const now = Date.now();
        get().logTimeEntry({
          category: "ESCAPE",
          durationMinutes: minutes,
          startTime: new Date(now - minutes * 60000).toISOString(),
          endTime: new Date(now).toISOString(),
          notes,
        });
      },
      getWeeklyAggregatedMinutes: (week) => {
        const entries = get().timeEntries.filter((te) => isInWeek(new Date(te.startTime), week));
        let qualityMinutes = 0;
        let escapeMinutes = 0;
        let emergencyMinutes = 0;
        let delegateMinutes = 0;

        for (const te of entries) {
          if (te.category === "QUALITY") qualityMinutes += te.durationMinutes;
          else if (te.category === "ESCAPE") escapeMinutes += te.durationMinutes;
          else if (te.category === "EMERGENCY") emergencyMinutes += te.durationMinutes;
          else if (te.category === "DELEGATE") delegateMinutes += te.durationMinutes;
        }

        return {
          qualityMinutes,
          escapeMinutes,
          emergencyMinutes,
          delegateMinutes,
        };
      },

      // Horizon Planning Events Calendar
      events: INITIAL_EVENTS,
      addEvent: (entry) => {
        const newEvent: CalendarEventItem = {
          ...entry,
          id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
        };
        set({ events: [...get().events, newEvent].sort((a, b) => a.date.localeCompare(b.date)) });
      },
      deleteEvent: (id) => {
        set({ events: get().events.filter((e) => e.id !== id) });
      },
      getTomorrowEvents: () => {
        const tomorrowStr = getTomorrowDateString();
        return get().events.filter((e) => e.date === tomorrowStr);
      },

      // Impulse Delay Vault
      vaultItems: [],
      addVaultItem: (title, delayHours) => {
        const now = Date.now();
        const item: VaultItem = {
          id: `vault-${now}`,
          impulseTitle: title,
          delayHours,
          lockedAt: now,
          unlocksAt: now + delayHours * 60 * 60 * 1000,
          isResolved: false,
        };
        set({ lastActiveDate: toLocalDateString(), vaultItems: [item, ...get().vaultItems] });
      },
      resolveVaultItem: (id, actionTaken) => {
        set({
          vaultItems: get().vaultItems.map((item) =>
            item.id === id ? { ...item, isResolved: true, actionTaken } : item
          ),
        });
      },

      // Agile Reroute
      rerouteHistory: [],
      addRerouteEvent: (event) => {
        const newEvent: RerouteEvent = {
          ...event,
          id: `reroute-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        };
        set({
          rerouteHistory: [newEvent, ...(get().rerouteHistory || [])],
        });
      },

      // Evening Quality Gate
      eveningQualityCheck: {},
      setEveningQualityCheck: (date, passed) => {
        set({
          eveningQualityCheck: {
            ...(get().eveningQualityCheck || {}),
            [date]: passed,
          },
        });
      },

      // 3. Evening Closure Station
      binaryHabits: INITIAL_BINARY_HABITS,
      habitHistory: {},
      toggleBinaryHabit: (id) => {
        const habit = get().binaryHabits.find((h) => h.id === id);
        if (habit) get().setHabitDay(id, get().currentDay, !habit.isCompleted);
      },
      setHabitDay: (id, date, done) => {
        const state = get();
        const day = new Set(state.habitHistory[date] ?? []);
        if (done) day.add(id);
        else day.delete(id);
        const habitHistory = { ...state.habitHistory };
        if (day.size) habitHistory[date] = [...day];
        else delete habitHistory[date];
        set({
          habitHistory,
          lastActiveDate: toLocalDateString(),
          ...(date === state.currentDay
            ? { binaryHabits: state.binaryHabits.map((h) => (h.id === id ? { ...h, isCompleted: done } : h)) }
            : {}),
        });
      },
      addBinaryHabit: (title, input = {}) => {
        if (!title.trim()) return;
        const clean = Object.fromEntries(
          Object.entries(input).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
        ) as HabitInput;
        set({
          binaryHabits: [
            ...get().binaryHabits,
            {
              id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: title.trim(),
              isCompleted: false,
              createdAt: new Date().toISOString(),
              ...clean,
            },
          ],
        });
      },
      updateHabit: (id, updates) => {
        const state = get();
        const habit = state.binaryHabits.find((h) => h.id === id);
        if (!habit) return;
        // Restoring from the archive is never a "change"; everything else waits out the commitment.
        const restoring = Object.keys(updates).length === 1 && updates.archived === false;
        if (!restoring && habitLock(habit, state.habitHistory, state.currentDay).locked) return;
        set({ binaryHabits: state.binaryHabits.map((h) => (h.id === id ? { ...h, ...updates } : h)) });
      },
      removeBinaryHabit: (id) => {
        const state = get();
        const habit = state.binaryHabits.find((h) => h.id === id);
        if (habit && !habit.archived && habitLock(habit, state.habitHistory, state.currentDay).locked) return;
        set({ binaryHabits: state.binaryHabits.filter((h) => h.id !== id) });
      },
      identityVotes: [],
      addIdentityVote: (voteText) => {
        const today = toLocalDateString();
        const newVote: IdentityVoteItem = {
          id: `vote-${Date.now()}`,
          date: today,
          voteText,
        };
        set({
          lastActiveDate: toLocalDateString(),
          identityVotes: [newVote, ...get().identityVotes],
        });
      },

      // CBT Triangle
      cbtLogs: [],
      addCbtLog: (entry) => {
        const newEntry: CbtLogEntry = {
          ...entry,
          id: `cbt-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set({ lastActiveDate: toLocalDateString(), cbtLogs: [newEntry, ...get().cbtLogs] });
      },

      // Values & Constitution
      values: [],
      updateCoreValue: (id, updates) => {
        set({
          values: get().values.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        });
      },
      addCoreValue: (value) => {
        const values = get().values;
        if (values.some((v) => v.id === value.id)) return;
        set({ values: [...values, { ...value, order: values.length + 1 }] });
      },
      removeCoreValue: (id) => {
        set({
          values: get()
            .values.filter((v) => v.id !== id)
            .map((v, i) => ({ ...v, order: i + 1 })),
        });
      },
      beliefAudits: INITIAL_BELIEF_AUDITS,
      addBeliefAudit: (item) => {
        const newAudit: BeliefAuditItem = {
          ...item,
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
        };
        set({ beliefAudits: [newAudit, ...get().beliefAudits] });
      },
      deleteBeliefAudit: (id) => {
        set({ beliefAudits: get().beliefAudits.filter((b) => b.id !== id) });
      },
      reframedStories: INITIAL_REFRAMED_STORIES,
      addReframedStory: (item) => {
        const newStory: ReframedStoryItem = {
          ...item,
          id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
        };
        set({ reframedStories: [newStory, ...get().reframedStories] });
      },
      goalIdentities: INITIAL_GOAL_IDENTITIES,
      addGoalIdentity: (item) => {
        const newGI: GoalToIdentityItem = {
          ...item,
          id: `gi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: new Date().toISOString(),
        };
        set({ goalIdentities: [newGI, ...get().goalIdentities] });
      },
      deleteGoalIdentity: (id) => {
        set({ goalIdentities: get().goalIdentities.filter((g) => g.id !== id) });
      },

      // 52-Week Audit
      weeklyAudits: weeksOfYear([], weekOf().year),
      submitWeeklyAudit: (week, escapeHours, completionRate, actionLevel, notes) => {
        const colorStatus = computeWeekColor(completionRate, actionLevel);
        const match = (w: WeekAuditItem) => w.year === week.year && w.weekNumber === week.week;
        const audits = get().weeklyAudits.some(match) ? get().weeklyAudits : [...get().weeklyAudits, pendingWeek(week)];

        set({
          lastActiveDate: toLocalDateString(),
          weeklyAudits: audits.map((w) =>
            match(w)
              ? {
                  ...w,
                  escapeHoursTotal: escapeHours,
                  completionRate,
                  actionLevel,
                  colorStatus,
                  notes,
                  rewardClaimed: false,
                }
              : w
          ),
        });
      },
      claimWeeklyReward: (week) => {
        set({
          weeklyAudits: get().weeklyAudits.map((w) =>
            w.year === week.year && w.weekNumber === week.week ? { ...w, rewardClaimed: true } : w
          ),
        });
      },

      // Flywheel Recovery
      lastActiveDate: toLocalDateString(),
      hasSeenRecoveryPrompt: false,
      recordActivity: () => {
        const today = toLocalDateString();
        set({ lastActiveDate: today });
      },
      // Dismissing counts as "seen today" so the banner re-arms after the next absence
      dismissRecovery: () =>
        set({ hasSeenRecoveryPrompt: true, lastActiveDate: toLocalDateString() }),
      performKaizenReset: () => {
        const today = toLocalDateString();
        set({
          hasSeenRecoveryPrompt: true,
          lastActiveDate: today,
          focusMode: "FLUENCY_15",
          focusSecondsRemaining: 15 * 60,
          isFocusRunning: false,
          focusEndsAt: null,
        });
      },

      // Meta-Learning 3-Column Organizer & Anti Method-Hopping Lock
      skills: INITIAL_SKILLS,
      addSkillProject: (title, targetHours = 20) => {
        const currentSkills = get().skills;
        // Anti Method-Hopping Check: If any active locked track has < 20 logged hours
        const hasUnfinishedLocked = currentSkills.some(
          (s) => s.isLocked && s.loggedHours < s.targetHours
        );
        if (hasUnfinishedLocked) {
          return {
            success: false,
            message:
              "تحذير: وهم التخطيط والدوران على المناهج — العقل الكسول يهرب بالبحث الدائم عن مصادر جديدة بدلاً من إتمام ما بين يديه. أنهِ الـ 20 ساعة المقررة في مساراتك الحالية أولاً.",
          };
        }

        const newProj: SkillProjectItem = {
          id: "skill-" + Date.now(),
          title,
          targetHours,
          loggedHours: 0,
          isLocked: true,
          lockEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          elements: [],
          createdAt: new Date().toISOString(),
        };

        set({ skills: [...currentSkills, newProj] });
        return { success: true };
      },

      addSkillElement: (projectId, category, content) => {
        set({
          skills: get().skills.map((s) =>
            s.id === projectId
              ? {
                  ...s,
                  elements: [
                    ...s.elements,
                    {
                      id: "el-" + Date.now(),
                      projectId,
                      category,
                      content,
                      isMastered: false,
                    },
                  ],
                }
              : s
          ),
        });
      },

      toggleSkillElement: (projectId, elementId) => {
        set({
          skills: get().skills.map((s) =>
            s.id === projectId
              ? {
                  ...s,
                  elements: s.elements.map((el) =>
                    el.id === elementId ? { ...el, isMastered: !el.isMastered } : el
                  ),
                }
              : s
          ),
        });
      },

      deleteSkillElement: (projectId, elementId) => {
        set({
          skills: get().skills.map((s) =>
            s.id === projectId
              ? {
                  ...s,
                  elements: s.elements.filter((el) => el.id !== elementId),
                }
              : s
          ),
        });
      },

      addSkillLoggedTime: (projectId, hours) => {
        set({
          skills: get().skills.map((s) =>
            s.id === projectId
              ? {
                  ...s,
                  loggedHours: Math.round((s.loggedHours + hours) * 10) / 10,
                  isLocked: s.isLocked && s.loggedHours + hours < s.targetHours,
                }
              : s
          ),
        });
      },

      // Escape Symbolism Decoder
      symbolismLogs: INITIAL_SYMBOLISM_LOGS,
      addSymbolismLog: (log) => {
        const item: SymbolismLogItem = {
          ...log,
          id: "sym-" + Date.now(),
          createdAt: new Date().toISOString(),
        };
        set({ symbolismLogs: [item, ...get().symbolismLogs] });
      },

      // The 4 Ingress Gates of Ibn al-Qayyim
      fourGates: {
        khatarat: false,
        nazharat: false,
        lafadhat: false,
        khotuwat: false,
      },
      toggleFourGate: (gate) => {
        set({
          fourGates: {
            ...get().fourGates,
            [gate]: !get().fourGates[gate],
          },
        });
      },
      resetFourGates: () => {
        set({
          fourGates: {
            khatarat: false,
            nazharat: false,
            lafadhat: false,
            khotuwat: false,
          },
        });
      },

      // Variable Dopamine Reward Engine (Intermittent 35% probability)
      randomRewardAvailable: false,
      lastRewardWon: null,
      rollVariableReward: () => {
        const roll = Math.random();
        if (roll <= 0.35) {
          // The reward fits the rest the session earned: a short session's break is 5 minutes, a deep one's is 20.
          const deep = (get().focusSessions[0]?.plannedMinutes ?? 0) >= 90;
          const rewards = deep
            ? [
                "قهوة فاخرة مستحقة مع 15 دقيقة قراءة حرة دون تأنيب ضمير",
                "مشي منعش في الهواء الطلق لمدة 20 دقيقة مع بودكاست مفضل",
                "مكافأة ترفيهية خالية من الشعور بالذنب (حلقة وثائقي أو استراحة مطلقة)",
                "استحقاق جلسة استرخاء وتدليك للعضلات وتناول وجبة خفيفة ممتازة",
              ]
            : [
                "كوب شاي أو قهوة تشربه بهدوء بعيداً عن الشاشة",
                "أغنية أو مقطع تحبه تسمعه كاملاً دون مقاطعة",
                "خمس دقائق تمشٍّ وتمدّد عند النافذة",
                "وجبة خفيفة تحبها، تأكلها على مهل",
              ];
          const chosen = rewards[Math.floor(Math.random() * rewards.length)];
          set({ randomRewardAvailable: true, lastRewardWon: chosen });
          return true;
        }
        return false;
      },
      claimRandomReward: () => {
        set({ randomRewardAvailable: false });
      },
      dismissRandomReward: () => {
        set({ randomRewardAvailable: false, lastRewardWon: null });
      },

      // Quranic Himma Header
      himmaIndex: 0,
      nextHimmaVerse: () => {
        set({ himmaIndex: (get().himmaIndex + 1) % HIMMA_VERSES.length });
      },

      // Smart Buffer Time (Anti-Packing)
      bufferTimeMinutes: 30,
      setBufferTimeMinutes: (minutes) => set({ bufferTimeMinutes: minutes }),

      // Product profile, onboarding & settings
      profile: { name: "", focusArea: null },
      onboardingDone: false,
      settings: { faithContent: false, sound: true },
      setSound: (enabled) => set({ settings: { ...get().settings, sound: enabled } }),
      completeOnboarding: ({ name, focusArea, valueIds, customValues = [], priorities, faithContent, habits }) => {
        const pool = faithContent ? [FAITH_VALUE_TEMPLATE, ...VALUE_TEMPLATES] : VALUE_TEMPLATES;
        const values = [...pool.filter((v) => valueIds.includes(v.id)), ...customValues].map((v, idx) => ({ ...v, order: idx + 1 }));
        get().completeOnboardingWithTemplate({ name, focusArea, faithContent, values, priorities, habits });
      },
      completeOnboardingWithTemplate: ({ name, focusArea, faithContent, values, priorities, habits }) => {
        const now = new Date().toISOString();
        const frogs: FrogTask[] = priorities
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 3)
          .map((title, idx) => ({
            id: `frog-${Date.now()}-${idx}`,
            title,
            order: idx + 1,
            isCompleted: false,
            category: "QUALITY" as TaskCategory,
            createdAt: now,
          }));
        set({
          profile: { ...get().profile, name: name.trim(), focusArea },
          onboardingDone: true,
          settings: { ...get().settings, faithContent },
          values,
          frogs,
          activeFrogId: null,
          binaryHabits: starterHabits(habits, values.map((v) => v.id)),
          focusMode: "WORDS_25",
          focusSecondsRemaining: 25 * 60,
          currentStation: "DAY_FOCUS",
          neuroGateDate: toLocalDateString(),
          lastActiveDate: toLocalDateString(),
        });
      },
      // Habits are commitments the user chooses, so the switch only offers the faith habits (see the habit tracker).
      setFaithContent: (enabled) => set({ settings: { ...get().settings, faithContent: enabled } }),
      updateProfile: (updates) => set({ profile: { ...get().profile, ...updates } }),
      // Wipes this store; lib/stores.ts also clears the other stores and their saved copies.
      resetAllData: () => {
        useAppStore.persist.clearStorage();
        set(useAppStore.getInitialState(), true);
      },

      // Theme Management
      themeMode: "light",
      toggleTheme: () => {
        set({ themeMode: get().themeMode === "light" ? "dark" : "light" });
      },
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: "adrik-app-v1",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        if (version === 0 || !state?.version) {
          state = {
            ...state,
            currentDay: state?.currentDay ?? toLocalDateString(),
            tomorrowFrogs: state?.tomorrowFrogs ?? null,
            activeFrogId: state?.activeFrogId ?? null,
            neuroGateSkipped: state?.neuroGateSkipped ?? false,
          };
        }
        if (version < 2 && Array.isArray(state?.weeklyAudits)) {
          state = { ...state, weeklyAudits: migrateLegacyAudits(state.weeklyAudits) };
        }
        return state;
      },
    }
  )
);
