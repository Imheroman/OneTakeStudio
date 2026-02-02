"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
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

export default function InvitesPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();
  const [invites, setInvites] = useState<ReceivedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

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
    if (hasHydrated && !isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (isLoggedIn) fetchInvites();
  }, [hasHydrated, isLoggedIn, router, fetchInvites]);

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

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Mail className="h-8 w-8 text-indigo-600" />
          받은 초대
        </h1>
        <p className="text-gray-500 mt-1">
          스튜디오 초대를 수락하거나 거절할 수 있습니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          로딩 중...
        </div>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>받은 초대가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {invites.map((inv) => (
            <Card key={inv.inviteId}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {inv.studioName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {inv.inviterNickname ?? inv.inviterEmail ?? "알 수 없음"}
                      님이 {inv.role} 역할로 초대했습니다.
                    </CardDescription>
                    <p className="text-xs text-gray-400 mt-1">
                      만료: {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
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
                      className="text-gray-600 hover:bg-gray-100"
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
