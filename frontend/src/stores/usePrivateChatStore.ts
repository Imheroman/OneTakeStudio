import { create } from "zustand";

interface PrivateChatState {
  /** 스튜디오별 읽지 않은 프라이빗 메시지 수 */
  unreadCounts: Record<number, number>;
  /** 마지막으로 확인한 메시지 ID (스튜디오별) */
  lastSeenMessageIds: Record<number, string>;

  /** 읽지 않은 메시지 수 증가 */
  incrementUnread: (studioId: number) => void;
  /** 읽음 처리 (프라이빗 채팅 패널 열 때) */
  markAsRead: (studioId: number) => void;
  /** 읽지 않은 메시지 수 설정 */
  setUnreadCount: (studioId: number, count: number) => void;
  /** 마지막 확인 메시지 ID 설정 */
  setLastSeenMessageId: (studioId: number, messageId: string) => void;
  /** 읽지 않은 메시지 수 조회 */
  getUnreadCount: (studioId: number) => number;
}

export const usePrivateChatStore = create<PrivateChatState>((set, get) => ({
  unreadCounts: {},
  lastSeenMessageIds: {},

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

  setLastSeenMessageId: (studioId, messageId) =>
    set((state) => ({
      lastSeenMessageIds: {
        ...state.lastSeenMessageIds,
        [studioId]: messageId,
      },
    })),

  getUnreadCount: (studioId) => get().unreadCounts[studioId] ?? 0,
}));
