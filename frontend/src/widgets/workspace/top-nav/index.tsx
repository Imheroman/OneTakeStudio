"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useShortsStore } from "@/stores/useShortsStore";
import { useWorkspaceThemeStore, useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
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
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  const { isOpen: isNotificationOpen, open: openNotifications } =
    useNotificationStore();
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

  useEffect(() => {
    fetchNotificationCount();
  }, [fetchNotificationCount, isNotificationOpen]);

  const totalCount = notificationCount + shortsNotifications.length;
  const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/";

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative inline-flex items-center justify-center rounded-full transition-colors size-12 shrink-0",
                isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
              )}
              aria-label="프로필 메뉴"
            >
              <Avatar
                size="lg"
                className={cn(
                  "ring-2 shrink-0",
                  isDark ? "ring-gray-600" : "ring-gray-300"
                )}
              >
                <AvatarImage src={user?.profileImageUrl ?? undefined} />
                <AvatarFallback
                  className={cn(
                    "font-bold text-base",
                    isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {user?.nickname?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/mypage" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4 shrink-0" />
                마이페이지
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={workspaceLink}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4 shrink-0" />
                워크스페이스 세팅
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 cursor-pointer"
              onSelect={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
