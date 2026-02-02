"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Mail, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  getStudioMembers,
  getStudioInvites,
  cancelStudioInvite,
} from "@/shared/api/studio-members";
import type {
  StudioMemberResponse,
  InviteResponse,
} from "@/entities/studio/model";
import { cn } from "@/shared/lib/utils";

interface StudioMemberPanelProps {
  studioId: string | number;
  onClose?: () => void;
  onInviteClick?: () => void;
  /** 초대 성공 후 부모에서 증가시키면 멤버·초대 목록 재조회 */
  refreshTrigger?: number;
}

function inviteEmail(inv: InviteResponse): string {
  return inv.inviteeEmail ?? inv.email ?? "—";
}

export function StudioMemberPanel({
  studioId,
  onClose,
  onInviteClick,
  refreshTrigger = 0,
}: StudioMemberPanelProps) {
  const [members, setMembers] = useState<StudioMemberResponse[]>([]);
  const [invites, setInvites] = useState<InviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      getStudioMembers(studioId),
      getStudioInvites(studioId),
    ])
      .then(([memberList, inviteList]) => {
        setMembers(memberList);
        setInvites(inviteList ?? []);
      })
      .catch((e) => console.error("멤버/초대 목록 조회 실패:", e))
      .finally(() => setLoading(false));
  }, [studioId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshTrigger]);

  const handleCancelInvite = useCallback(
    async (inviteId: string) => {
      setCancellingId(inviteId);
      try {
        await cancelStudioInvite(studioId, inviteId);
        setInvites((prev) => prev.filter((i) => i.inviteId !== inviteId));
      } catch (e) {
        console.error("초대 취소 실패:", e);
      } finally {
        setCancellingId(null);
      }
    },
    [studioId],
  );

  const displayName = (m: StudioMemberResponse) =>
    m.nickname?.trim() || m.email?.trim() || "알 수 없음";
  const displaySub = (m: StudioMemberResponse) =>
    m.email?.trim() ? (m.nickname?.trim() ? m.email : "") : "";

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
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {loading ? (
          <div className="text-gray-400 text-sm">로딩 중...</div>
        ) : (
          <>
            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                멤버 ({members.length})
              </h4>
              {members.length === 0 ? (
                <div className="text-gray-400 text-sm">멤버가 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li
                      key={m.memberId}
                      className="flex items-center gap-2 p-2 rounded bg-gray-700/50 border border-gray-600"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-200 text-sm font-bold shrink-0">
                        {displayName(m)[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {displayName(m)}
                        </div>
                        {displaySub(m) ? (
                          <div className="text-xs text-gray-400 truncate">
                            {m.email}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded capitalize shrink-0",
                          m.role === "host" && "bg-amber-900/50 text-amber-200",
                          m.role === "manager" &&
                            "bg-indigo-900/50 text-indigo-200",
                          m.role === "guest" && "bg-gray-600 text-gray-300",
                        )}
                      >
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                초대 대기 ({invites.length})
              </h4>
              {invites.length === 0 ? (
                <div className="text-gray-400 text-sm">
                  대기 중인 초대가 없습니다.
                </div>
              ) : (
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <li
                      key={inv.inviteId}
                      className="flex items-center gap-2 p-2 rounded bg-gray-700/30 border border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {inviteEmail(inv)}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {inv.role} · 대기 중
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-gray-400 hover:text-red-400 h-8 w-8"
                        onClick={() => handleCancelInvite(inv.inviteId)}
                        disabled={cancellingId === inv.inviteId}
                        aria-label="초대 취소"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
