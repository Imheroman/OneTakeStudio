"use client";

import { memo, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useShortsStore } from "@/stores/useShortsStore";
import {
  useWorkspaceThemeStore,
  useResolvedTheme,
} from "@/stores/useWorkspaceThemeStore";
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

function WorkspaceTopNavInner() {
  const { user, logout, isLoggedIn } = useAuthStore();
  const theme = useWorkspaceThemeStore((s) => s.theme);
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  const { isOpen: isNotificationOpen, toggle: toggleNotifications } =
    useNotificationStore();
  const { notifications: shortsNotifications } = useShortsStore();

  const [notificationCount, setNotificationCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const response = await apiClient.get(
        "/api/notifications",
        NotificationListResponseSchema
      );
      setNotificationCount(
        response.notifications.filter((n) => !n.read).length
      );
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
        "h-16 border-b flex items-center justify-between px-4 sticky top-0 z-40 transition-colors duration-300 transition-smooth glass-panel gpu-layer",
        isDark
          ? "bg-gray-900/80 border-gray-700/50"
          : "bg-white/80 border-gray-200/80"
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
              className={cn(
                "h-6 w-6",
                isNotificationOpen
                  ? "text-onetake-point"
                  : isDark
                  ? "text-gray-400"
                  : "text-gray-700"
              )}
            />
          }
          label="알림"
          badge={totalCount > 0 ? totalCount : undefined}
          onClick={toggleNotifications}
          size="lg"
          className={cn(
            isNotificationOpen &&
              (isDark ? "bg-onetake-point/20" : "bg-onetake-point/10")
          )}
        />

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group relative inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-1 transition-colors shrink-0",
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
                <ChevronDown
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <div
                className={cn(
                  "px-2 py-2 border-b text-sm font-medium truncate",
                  isDark
                    ? "border-gray-700 text-gray-200"
                    : "border-gray-100 text-gray-800"
                )}
              >
                {user?.nickname ?? "사용자"}
              </div>
              <DropdownMenuItem asChild>
                <Link
                  href="/mypage"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="h-4 w-4 shrink-0" />
                  마이페이지
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={
                    user?.userId
                      ? `/workspace/${user.userId}/settings`
                      : workspaceLink
                  }
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
                  window.location.href = "/?auth=login";
                }}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full py-1 pr-1.5 pl-1 shrink-0",
              isDark ? "ring-2 ring-gray-600" : "ring-2 ring-gray-300"
            )}
            aria-hidden
          >
            <Avatar size="lg" className="ring-0">
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
            <ChevronDown
              className="w-4 h-4 shrink-0 text-gray-500"
              aria-hidden
            />
          </div>
        )}
      </div>
    </header>
  );
}

export const WorkspaceTopNav = memo(WorkspaceTopNavInner);
