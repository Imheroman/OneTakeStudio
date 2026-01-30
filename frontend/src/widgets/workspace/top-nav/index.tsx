"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useShortsStore } from "@/stores/useShortsStore"; // 쇼츠 스토어
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { IconButton } from "@/shared/common";
import { apiClient } from "@/shared/api/client";
import { NotificationListResponseSchema } from "@/entities/notification/model";

export function WorkspaceTopNav() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuthStore();

  // 알림 패널 상태 (Zustand)
  const { isOpen: isNotificationOpen, open: openNotifications } = useNotificationStore();

  // 쇼츠 알림 상태 (배지 개수 계산용)
  const { notifications: shortsNotifications } = useShortsStore();

  const [notificationCount, setNotificationCount] = useState(0);

  const fetchNotificationCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const response = await apiClient.get(
        "/api/notifications",
        NotificationListResponseSchema,
      );
      setNotificationCount(response.notifications.length);
    } catch (error) {
      console.error("알림 개수 조회 실패:", error);
    }
  }, [isLoggedIn]);

  // 초기 로드 및 알림 패널이 닫힐 때 카운트 새로고침
  useEffect(() => {
    fetchNotificationCount();
  }, [fetchNotificationCount, isNotificationOpen]);

  // 배지: API 알림 + 쇼츠 알림 합산
  const totalCount = notificationCount + shortsNotifications.length;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <Link
        href={user?.userId ? `/workspace/${user.userId}` : "/"}
        className="text-xl font-black italic text-indigo-600"
      >
        OneTake
      </Link>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="font-semibold text-gray-800"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          LOGOUT
        </Button>

        {/* ✨ [수정] 클릭 시 무조건 알림 패널만 엽니다 (배지 숫자는 유지) */}
        <IconButton
          icon={<Bell className="h-5 w-5 text-gray-700" />}
          label="Notifications"
          badge={totalCount > 0 ? totalCount : undefined}
          onClick={openNotifications}
        />

        <IconButton
          icon={
            <Avatar>
              <AvatarFallback className="bg-gray-100 text-gray-700 font-bold">
                {user?.nickname?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          }
          label="Profile"
          href="/mypage"
        />
      </div>
    </header>
  );
}
