import { create } from "zustand";
export type ShortStatus = "idle" | "loading" | "completed";

export interface ShortItem {
  id: number;
  status: ShortStatus;
  currentStep?: number;
  totalSteps?: number;
  currentStepKey?: string;
  videoUrl?: string;
  jobId?: string;
  videoId?: string;
}

interface ShortsStore {
  shorts: ShortItem[];
  notifications: string[];
  isModalOpen: boolean;

  // 단순 상태 변경 액션들만 남김
  setShortsStatus: (shorts: ShortItem[]) => void;
  addNotification: (msg: string) => void;
  removeNotification: (index: number) => void;
  clearNotifications: () => void;
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
  removeNotification: (index) =>
    set((state) => ({
      notifications: state.notifications.filter((_, i) => i !== index),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // 서버에서 받은 shorts 배열 기반으로 상태 업데이트
  setShortsStatus: (serverShorts) =>
    set((state) => {
      const newShorts = state.shorts.map((item, index) => {
        const server = serverShorts[index];
        if (!server) return item;

        if (server.status === "completed") {
          return {
            ...item,
            status: "completed" as ShortStatus,
            videoUrl: server.videoUrl ?? item.videoUrl,
            jobId: server.jobId ?? item.jobId,
            videoId: server.videoId ?? item.videoId,
          };
        }
        if (server.status === "processing" || server.status === "pending") {
          return {
            ...item,
            status: "loading" as ShortStatus,
            currentStep: server.currentStep,
            totalSteps: server.totalSteps,
            currentStepKey: server.currentStepKey,
            jobId: server.jobId ?? item.jobId,
            videoId: server.videoId ?? item.videoId,
          };
        }
        return item;
      });
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
