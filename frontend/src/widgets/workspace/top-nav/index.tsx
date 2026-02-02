"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useShortsStore } from "@/stores/useShortsStore";
import { useWorkspaceThemeStore } from "@/stores/useWorkspaceThemeStore";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { IconButton } from "@/shared/common";
import { Logo } from "@/shared/ui/logo";
import { WorkspaceThemeToggle } from "@/widgets/workspace/workspace-theme-toggle";
import { apiClient } from "@/shared/api/client";
import { NotificationListResponseSchema } from "@/entities/notification/model";
import { cn } from "@/shared/lib/utils";

export function WorkspaceTopNav() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuthStore();
  const theme = useWorkspaceThemeStore((s) => s.theme);
  const isDark = theme === "dark";

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
    <header
      className={cn(
        "h-20 border-b flex items-center justify-between px-4 sticky top-0 z-40 transition-colors duration-300",
        isDark
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200"
      )}
    >
      <Logo
        href={user?.userId ? `/workspace/${user.userId}` : "/"}
        size="lg"
        dark={isDark}
      />

      <div className="flex items-center gap-4">
        <WorkspaceThemeToggle isDark={isDark} />
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            "font-semibold text-base",
            isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-800"
              : "text-gray-800 hover:bg-gray-100"
          )}
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          LOGOUT
        </Button>

        <IconButton
          icon={
            <Bell
              className={cn("h-6 w-6", isDark ? "text-gray-400" : "text-gray-700")}
            />
          }
          label="Notifications"
          badge={totalCount > 0 ? totalCount : undefined}
          onClick={openNotifications}
          size="lg"
        />

        <IconButton
          icon={
            <Avatar size="lg">
              <AvatarFallback
                className={cn(
                  "font-bold text-base",
                  isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                )}
              >
                {user?.nickname?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          }
          label="Profile"
          href="/mypage"
          size="lg"
        />
      </div>
    </header>
  );
}
