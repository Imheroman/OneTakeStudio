"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { getStudioMembers } from "@/shared/api/studio-members";
import type { StudioMemberResponse } from "@/entities/studio/model";
import { cn } from "@/shared/lib/utils";

interface StudioMemberPanelProps {
  studioId: string | number;
  onClose?: () => void;
  onInviteClick?: () => void;
}

export function StudioMemberPanel({
  studioId,
  onClose,
  onInviteClick,
}: StudioMemberPanelProps) {
  const [members, setMembers] = useState<StudioMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStudioMembers(studioId)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((e) => console.error("멤버 목록 조회 실패:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studioId]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4" />
          멤버
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
      <div className="p-3 border-b border-gray-700">
        <Button
          type="button"
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          onClick={onInviteClick}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          사용자 초대
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <div className="text-gray-400 text-sm">로딩 중...</div>
        ) : members.length === 0 ? (
          <div className="text-gray-400 text-sm">멤버가 없습니다.</div>
        ) : (
          members.map((m) => (
            <div
              key={m.memberId}
              className="flex items-center gap-2 p-2 rounded bg-gray-700/50 border border-gray-600"
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-200 text-sm font-bold shrink-0">
                {m.nickname?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {m.nickname}
                </div>
                <div className="text-xs text-gray-400 truncate">{m.email}</div>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded capitalize shrink-0",
                  m.role === "owner" && "bg-amber-900/50 text-amber-200",
                  m.role === "admin" && "bg-indigo-900/50 text-indigo-200",
                  m.role === "member" && "bg-gray-600 text-gray-300",
                )}
              >
                {m.role}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
