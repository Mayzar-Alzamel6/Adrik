/**
 * The main store's shapes and the small rules that go with them (limits, timer lengths, anchor grouping).
 * Split out of useAppStore.ts so the store file holds the actions only; useAppStore re-exports everything here.
 */
import type { WeekRef } from "@/lib/utils";
import type { FocusAreaId, HabitChoice } from "@/stores/app/seed";

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

export interface AppState {
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
