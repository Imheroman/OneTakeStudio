import { create } from "zustand";
import type { ChatMessage } from "@/entities/chat/model";

interface ChatMessageState {
  /** studioId → 메시지 배열 */
  messagesByStudio: Record<string, ChatMessage[]>;

  /** 메시지 추가 (중복 방지: messageId 기준) */
  addMessage: (studioId: string, msg: ChatMessage) => void;

  /** 초기 히스토리 세팅 (기존 메시지 교체) */
  setHistory: (studioId: string, msgs: ChatMessage[]) => void;

  /** 스튜디오별 메시지 조회 (플랫폼 필터 적용) */
  getFiltered: (
    studioId: string,
    filterPlatform: "INTERNAL" | null,
  ) => ChatMessage[];

  /** 클린업 */
  clear: (studioId: string) => void;
}

export const useChatMessageStore = create<ChatMessageState>((set, get) => ({
  messagesByStudio: {},

  addMessage: (studioId, msg) =>
    set((state) => {
      const prev = state.messagesByStudio[studioId] ?? [];
      // 중복 방지
      if (prev.some((m) => m.messageId === msg.messageId)) {
        return state;
      }
      return {
        messagesByStudio: {
          ...state.messagesByStudio,
          [studioId]: [...prev, msg],
        },
      };
    }),

  setHistory: (studioId, msgs) =>
    set((state) => ({
      messagesByStudio: {
        ...state.messagesByStudio,
        [studioId]: msgs,
      },
    })),

  getFiltered: (studioId, filterPlatform) => {
    const msgs = get().messagesByStudio[studioId] ?? [];
    return filterPlatform === "INTERNAL"
      ? msgs.filter((m) => m.platform === "INTERNAL")
      : msgs.filter((m) => m.platform !== "INTERNAL");
  },

  clear: (studioId) =>
    set((state) => {
      const next = { ...state.messagesByStudio };
      delete next[studioId];
      return { messagesByStudio: next };
    }),
}));
