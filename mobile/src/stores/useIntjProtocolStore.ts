import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FixedBlockType = "DEEP_WORK" | "TACTICAL" | "MAINTENANCE";
export type BlockStatus = "pending" | "running" | "paused" | "completed" | "failed";
export type BugType = "BUG_A" | "BUG_B" | "BUG_C";

export interface FixedBlock {
  id: FixedBlockType;
  title: string;
  subtitle: string;
  targetMinutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  status: BlockStatus;
  completedAt?: string;
  failedReason?: string;
}

export interface PreflightContract {
  deliverable: string;
  doneWhen: string;
  outOfScope: string;
}

export interface ParkingLotItem {
  id: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface RcaLog {
  id: string;
  blockId: FixedBlockType;
  bugType: BugType;
  bugTitle: string;
  patchApplied: string;
  createdAt: string;
}

export interface IntjProtocolState {
  blocks: Record<FixedBlockType, FixedBlock>;
  activeBlockId: FixedBlockType | null;
  contract: PreflightContract;
  parkingLot: ParkingLotItem[];
  rcaLogs: RcaLog[];

  // Block actions
  startBlock: (id: FixedBlockType) => void;
  pauseBlock: (id: FixedBlockType) => void;
  tickBlock: (id: FixedBlockType) => void;
  resetBlock: (id: FixedBlockType) => void;
  completeBlock: (id: FixedBlockType) => void;
  failBlock: (id: FixedBlockType, bug: { bugType: BugType; bugTitle: string; patchApplied: string }) => void;
  setActiveBlock: (id: FixedBlockType | null) => void;

  // Contract actions
  updateContract: (updates: Partial<PreflightContract>) => void;
  resetContract: () => void;

  // Parking lot actions
  addParkingItem: (text: string) => void;
  toggleParkingItem: (id: string) => void;
  removeParkingItem: (id: string) => void;
  clearResolvedParkingItems: () => void;
}

const DEFAULT_BLOCKS: Record<FixedBlockType, FixedBlock> = {
  DEEP_WORK: {
    id: "DEEP_WORK",
    title: "كتلة التركيز العميق",
    subtitle: "المهمة الأهم اليوم (DoD ثنائي)",
    targetMinutes: 90,
    totalSeconds: 90 * 60,
    remainingSeconds: 90 * 60,
    status: "pending",
  },
  TACTICAL: {
    id: "TACTICAL",
    title: "الكتلة التكتيكية",
    subtitle: "إنجاز مهام المشروع والتحضير",
    targetMinutes: 60,
    totalSeconds: 60 * 60,
    remainingSeconds: 60 * 60,
    status: "pending",
  },
  MAINTENANCE: {
    id: "MAINTENANCE",
    title: "كتلة الصيانة والإغلاق",
    subtitle: "إغلاق اليوميات ومراجعة الحساب",
    targetMinutes: 45,
    totalSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    status: "pending",
  },
};

export const useIntjProtocolStore = create<IntjProtocolState>()(
  persist(
    (set, get) => ({
      blocks: DEFAULT_BLOCKS,
      activeBlockId: null,
      contract: {
        deliverable: "",
        doneWhen: "",
        outOfScope: "",
      },
      parkingLot: [],
      rcaLogs: [],

      startBlock: (id: FixedBlockType) => {
        set((state) => {
          const current = state.blocks[id];
          if (!current) return state;

          // If another block is running, pause it first
          const updatedBlocks = { ...state.blocks };
          Object.keys(updatedBlocks).forEach((key) => {
            const bKey = key as FixedBlockType;
            if (bKey !== id && updatedBlocks[bKey].status === "running") {
              updatedBlocks[bKey] = { ...updatedBlocks[bKey], status: "paused" };
            }
          });

          updatedBlocks[id] = {
            ...current,
            status: "running",
          };

          return {
            blocks: updatedBlocks,
            activeBlockId: id,
          };
        });
      },

      pauseBlock: (id: FixedBlockType) => {
        set((state) => {
          const current = state.blocks[id];
          if (!current || current.status !== "running") return state;

          return {
            blocks: {
              ...state.blocks,
              [id]: { ...current, status: "paused" },
            },
            activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
          };
        });
      },

      tickBlock: (id: FixedBlockType) => {
        set((state) => {
          const current = state.blocks[id];
          if (!current || current.status !== "running") return state;

          if (current.remainingSeconds <= 1) {
            return {
              blocks: {
                ...state.blocks,
                [id]: {
                  ...current,
                  remainingSeconds: 0,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                },
              },
              activeBlockId: null,
            };
          }

          return {
            blocks: {
              ...state.blocks,
              [id]: {
                ...current,
                remainingSeconds: current.remainingSeconds - 1,
              },
            },
          };
        });
      },

      resetBlock: (id: FixedBlockType) => {
        set((state) => {
          const defaultBlock = DEFAULT_BLOCKS[id];
          if (!defaultBlock) return state;

          return {
            blocks: {
              ...state.blocks,
              [id]: { ...defaultBlock },
            },
            activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
          };
        });
      },

      completeBlock: (id: FixedBlockType) => {
        set((state) => {
          const current = state.blocks[id];
          if (!current) return state;

          return {
            blocks: {
              ...state.blocks,
              [id]: {
                ...current,
                status: "completed",
                remainingSeconds: 0,
                completedAt: new Date().toISOString(),
              },
            },
            activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
          };
        });
      },

      failBlock: (id: FixedBlockType, bug: { bugType: BugType; bugTitle: string; patchApplied: string }) => {
        set((state) => {
          const current = state.blocks[id];
          if (!current) return state;

          const newRca: RcaLog = {
            id: `rca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            blockId: id,
            bugType: bug.bugType,
            bugTitle: bug.bugTitle,
            patchApplied: bug.patchApplied,
            createdAt: new Date().toISOString(),
          };

          return {
            blocks: {
              ...state.blocks,
              [id]: {
                ...current,
                status: "failed",
                failedReason: `${bug.bugTitle}: ${bug.patchApplied}`,
              },
            },
            activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
            rcaLogs: [newRca, ...state.rcaLogs],
          };
        });
      },

      setActiveBlock: (id: FixedBlockType | null) => set({ activeBlockId: id }),

      updateContract: (updates: Partial<PreflightContract>) =>
        set((state) => ({
          contract: { ...state.contract, ...updates },
        })),

      resetContract: () =>
        set({
          contract: { deliverable: "", doneWhen: "", outOfScope: "" },
        }),

      addParkingItem: (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          parkingLot: [
            {
              id: `park-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: trimmed,
              createdAt: new Date().toISOString(),
              resolved: false,
            },
            ...state.parkingLot,
          ],
        }));
      },

      toggleParkingItem: (id: string) =>
        set((state) => ({
          parkingLot: state.parkingLot.map((item) =>
            item.id === id ? { ...item, resolved: !item.resolved } : item
          ),
        })),

      removeParkingItem: (id: string) =>
        set((state) => ({
          parkingLot: state.parkingLot.filter((item) => item.id !== id),
        })),

      clearResolvedParkingItems: () =>
        set((state) => ({
          parkingLot: state.parkingLot.filter((item) => !item.resolved),
        })),
    }),
    {
      name: "adrik-intj-protocol",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
