import { create } from "zustand";
export type ShortStatus = "idle" | "loading" | "completed";

interface ShortItem {
  id: number;
  status: ShortStatus;
}

interface ShortsStore {
  shorts: ShortItem[];
  notifications: string[];
  isModalOpen: boolean;

  // 단순 상태 변경 액션들만 남김
  setShortsStatus: (count: number) => void;
  addNotification: (msg: string) => void;
  openResultModal: () => void;
  closeResultModal: () => void;
  reset: () => void;
}

export const useShortsStore = create<ShortsStore>((set) => ({
  shorts: [
    { id: 1, status: "idle" },
    { id: 2, status: "idle" },
    { id: 3, status: "idle" },
  ],
  notifications: [],
  isModalOpen: false,

  openResultModal: () => set({ isModalOpen: true }),
  closeResultModal: () => set({ isModalOpen: false }),
  addNotification: (msg) =>
    set((state) => ({ notifications: [msg, ...state.notifications] })),

  // 서버에서 받은 '완료된 개수'에 따라 상태 업데이트
  setShortsStatus: (count) =>
    set((state) => {
      const newShorts = state.shorts.map((item, index) => ({
        ...item,
        status:
          index < count
            ? ("completed" as ShortStatus)
            : ("loading" as ShortStatus),
      }));
      return { shorts: newShorts };
    }),

  reset: () =>
    set({
      shorts: [
        { id: 1, status: "idle" },
        { id: 2, status: "idle" },
        { id: 3, status: "idle" },
      ],
    }),
}));
