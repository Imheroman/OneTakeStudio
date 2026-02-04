import { create } from "zustand";

interface PrivateChatState {
  /** 스튜디오별 읽지 않은 프라이빗 메시지 수 */
  unreadCounts: Record<string, number>;

  /** 읽지 않은 메시지 수 증가 */
  incrementUnread: (studioId: string) => void;
  /** 읽음 처리 (프라이빗 채팅 패널 열 때) */
  markAsRead: (studioId: string) => void;
  /** 읽지 않은 메시지 수 설정 */
  setUnreadCount: (studioId: string, count: number) => void;
  /** 읽지 않은 메시지 수 조회 */
  getUnreadCount: (studioId: string) => number;
}

export const usePrivateChatStore = create<PrivateChatState>((set, get) => ({
  unreadCounts: {},

  incrementUnread: (studioId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [studioId]: (state.unreadCounts[studioId] ?? 0) + 1,
      },
    })),

  markAsRead: (studioId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [studioId]: 0,
      },
    })),

  setUnreadCount: (studioId, count) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [studioId]: count,
      },
    })),

  getUnreadCount: (studioId) => get().unreadCounts[studioId] ?? 0,
}));
