import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalDateString, isInWeek, weekOf } from "@/lib/utils";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { habitLock } from "@/lib/habits";
import {
  MAX_ANCHORS,
  MAX_TASKS_PER_ANCHOR,
  MAX_OPEN_TODAY,
  groupByAnchor,
  EXTERNAL_INTERRUPTION,
  FOCUS_MODE_MINUTES,
  breakMinutesFor,
  type TaskCategory,
  type FrogTask,
  type AnchorPriority,
  type FrogDayRecord,
  type RerouteEvent,
  type HabitInput,
  type TimeEntryItem,
  type CalendarEventItem,
  type VaultItem,
  type CbtLogEntry,
  type BeliefAuditItem,
  type ReframedStoryItem,
  type GoalToIdentityItem,
  type IdentityVoteItem,
  type WeekAuditItem,
  type SkillProjectItem,
  type SymbolismLogItem,
  type FocusTimerMode,
  type FocusSessionLog,
  type AppState,
} from "@/stores/app/model";
import {
  VALUE_TEMPLATES,
  FAITH_VALUE_TEMPLATE,
  INITIAL_BELIEF_AUDITS,
  INITIAL_REFRAMED_STORIES,
  INITIAL_GOAL_IDENTITIES,
  FLUENCY_WEEK_FROGS,
  STANDARD_FROGS,
  INITIAL_FROGS,
  INITIAL_FLUENCY_PRACTICE,
  INITIAL_BINARY_HABITS,
  FOCUS_HABIT_ID,
  starterHabits,
  getTomorrowDateString,
  INITIAL_EVENTS,
  INITIAL_TIME_ENTRIES,
  computeWeekColor,
  pendingWeek,
  migrateLegacyAudits,
  weeksOfYear,
  HIMMA_VERSES,
  INITIAL_SKILLS,
  INITIAL_SYMBOLISM_LOGS,
} from "@/stores/app/seed";

// Shapes, rules and starting data live in ./app; importers keep using this one path.
export * from "@/stores/app/model";
export * from "@/stores/app/seed";

const FULL_DAY = "لديك ثلاث مهام مفتوحة اليوم. أنجز واحدة أولاً، أو أرسل هذه إلى صندوق المهام.";

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
