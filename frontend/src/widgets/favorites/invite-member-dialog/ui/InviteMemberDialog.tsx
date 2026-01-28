"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Search, UserPlus } from "lucide-react";
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
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  
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
          `/api/v1/favorites/search?q=${encodeURIComponent(debouncedSearchQuery)}`,
          UserSearchResponseSchema,
        );
        // 이미 등록된 사용자 제외
        const filtered = response.users.filter(
          (user) => !existingFavoriteIds.includes(user.id),
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
        `/api/v1/favorites/search?q=${encodeURIComponent(searchQuery)}`,
        UserSearchResponseSchema,
      );
      // 이미 등록된 사용자 제외
      const filtered = response.users.filter(
        (user) => !existingFavoriteIds.includes(user.id),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>멤버 초대</DialogTitle>
          <DialogDescription>
            이메일 또는 닉네임으로 파트너를 검색하여 추가하세요.
            {isMaxReached && (
              <span className="block mt-2 text-red-500 font-medium">
                최대 {maxCount}명까지 등록 가능합니다.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">이메일 또는 닉네임</Label>
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
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || isMaxReached}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <Label>검색 결과</Label>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors
                    ${
                      selectedUser?.id === user.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }
                  `}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.nickname}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <UserPlus className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="text-center text-gray-500 py-4">검색 중...</div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selectedUser || isMaxReached}
          >
            초대
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
