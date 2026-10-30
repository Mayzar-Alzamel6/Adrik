import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EisenhowerCategory = "EMERGENCY" | "QUALITY" | "DELEGATE" | "ESCAPE";
/** "INBOX": captured now, sorted into a quadrant later. */
export type PlannerCategory = EisenhowerCategory | "INBOX";

export interface PlannerTask {
  id: string;
  title: string;
  category: PlannerCategory;
  isTopPriority: boolean;
  priorityOrder?: 1 | 2 | 3;
  isCompleted: boolean;
  createdAt: string;
}

export interface MentalInventory4x3 {
  gratitudes: [string, string, string]; // 3 نعم وامتنان
  cravings: [string, string, string];   // 3 اشتهاء ونزوات
  resentments: [string, string, string];// 3 استياء وأحقاد
  fears: [string, string, string];      // 3 مخاوف وقلق
}

interface PlannerState {
  tasks: PlannerTask[];
  isEveningLocked: boolean;
  eveningCommittedDate: string | null;
  digitalDetoxToday: boolean;
  mentalInventory: MentalInventory4x3;

  // Actions
  addTask: (title: string, category: PlannerCategory, isTopPriority?: boolean, priorityOrder?: 1 | 2 | 3) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTaskCategory: (id: string, category: PlannerCategory) => void;
  setTopFrog: (id: string, slot: 1 | 2 | 3) => void;
  removeTopFrog: (id: string) => void;
  commitEveningLock: () => void;
  unlockEveningOverride: () => void;
  toggleDigitalDetox: () => void;
  setMentalInventory: (inventory: Partial<MentalInventory4x3>) => void;
}

const INITIAL_TASKS: PlannerTask[] = [];

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_TASKS,
      isEveningLocked: false,
      eveningCommittedDate: null,
      digitalDetoxToday: false,
      mentalInventory: {
        gratitudes: ["", "", ""],
        cravings: ["", "", ""],
        resentments: ["", "", ""],
        fears: ["", "", ""],
      },

      addTask: (title, category, isTopPriority = false, priorityOrder) => {
        const newTask: PlannerTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: title.trim(),
          category,
          isTopPriority,
          priorityOrder,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        };
        set({ tasks: [newTask, ...get().tasks] });
      },

      toggleTask: (id) => {
        set({
          tasks: get().tasks.map((t) =>
            t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
          ),
        });
      },

      deleteTask: (id) => {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
      },

      updateTaskCategory: (id, category) => {
        set({
          tasks: get().tasks.map((t) => (t.id === id ? { ...t, category } : t)),
        });
      },

      setTopFrog: (id, slot) => {
        // Clear previous slot holder
        const tasks = get().tasks.map((t) => {
          if (t.priorityOrder === slot) {
            return { ...t, isTopPriority: false, priorityOrder: undefined };
          }
          if (t.id === id) {
            return { ...t, isTopPriority: true, priorityOrder: slot };
          }
          return t;
        });
        set({ tasks });
      },

      removeTopFrog: (id) => {
        set({
          tasks: get().tasks.map((t) =>
            t.id === id ? { ...t, isTopPriority: false, priorityOrder: undefined } : t
          ),
        });
      },

      commitEveningLock: () => {
        const today = new Date().toISOString().split("T")[0];
        set({ isEveningLocked: true, eveningCommittedDate: today });
      },

      unlockEveningOverride: () => {
        set({ isEveningLocked: false });
      },

      toggleDigitalDetox: () => {
        set((state) => ({ digitalDetoxToday: !state.digitalDetoxToday }));
      },

      setMentalInventory: (inventory) => {
        set((state) => ({
          mentalInventory: { ...state.mentalInventory, ...inventory },
        }));
      },
    }),
    {
      name: "adrik-app-planner-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
