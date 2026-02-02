"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { List } from "react-window";
import {
  getReceivedInvites,
  acceptInvite,
  rejectInvite,
  type ReceivedInvite,
} from "@/shared/api/invites";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Mail, Loader2, Check, X, Video } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

const INVITE_ROW_HEIGHT = 200;
const VIRTUAL_THRESHOLD = 10;

function formatDate(s: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function InviteRow({
  index,
  style,
  invites: list,
  isDark,
  actingId,
  onAccept,
  onReject,
}: {
  index: number;
  style: React.CSSProperties;
  invites: ReceivedInvite[];
  isDark: boolean;
  actingId: string | null;
  onAccept: (inv: ReceivedInvite) => void;
  onReject: (inv: ReceivedInvite) => void;
}) {
  const inv = list[index];
  return (
    <div style={{ ...style, paddingBottom: 16 }}>
      <Card className={cn(isDark && "border-gray-700 bg-gray-800/50")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle
                className={cn(
                  "text-lg truncate",
                  isDark ? "text-gray-100" : "text-gray-900"
                )}
              >
                {inv.studioName}
              </CardTitle>
              <CardDescription className={cn("mt-1", isDark && "text-gray-400")}>
                {inv.inviterNickname ?? inv.inviterEmail ?? "알 수 없음"}님이 {inv.role}{" "}
                역할로 초대했습니다.
              </CardDescription>
              <p
                className={cn(
                  "text-xs mt-1",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}
              >
                만료: {formatDate(inv.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                asChild
                className={cn(
                  "text-indigo-600",
                  isDark
                    ? "border-indigo-600 text-indigo-400 hover:bg-indigo-900/30"
                    : "border-indigo-200 hover:bg-indigo-50"
                )}
              >
                <Link href={`/studio/${inv.studioId}`}>
                  <Video className="h-4 w-4 mr-1" />
                  스튜디오 보기
                </Link>
              </Button>
              <Button
                size="sm"
                disabled={actingId === inv.inviteId}
                onClick={() => onAccept(inv)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {actingId === inv.inviteId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    수락
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actingId === inv.inviteId}
                onClick={() => onReject(inv)}
                className={cn(
                  isDark
                    ? "text-gray-400 border-gray-600 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <X className="h-4 w-4 mr-1" />
                거절
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export function ReceivedInvitesPanel() {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const [invites, setInvites] = useState<ReceivedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { height } = entries[0]?.contentRect ?? { height: 400 };
      setListHeight(height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getReceivedInvites();
      setInvites(list);
    } catch (e) {
      console.error("받은 초대 목록 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleAccept = async (inv: ReceivedInvite) => {
    setActingId(inv.inviteId);
    try {
      await acceptInvite(inv.inviteId);
      setInvites((prev) => prev.filter((i) => i.inviteId !== inv.inviteId));
    } catch (e) {
      console.error("초대 수락 실패:", e);
      alert("초대 수락에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (inv: ReceivedInvite) => {
    setActingId(inv.inviteId);
    try {
      await rejectInvite(inv.inviteId);
      setInvites((prev) => prev.filter((i) => i.inviteId !== inv.inviteId));
    } catch (e) {
      console.error("초대 거절 실패:", e);
      alert("초대 거절에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12",
          isDark ? "text-gray-400" : "text-gray-500"
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        로딩 중...
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <Card className={cn(isDark && "border-gray-700 bg-gray-800/50")}>
        <CardContent
          className={cn(
            "py-12 text-center",
            isDark ? "text-gray-400" : "text-gray-500"
          )}
        >
          <Mail
            className={cn(
              "h-12 w-12 mx-auto mb-3",
              isDark ? "text-gray-500" : "text-gray-300"
            )}
          />
          <p>받은 초대가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const useVirtualList = invites.length > VIRTUAL_THRESHOLD;

  return (
    <div ref={listRef} className="min-h-[300px]">
      {useVirtualList ? (
        <List<{
          invites: ReceivedInvite[];
          isDark: boolean;
          actingId: string | null;
          onAccept: (inv: ReceivedInvite) => void;
          onReject: (inv: ReceivedInvite) => void;
        }>
          rowCount={invites.length}
          rowHeight={INVITE_ROW_HEIGHT}
          rowComponent={InviteRow}
          rowProps={{
            invites,
            isDark,
            actingId,
            onAccept: handleAccept,
            onReject: handleReject,
          }}
          style={{ height: listHeight, width: "100%" }}
          overscanCount={2}
        />
      ) : (
        <ul className="space-y-4">
          {invites.map((inv) => (
            <Card
              key={inv.inviteId}
              className={cn(isDark && "border-gray-700 bg-gray-800/50")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle
                      className={cn(
                        "text-lg truncate",
                        isDark ? "text-gray-100" : "text-gray-900"
                      )}
                    >
                      {inv.studioName}
                    </CardTitle>
                    <CardDescription
                      className={cn("mt-1", isDark && "text-gray-400")}
                    >
                      {inv.inviterNickname ?? inv.inviterEmail ?? "알 수 없음"}님이{" "}
                      {inv.role} 역할로 초대했습니다.
                    </CardDescription>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isDark ? "text-gray-500" : "text-gray-400"
                      )}
                    >
                      만료: {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className={cn(
                        "text-indigo-600",
                        isDark
                          ? "border-indigo-600 text-indigo-400 hover:bg-indigo-900/30"
                          : "border-indigo-200 hover:bg-indigo-50"
                      )}
                    >
                      <Link href={`/studio/${inv.studioId}`}>
                        <Video className="h-4 w-4 mr-1" />
                        스튜디오 보기
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={actingId === inv.inviteId}
                      onClick={() => handleAccept(inv)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {actingId === inv.inviteId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          수락
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === inv.inviteId}
                      onClick={() => handleReject(inv)}
                      className={cn(
                        isDark
                          ? "text-gray-400 border-gray-600 hover:bg-gray-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <X className="h-4 w-4 mr-1" />
                      거절
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
