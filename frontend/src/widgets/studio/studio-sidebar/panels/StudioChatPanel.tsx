"use client";

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { List } from "react-window";
import { MessageSquare, Send } from "lucide-react";
import type { Client, StompSubscription } from "@stomp/stompjs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { getChatHistory, sendChatMessage } from "@/shared/api/studio-chat";
import type { ChatMessage } from "@/entities/chat/model";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

const CHAT_ROW_HEIGHT = 48;
const VIRTUAL_THRESHOLD = 25;

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "유튜브",
  TWITCH: "트위치",
  CHZZK: "치지직",
  HOST: "방장",
  INTERNAL: "프라이빗",
};

function ChatMessageRow({
  index,
  style,
  messages: list,
}: {
  index: number;
  style: React.CSSProperties;
  messages: ChatMessage[];
}) {
  const m = list[index];
  return (
    <div
      style={style}
      className={cn(
        "text-sm rounded px-2 py-1 flex-shrink-0",
        m.platform === "HOST" && "bg-indigo-900/30",
        m.platform === "INTERNAL" && "bg-purple-900/30"
      )}
    >
      <span className="text-gray-400 text-xs mr-2">
        [{PLATFORM_LABEL[m.platform] ?? m.platform}]
      </span>
      <span className="font-medium text-gray-200">{m.senderName}:</span>{" "}
      <span className="text-gray-300 break-words">{m.content}</span>
    </div>
  );
}

interface StudioChatPanelProps {
  studioId: number | string;
  onClose?: () => void;
  filterPlatform?: "INTERNAL" | null; // null = 전체(공개), INTERNAL = 프라이빗만
  /** STOMP WebSocket 클라이언트 (실시간 메시지 수신용) */
  stompClient?: MutableRefObject<Client | null>;
}

/** 플랫폼 필터 적용 */
function filterMessages(
  list: ChatMessage[],
  filterPlatform: "INTERNAL" | null,
): ChatMessage[] {
  return filterPlatform === "INTERNAL"
    ? list.filter((m) => m.platform === "INTERNAL")
    : list.filter((m) => m.platform !== "INTERNAL");
}

export function StudioChatPanel({
  studioId,
  onClose,
  filterPlatform = null,
  stompClient,
}: StudioChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(300);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { height } = entries[0]?.contentRect ?? { height: 300 };
      setListHeight(height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 초기 히스토리 로드 (1회)
  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      try {
        setLoading(true);
        const list = await getChatHistory(studioId);
        if (!cancelled) {
          setMessages(filterMessages(list, filterPlatform));
        }
      } catch (e) {
        console.error("채팅 히스토리 조회 실패:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [studioId, filterPlatform]);

  // WebSocket 실시간 메시지 구독
  useEffect(() => {
    const client = stompClient?.current;
    if (!client?.connected) return;

    const sub: StompSubscription = client.subscribe(
      `/topic/chat/${studioId}`,
      (message) => {
        try {
          const chatMsg: ChatMessage = JSON.parse(message.body);
          // 필터 조건에 맞는 메시지만 추가
          const passes =
            filterPlatform === "INTERNAL"
              ? chatMsg.platform === "INTERNAL"
              : chatMsg.platform !== "INTERNAL";
          if (passes) {
            setMessages((prev) => {
              // 중복 방지
              if (prev.some((m) => m.messageId === chatMsg.messageId)) {
                return prev;
              }
              return [...prev, chatMsg];
            });
          }
        } catch (e) {
          console.error("[Chat] WebSocket 메시지 파싱 실패:", e);
        }
      },
    );

    return () => {
      sub.unsubscribe();
    };
  }, [studioId, filterPlatform, stompClient?.current?.connected]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      await sendChatMessage({
        studioId,
        content,
        senderName: user?.nickname ?? "익명",
        // 전체 채팅에서는 HOST로, 프라이빗에서는 INTERNAL로 전송
        platform: filterPlatform === "INTERNAL" ? "INTERNAL" : "HOST",
      });
      setInput("");
      // WebSocket으로 메시지가 바로 돌아오므로 fetchHistory 불필요
    } catch (e) {
      console.error("채팅 전송 실패:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {filterPlatform === "INTERNAL" ? "프라이빗채팅" : "채팅"}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>
      <div ref={listRef} className="flex-1 min-h-0 p-3">
        {loading ? (
          <div className="text-gray-400 text-sm">로딩 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-sm">
            {filterPlatform === "INTERNAL"
              ? "프라이빗 채팅 메시지가 없습니다."
              : "채팅 메시지가 없습니다."}
          </div>
        ) : messages.length > VIRTUAL_THRESHOLD ? (
          <List<{ messages: ChatMessage[] }>
            rowCount={messages.length}
            rowHeight={CHAT_ROW_HEIGHT}
            rowComponent={ChatMessageRow}
            rowProps={{ messages }}
            style={{ height: listHeight, width: "100%" }}
            overscanCount={5}
          />
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.messageId}
                className={cn(
                  "text-sm rounded px-2 py-1",
                  m.platform === "HOST" && "bg-indigo-900/30",
                  m.platform === "INTERNAL" && "bg-purple-900/30"
                )}
              >
                <span className="text-gray-400 text-xs mr-2">
                  [{PLATFORM_LABEL[m.platform] ?? m.platform}]
                </span>
                <span className="font-medium text-gray-200">{m.senderName}:</span>{" "}
                <span className="text-gray-300">{m.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 채팅 입력 (전체/프라이빗 모두 가능) */}
      <div className="p-2 border-t border-gray-700 flex gap-2 min-w-0">
        <Input
          placeholder={
            filterPlatform === "INTERNAL"
              ? "프라이빗 메시지..."
              : "시청자에게 보낼 메시지..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 flex-1 min-w-0 shrink"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
