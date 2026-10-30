import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BugType = "BUG_A" | "BUG_B" | "BUG_C";

export interface BlockState {
  id: number;
  title: string;
  defaultMinutes: number;
  secondsRemaining: number;
  status: "idle" | "running" | "paused" | "completed" | "failed";
  deliverable: string;
  doneWhen: string;
  outOfScope: string;
  failureReason?: BugType;
  patchApplied?: string;
}

export interface ParkingLotItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface RcaLogEntry {
  id: string;
  blockId: number;
  bugType: BugType;
  note?: string;
  timestamp: string;
}

interface IntjProtocolState {
  activeBlockId: number;
  blocks: Record<number, BlockState>;
  parkingLot: ParkingLotItem[];
  rcaHistory: RcaLogEntry[];

  // Actions
  setActiveBlock: (blockId: number) => void;
  updateContract: (
    blockId: number,
    data: Partial<Pick<BlockState, "deliverable" | "doneWhen" | "outOfScope">>
  ) => void;
  startTimer: (blockId: number) => void;
  pauseTimer: (blockId: number) => void;
  resetTimer: (blockId: number) => void;
  tickTimer: (blockId: number) => void;
  completeBlock: (blockId: number) => void;
  recordFailure: (blockId: number, bugType: BugType, patchText?: string) => void;
  addParkingLotItem: (text: string) => void;
  removeParkingLotItem: (id: string) => void;
  resetDay: () => void;
}

const DEFAULT_BLOCKS: Record<number, BlockState> = {
  1: {
    id: 1,
    title: "الضفدع الأكبر (Primary Frog)",
    defaultMinutes: 90,
    secondsRemaining: 90 * 60,
    status: "idle",
    deliverable: "",
    doneWhen: "",
    outOfScope: "",
  },
  2: {
    id: 2,
    title: "ثانوية حاسمة (Secondary Core)",
    defaultMinutes: 60,
    secondsRemaining: 60 * 60,
    status: "idle",
    deliverable: "",
    doneWhen: "",
    outOfScope: "",
  },
  3: {
    id: 3,
    title: "إغلاق التزامات (Maintenance & Closure)",
    defaultMinutes: 45,
    secondsRemaining: 45 * 60,
    status: "idle",
    deliverable: "",
    doneWhen: "",
    outOfScope: "",
  },
};

export const useIntjProtocolStore = create<IntjProtocolState>()(
  persist(
    (set, get) => ({
      activeBlockId: 1,
      blocks: DEFAULT_BLOCKS,
      parkingLot: [],
      rcaHistory: [],

      setActiveBlock: (blockId) => set({ activeBlockId: blockId }),

      updateContract: (blockId, data) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current) return state;
          return {
            blocks: {
              ...state.blocks,
              [blockId]: { ...current, ...data },
            },
          };
        }),

      startTimer: (blockId) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current || current.status === "completed") return state;
          return {
            activeBlockId: blockId,
            blocks: {
              ...state.blocks,
              [blockId]: { ...current, status: "running" },
            },
          };
        }),

      pauseTimer: (blockId) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current) return state;
          return {
            blocks: {
              ...state.blocks,
              [blockId]: { ...current, status: "paused" },
            },
          };
        }),

      resetTimer: (blockId) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current) return state;
          return {
            blocks: {
              ...state.blocks,
              [blockId]: {
                ...current,
                secondsRemaining: current.defaultMinutes * 60,
                status: "idle",
                failureReason: undefined,
                patchApplied: undefined,
              },
            },
          };
        }),

      tickTimer: (blockId) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current || current.status !== "running") return state;

          if (current.secondsRemaining <= 1) {
            // Timer expired without explicit completion -> triggers failure/RCA needed
            return {
              blocks: {
                ...state.blocks,
                [blockId]: {
                  ...current,
                  secondsRemaining: 0,
                  status: "failed",
                },
              },
            };
          }

          return {
            blocks: {
              ...state.blocks,
              [blockId]: {
                ...current,
                secondsRemaining: current.secondsRemaining - 1,
              },
            },
          };
        }),

      completeBlock: (blockId) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current) return state;
          return {
            blocks: {
              ...state.blocks,
              [blockId]: {
                ...current,
                status: "completed",
              },
            },
          };
        }),

      recordFailure: (blockId, bugType, patchText) =>
        set((state) => {
          const current = state.blocks[blockId];
          if (!current) return state;

          const newLog: RcaLogEntry = {
            id: `rca_${Date.now()}`,
            blockId,
            bugType,
            note: patchText,
            timestamp: new Date().toISOString(),
          };

          return {
            rcaHistory: [newLog, ...state.rcaHistory],
            blocks: {
              ...state.blocks,
              [blockId]: {
                ...current,
                status: "failed",
                failureReason: bugType,
                patchApplied: patchText,
              },
            },
          };
        }),

      addParkingLotItem: (text) =>
        set((state) => {
          const trimmed = text.trim();
          if (!trimmed) return state;
          const newItem: ParkingLotItem = {
            id: `pl_${Date.now()}`,
            text: trimmed,
            createdAt: new Date().toISOString(),
          };
          return {
            parkingLot: [newItem, ...state.parkingLot],
          };
        }),

      removeParkingLotItem: (id) =>
        set((state) => ({
          parkingLot: state.parkingLot.filter((item) => item.id !== id),
        })),

      resetDay: () =>
        set({
          activeBlockId: 1,
          blocks: DEFAULT_BLOCKS,
        }),
    }),
    {
      name: "adrik_intj_protocol_state",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
