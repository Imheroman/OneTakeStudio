"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Monitor, Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { getChatHistory, sendChatMessage } from "@/shared/api/studio-chat";
import type { ChatMessage } from "@/entities/chat/model";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatMessageStore } from "@/stores/useChatMessageStore";

const EMPTY_MESSAGES: ChatMessage[] = [];

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "유튜브",
  TWITCH: "트위치",
  CHZZK: "치지직",
  HOST: "방장",
  INTERNAL: "프라이빗",
};

function formatTime(createdAt: string | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

interface StudioChatPanelProps {
  studioId: number | string;
  onClose?: () => void;
  filterPlatform?: "INTERNAL" | null; // null = 전체(공개), INTERNAL = 프라이빗만
  isChatOverlayEnabled?: boolean;
  onChatOverlayToggle?: () => void;
}

export function StudioChatPanel({
  studioId,
  onClose,
  filterPlatform = null,
  isChatOverlayEnabled,
  onChatOverlayToggle,
}: StudioChatPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);

  const studioIdStr = String(studioId);
  const setHistory = useChatMessageStore((s) => s.setHistory);
  const rawMessages = useChatMessageStore(
    (s) => s.messagesByStudio[studioIdStr] ?? EMPTY_MESSAGES,
  );
  const messages = useMemo(
    () =>
      filterPlatform === "INTERNAL"
        ? rawMessages.filter((m) => m.platform === "INTERNAL")
        : rawMessages.filter((m) => m.platform !== "INTERNAL"),
    [rawMessages, filterPlatform],
  );

  // 자동 스크롤: 새 메시지가 추가되면 하단으로 이동
  const shouldAutoScroll = useRef(true);
  const prevMessageCount = useRef(messages.length);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 유저가 위로 스크롤했으면 자동 스크롤 비활성화
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    shouldAutoScroll.current = atBottom;
  };

  useEffect(() => {
    if (messages.length > prevMessageCount.current && shouldAutoScroll.current) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // 초기 로드 후 스크롤 하단 이동
  useEffect(() => {
    if (!loading) {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [loading]);

  // 초기 히스토리 로드 (1회) → 스토어에 세팅
  // 이미 스토어에 메시지가 있으면 (탭 전환 후 복귀) API 재호출 생략
  useEffect(() => {
    const existing = useChatMessageStore.getState().messagesByStudio[studioIdStr];
    if (existing && existing.length > 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadHistory = async () => {
      try {
        setLoading(true);
        const list = await getChatHistory(studioId);
        if (!cancelled) {
          setHistory(studioIdStr, list);
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
  }, [studioId, studioIdStr, setHistory]);

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
        <div className="flex items-center gap-2">
          {filterPlatform !== "INTERNAL" && onChatOverlayToggle && (
            <button
              type="button"
              onClick={onChatOverlayToggle}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                isChatOverlayEnabled
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600"
              )}
              aria-label="채팅 오버레이 토글"
              title="방송 화면에 채팅 오버레이 표시"
            >
              <Monitor className="h-3.5 w-3.5" />
              오버레이
            </button>
          )}
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
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 p-3 overflow-y-auto space-y-1"
      >
        {loading ? (
          <div className="text-gray-400 text-sm">로딩 중...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-sm">
            {filterPlatform === "INTERNAL"
              ? "프라이빗 채팅 메시지가 없습니다."
              : "채팅 메시지가 없습니다."}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.messageId}
              className={cn(
                "text-sm rounded px-2 py-1 break-words",
                m.platform === "HOST" && "bg-indigo-900/30",
                m.platform === "INTERNAL" && "bg-purple-900/30"
              )}
            >
              <span className="text-gray-400 text-xs mr-1">
                [{PLATFORM_LABEL[m.platform] ?? m.platform}]
              </span>
              <span className="text-gray-500 text-xs mr-1">{formatTime(m.createdAt)}</span>
              <span className="font-medium text-gray-200">{m.senderName}:</span>{" "}
              <span className="text-gray-300">{m.content}</span>
            </div>
          ))
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
