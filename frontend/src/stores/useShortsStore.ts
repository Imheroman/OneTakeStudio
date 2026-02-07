import { create } from "zustand";
export type ShortStatus = "idle" | "loading" | "completed" | "error" | "saved";

export interface ShortItem {
  id: number;
  videoId: string | null;
  status: ShortStatus;
  currentStep: number | null;
  totalSteps: number | null;
  currentStepKey: string | null;
  error: string | null;
}

interface ShortsStore {
  shorts: ShortItem[];
  jobId: string | null;
  notifications: string[];
  isModalOpen: boolean;
  isPolling: boolean;

  updateShortsFromServer: (
    jobId: string | null,
    serverShorts: Array<{
      videoId: string;
      status: string;
      currentStep?: number | null;
      totalSteps?: number | null;
      currentStepKey?: string | null;
      error?: string | null;
    }> | null,
    completedCount: number,
    totalCount?: number
  ) => void;
  markSaved: (videoId: string) => void;
  setShortsStatus: (count: number) => void;
  addNotification: (msg: string) => void;
  openResultModal: () => void;
  closeResultModal: () => void;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

const makeDefaultShort = (id: number, status: ShortStatus = "idle"): ShortItem => ({
  id,
  videoId: null,
  status,
  currentStep: null,
  totalSteps: null,
  currentStepKey: null,
  error: null,
});

const makeDefaultShorts = (status: ShortStatus = "idle"): ShortItem[] => [
  makeDefaultShort(1, status),
  makeDefaultShort(2, status),
  makeDefaultShort(3, status),
];

export const useShortsStore = create<ShortsStore>((set) => ({
  shorts: makeDefaultShorts(),
  jobId: null,
  notifications: [],
  isModalOpen: false,
  isPolling: false,

  openResultModal: () => set({ isModalOpen: true }),
  closeResultModal: () => set({ isModalOpen: false }),
  addNotification: (msg) =>
    set((state) => ({ notifications: [msg, ...state.notifications] })),

  startPolling: () =>
    set({
      isPolling: true,
      isModalOpen: true,
      jobId: null,
      shorts: makeDefaultShorts("loading"),
    }),
  stopPolling: () => set({ isPolling: false }),

  updateShortsFromServer: (jobId, serverShorts, completedCount, totalCount) =>
    set((state) => {
      // totalCount가 있으면 서버가 알려준 실제 쇼츠 수 사용, 없으면 3
      const expectedCount = totalCount ?? 3;

      if (!serverShorts || serverShorts.length === 0) {
        const newShorts = state.shorts
          .slice(0, expectedCount)
          .map((item, index) => ({
            ...item,
            status: (index < completedCount ? "completed" : "loading") as ShortStatus,
          }));
        return { jobId: jobId ?? state.jobId, shorts: newShorts };
      }

      const newShorts: ShortItem[] = serverShorts.map((s, index) => {
        // 이미 saved 상태면 유지
        const prev = state.shorts.find((p) => p.videoId === s.videoId);
        if (prev?.status === "saved") {
          return prev;
        }

        let status: ShortStatus = "loading";
        if (s.status === "completed") status = "completed";
        else if (s.status === "error" || s.status === "failed") status = "error";

        return {
          id: index + 1,
          videoId: s.videoId,
          status,
          currentStep: s.currentStep ?? null,
          totalSteps: s.totalSteps ?? null,
          currentStepKey: s.currentStepKey ?? null,
          error: s.error ?? null,
        };
      });

      // 서버가 알려준 총 개수만큼만 슬롯 유지 (초과분은 추가하지 않음)
      while (newShorts.length < expectedCount) {
        newShorts.push(makeDefaultShort(newShorts.length + 1, "loading"));
      }

      return { jobId: jobId ?? state.jobId, shorts: newShorts };
    }),

  markSaved: (videoId) =>
    set((state) => ({
      shorts: state.shorts.map((s) =>
        s.videoId === videoId ? { ...s, status: "saved" as ShortStatus } : s
      ),
    })),

  setShortsStatus: (count) =>
    set((state) => ({
      shorts: state.shorts.map((item, index) => ({
        ...item,
        status: (index < count ? "completed" : "loading") as ShortStatus,
      })),
    })),

  reset: () =>
    set({
      isPolling: false,
      jobId: null,
      shorts: makeDefaultShorts(),
    }),
}));
