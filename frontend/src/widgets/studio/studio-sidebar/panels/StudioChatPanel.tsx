"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Smile } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { getChatHistory, sendChatMessage } from "@/shared/api/studio-chat";
import type { ChatMessage } from "@/entities/chat/model";
import { cn } from "@/shared/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "유튜브",
  TWITCH: "트위치",
  CHZZK: "치지직",
  INTERNAL: "진행자",
};

interface StudioChatPanelProps {
  studioId: number;
  onClose?: () => void;
  filterPlatform?: "INTERNAL" | null; // null = 전체, INTERNAL = 프라이빗만
}

export function StudioChatPanel({
  studioId,
  onClose,
  filterPlatform = null,
}: StudioChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getChatHistory(studioId);
      setMessages(
        filterPlatform
          ? list.filter((m) => m.platform === filterPlatform)
          : list,
      );
    } catch (e) {
      console.error("채팅 히스토리 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [studioId, filterPlatform]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      await sendChatMessage({
        studioId,
        content,
        platform: filterPlatform ?? "INTERNAL",
      });
      setInput("");
      await fetchHistory();
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
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
                "text-sm rounded px-2 py-1",
                m.platform === "INTERNAL" && "bg-indigo-900/30",
              )}
            >
              <span className="text-gray-400 text-xs mr-2">
                [{PLATFORM_LABEL[m.platform] ?? m.platform}]
              </span>
              <span className="font-medium text-gray-200">{m.senderName}:</span>{" "}
              <span className="text-gray-300">{m.content}</span>
            </div>
          ))
        )}
      </div>
      {filterPlatform !== "INTERNAL" && (
        <>
          {emojiOpen && (
            <div className="p-2 border-t border-gray-700 flex flex-wrap gap-1">
              {["😀", "😂", "❤️", "👍", "🔥", "👋"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInput((prev) => prev + emoji);
                  }}
                  className="text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="p-2 border-t border-gray-700 flex gap-2 min-w-0">
            <Input
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 flex-1 min-w-0 shrink"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="text-gray-400 hover:text-white shrink-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
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
        </>
      )}
      {filterPlatform === "INTERNAL" && (
        <div className="p-2 border-t border-gray-700 flex gap-2 min-w-0">
          <Input
            placeholder="메시지를 입력하세요..."
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
            전송
          </Button>
        </div>
      )}
    </div>
  );
}
