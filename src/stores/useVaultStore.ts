import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface VaultItem {
  id: string;
  impulseTitle: string;
  cravingIntensity: number; // 0 to 10
  delayHours: 2 | 24 | 48;
  lockedAt: number;
  unlocksAt: number;
  isResolved: boolean;
  surfingCompleted: boolean;
  actionTaken?: string;
  itemType?: "impulse" | "architect";
  realProblem?: string;
  mechanism?: string;
  roiReason?: string;
}

interface VaultState {
  vaultItems: VaultItem[];
  isSurfingModalOpen: boolean;
  currentSurfingItem: VaultItem | null;

  // Actions
  addVaultItem: (
    title: string,
    cravingIntensity: number,
    delayHours: 2 | 24,
    surfingCompleted?: boolean
  ) => VaultItem;
  addArchitectVaultItem: (
    title: string,
    realProblem: string,
    mechanism: string,
    roiReason: string
  ) => VaultItem;
  resolveVaultItem: (id: string, actionTaken: string) => void;
  markSurfingCompleted: (id: string) => void;
  openSurfingModal: (item: VaultItem) => void;
  closeSurfingModal: () => void;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      vaultItems: [],
      isSurfingModalOpen: false,
      currentSurfingItem: null,

      addVaultItem: (title, cravingIntensity, delayHours, surfingCompleted = false) => {
        const now = Date.now();
        const item: VaultItem = {
          id: `vault-${now}-${Math.random().toString(36).slice(2, 6)}`,
          impulseTitle: title.trim(),
          cravingIntensity,
          delayHours,
          lockedAt: now,
          unlocksAt: now + delayHours * 60 * 60 * 1000,
          isResolved: false,
          surfingCompleted,
          itemType: "impulse",
        };
        set({ vaultItems: [item, ...get().vaultItems] });
        return item;
      },

      addArchitectVaultItem: (title, realProblem, mechanism, roiReason) => {
        const now = Date.now();
        const item: VaultItem = {
          id: `arch-${now}-${Math.random().toString(36).slice(2, 6)}`,
          impulseTitle: title.trim(),
          cravingIntensity: 10,
          delayHours: 48,
          lockedAt: now,
          unlocksAt: now + 48 * 60 * 60 * 1000,
          isResolved: false,
          surfingCompleted: true,
          itemType: "architect",
          realProblem: realProblem.trim(),
          mechanism: mechanism.trim(),
          roiReason: roiReason.trim(),
        };
        set({ vaultItems: [item, ...get().vaultItems] });
        return item;
      },

      resolveVaultItem: (id, actionTaken) => {
        set({
          vaultItems: get().vaultItems.map((item) =>
            item.id === id ? { ...item, isResolved: true, actionTaken } : item
          ),
        });
      },

      markSurfingCompleted: (id) => {
        set({
          vaultItems: get().vaultItems.map((item) =>
            item.id === id ? { ...item, surfingCompleted: true } : item
          ),
        });
      },

      openSurfingModal: (item) => {
        set({ isSurfingModalOpen: true, currentSurfingItem: item });
      },

      closeSurfingModal: () => {
        set({ isSurfingModalOpen: false, currentSurfingItem: null });
      },
    }),
    {
      name: "adrik-app-vault-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
