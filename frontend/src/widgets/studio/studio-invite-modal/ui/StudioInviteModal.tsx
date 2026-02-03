"use client";

import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { apiClient } from "@/shared/api/client";
import { inviteStudioMember } from "@/shared/api/studio-members";
import {
  FavoriteListResponseSchema,
  UserSearchResponseSchema,
  type Favorite,
  type UserSearchResult,
} from "@/entities/favorite/model";
import { cn } from "@/shared/lib/utils";

export interface StudioInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  onSuccess?: () => void;
}

type SelectableUser = { id: string; nickname: string; email: string };

function toSelectable(f: Favorite): SelectableUser | null {
  const email = f.email ?? (f as unknown as { email?: string }).email;
  if (!email) return null;
  return {
    id: f.userId ?? (f as unknown as { id?: string }).id ?? "",
    nickname: f.nickname,
    email,
  };
}

function fromSearch(u: UserSearchResult): SelectableUser {
  return { id: u.id, nickname: u.nickname, email: u.email };
}

export function StudioInviteModal({
  open,
  onOpenChange,
  studioId,
  onSuccess,
}: StudioInviteModalProps) {
  const [favorites, setFavorites] = useState<SelectableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SelectableUser[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [directEmail, setDirectEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setSelectedEmails(new Set());
    setDirectEmail("");
    setSearchQuery("");
    setSearchResults([]);
    setLoadingFavorites(true);
    apiClient
      .get("/api/favorites", FavoriteListResponseSchema)
      .then((res) => {
        const list = (res.favorites ?? [])
          .map(toSelectable)
          .filter((u): u is SelectableUser => u != null);
        setFavorites(list);
      })
      .catch((e) => {
        console.error("즐겨찾기 목록 조회 실패:", e);
        setFavorites([]);
      })
      .finally(() => setLoadingFavorites(false));
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    apiClient
      .get(
        `/api/favorites/search?q=${encodeURIComponent(searchQuery)}`,
        UserSearchResponseSchema,
      )
      .then((res) => {
        const list = (res.users ?? []).map(fromSearch);
        setSearchResults(list);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [searchQuery]);

  const toggleSelect = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const inviteEmails = (): string[] => {
    const list = Array.from(selectedEmails);
    const direct = directEmail.trim();
    if (direct) list.push(direct);
    return list.filter((e) => e.length > 0);
  };

  const handleInvite = async () => {
    const emails = inviteEmails();
    if (emails.length === 0) {
      setMessage({
        type: "err",
        text: "초대할 사용자(이메일)를 선택하거나 입력하세요.",
      });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const results: { email: string; ok: boolean }[] = [];
    for (const email of emails) {
      try {
        await inviteStudioMember(studioId, { email, role: "GUEST" });
        results.push({ email, ok: true });
      } catch (error: any) {
        console.error(`[Invite] ${email} 초대 실패:`, error);
        console.error(`[Invite] 응답 데이터:`, error?.response?.data);
        results.push({ email, ok: false });
      }
    }
    setSubmitting(false);
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    if (failCount === 0) {
      setMessage({ type: "ok", text: `${okCount}명 초대 요청을 보냈습니다.` });
      onSuccess?.();
      setTimeout(() => onOpenChange(false), 1500);
    } else {
      setMessage({
        type: "err",
        text: `성공 ${okCount}명, 실패 ${failCount}명. 실패한 이메일은 이미 멤버이거나 유효하지 않을 수 있습니다.`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>스튜디오 멤버 초대</DialogTitle>
          <DialogDescription>
            친구 목록에서 선택하거나 이메일을 직접 입력하세요. 선택한 사용자마다
            초대 요청이 전송됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>이메일 직접 입력</Label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label>친구 검색</Label>
            <div className="flex gap-2">
              <Input
                placeholder="이메일 또는 닉네임"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            {searching && <p className="text-sm text-gray-400">검색 중...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-[160px] overflow-y-auto space-y-1 border border-gray-600 rounded p-2">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSelect(u.email)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-sm",
                      selectedEmails.has(u.email)
                        ? "bg-indigo-900/50 text-white"
                        : "text-gray-200 hover:bg-gray-700",
                    )}
                  >
                    {u.nickname} ({u.email})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>친구 목록</Label>
            {loadingFavorites ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : favorites.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 친구가 없습니다.</p>
            ) : (
              <div className="max-h-[160px] overflow-y-auto space-y-1 border border-gray-600 rounded p-2">
                {favorites.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSelect(u.email)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-sm",
                      selectedEmails.has(u.email)
                        ? "bg-indigo-900/50 text-white"
                        : "text-gray-200 hover:bg-gray-700",
                    )}
                  >
                    {u.nickname} ({u.email})
                  </button>
                ))}
              </div>
            )}
          </div>

          {message && (
            <p
              className={cn(
                "text-sm",
                message.type === "ok" ? "text-green-400" : "text-red-400",
              )}
            >
              {message.text}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleInvite}
            disabled={submitting || inviteEmails().length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {submitting ? "전송 중..." : "초대 보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
