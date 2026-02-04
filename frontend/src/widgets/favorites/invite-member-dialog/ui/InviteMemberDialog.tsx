"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Search, UserPlus } from "lucide-react";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";
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
import {
  UserSearchResponseSchema,
  type UserSearchResult,
  type UserSearchResponse,
} from "@/entities/favorite/model";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (user: UserSearchResult) => Promise<void>;
  existingFavoriteIds: string[]; // 이미 등록된 즐겨찾기 ID 목록
  maxCount: number;
  currentCount: number;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  existingFavoriteIds,
  maxCount,
  currentCount,
}: InviteMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null
  );
  const isDark = useResolvedTheme() === "dark";

  // use-debounce로 300ms debounce 적용
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!open) {
      // 다이얼로그가 닫힐 때 상태 초기화
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
    }
  }, [open]);

  // debouncedSearchQuery가 변경될 때 자동 검색
  useEffect(() => {
    // 빈 쿼리면 결과 초기화
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // 검색 실행
    const performSearch = async () => {
      try {
        setIsSearching(true);
        const response = await apiClient.get(
          `/api/favorites/search?q=${encodeURIComponent(debouncedSearchQuery)}`,
          UserSearchResponseSchema
        );
        // 이미 등록된 사용자 제외
        const filtered = response.users.filter(
          (user) => !existingFavoriteIds.includes(user.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("사용자 검색 실패:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, existingFavoriteIds]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiClient.get(
        `/api/favorites/search?q=${encodeURIComponent(searchQuery)}`,
        UserSearchResponseSchema
      );
      // 이미 등록된 사용자 제외
      const filtered = response.users.filter(
        (user) => !existingFavoriteIds.includes(user.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async () => {
    if (selectedUser) {
      await onInvite(selectedUser);
      // onInvite가 성공하면 부모 컴포넌트에서 다이얼로그를 닫음
      // 실패 시에는 다이얼로그를 열어둠
    }
  };

  const isMaxReached = currentCount >= maxCount;
  const selectedCardClass = isDark
    ? "border-indigo-500 bg-indigo-500/20"
    : "border-indigo-500 bg-indigo-50";
  const unselectedCardClass = isDark
    ? "border-white/20 hover:border-white/30 hover:bg-white/5"
    : "border-gray-200 hover:border-gray-300";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[500px]",
          isDark && "bg-[#0c0c0f] border-white/10 text-white"
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white/90")}>
            멤버 초대
          </DialogTitle>
          <DialogDescription className={cn(isDark && "text-white/70")}>
            이메일 또는 닉네임으로 파트너를 검색하여 추가하세요.
            {isMaxReached && (
              <span className="block mt-2 text-red-400 font-medium">
                최대 {maxCount}명까지 등록 가능합니다.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search" className={cn(isDark && "text-white/90")}>
              이메일 또는 닉네임
            </Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="이메일 또는 닉네임 입력"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                disabled={isMaxReached}
                className={cn(
                  isDark &&
                    "bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-white/20"
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={isSearching || isMaxReached}
                className={cn(
                  isDark &&
                    "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <Label className={cn(isDark && "text-white/90")}>검색 결과</Label>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedUser?.id === user.id
                      ? selectedCardClass
                      : unselectedCardClass
                  )}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          isDark ? "text-white/90" : "text-gray-900"
                        )}
                      >
                        {user.nickname}
                      </p>
                      <p
                        className={cn(
                          "text-sm",
                          isDark ? "text-white/60" : "text-gray-500"
                        )}
                      >
                        {user.email}
                      </p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <UserPlus className="h-5 w-5 text-indigo-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div
              className={cn(
                "text-center py-4",
                isDark ? "text-white/60" : "text-gray-500"
              )}
            >
              검색 중...
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div
              className={cn(
                "text-center py-4",
                isDark ? "text-white/60" : "text-gray-500"
              )}
            >
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(
              isDark &&
                "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            취소
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selectedUser || isMaxReached}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            초대
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
