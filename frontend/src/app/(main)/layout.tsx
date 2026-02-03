"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/widgets/workspace/sidebar";
import { WorkspaceTopNav } from "@/widgets/workspace/top-nav";
import { NotificationPanel } from "@/widgets/workspace/notification-panel";
import type { NotificationWithActions } from "@/widgets/workspace/notification-panel";
import { NotificationListResponseSchema } from "@/entities/notification/model";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceThemeStore } from "@/stores/useWorkspaceThemeStore";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";

import { useShortsPolling } from "@/features/shorts/useShortsPolling";
import { ShortsResultModal } from "@/widgets/shorts/shorts-result-modal";
import { useShortsStore } from "@/stores/useShortsStore";
import { z } from "zod";
const MessageResponseSchema = z.object({
  message: z.string().optional(),
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, checkAuth, hasHydrated } = useAuthStore();
  const { isOpen: showNotifications, close: closeNotifications } =
    useNotificationStore();

  const [apiNotifications, setApiNotifications] = useState<
    NotificationWithActions[]
  >([]);
  const { notifications: shortsMsgs, openResultModal } = useShortsStore();

  useShortsPolling();
  const isStudioPage = pathname?.startsWith("/studio");

  // 알림 삭제 헬퍼
  const removeNotification = useCallback((notifId: string) => {
    setApiNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }, []);

  // 알림 목록 조회
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const response = await apiClient.get(
        "/api/notifications",
        NotificationListResponseSchema,
      );
      setApiNotifications(
        response.notifications.map((notif) => ({
          ...notif,
          actions:
            notif.type === "friend_request"
              ? {
                  accept: async () => {
                    try {
                      await apiClient.post(
                        `/api/favorites/requests/${notif.id}/accept`,
                        MessageResponseSchema,
                        {},
                      );
                      removeNotification(notif.id);
                    } catch (error) {
                      console.error("수락 실패:", error);
                      alert("요청 수락에 실패했습니다.");
                    }
                  },
                  decline: async () => {
                    try {
                      await apiClient.post(
                        `/api/favorites/requests/${notif.id}/decline`,
                        MessageResponseSchema,
                        {},
                      );
                      removeNotification(notif.id);
                    } catch (error) {
                      console.error("거절 실패:", error);
                      alert("요청 거절에 실패했습니다.");
                    }
                  },
                }
              : notif.type === "studio_invite" && notif.referenceId
                ? {
                    accept: async () => {
                      try {
                        await apiClient.post(
                          `/api/invites/${notif.referenceId}/accept`,
                          MessageResponseSchema,
                          {},
                        );
                        removeNotification(notif.id);
                        // 워크스페이스 데이터 갱신 트리거
                        window.dispatchEvent(new CustomEvent("studio-invite-accepted"));
                        closeNotifications();
                        alert("스튜디오 초대를 수락했습니다.");
                      } catch (error) {
                        console.error("스튜디오 초대 수락 실패:", error);
                        alert("스튜디오 초대 수락에 실패했습니다.");
                      }
                    },
                    decline: async () => {
                      try {
                        await apiClient.post(
                          `/api/invites/${notif.referenceId}/reject`,
                          MessageResponseSchema,
                          {},
                        );
                        removeNotification(notif.id);
                        closeNotifications();
                      } catch (error: unknown) {
                        // 404 에러는 이미 처리된 초대 (수락됨 또는 삭제됨) - 알림만 제거
                        const status = (error as { status?: number })?.status;
                        if (status === 404) {
                          removeNotification(notif.id);
                          closeNotifications();
                          return;
                        }
                        console.error("스튜디오 초대 거절 실패:", error);
                        alert("스튜디오 초대 거절에 실패했습니다.");
                      }
                    },
                  }
                : undefined,
        })),
      );
    } catch (error) {
      console.error("알림 목록 조회 실패:", error);
    }
  }, [isLoggedIn, removeNotification, closeNotifications]);

  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthenticated = checkAuth();
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || "/workspace")}`);
    }
  }, [hasHydrated, checkAuth, router, pathname]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const shortsNotifications: NotificationWithActions[] = shortsMsgs.map(
    (msg, index) => ({
      id: `shorts-${index}-${Date.now()}`,
      type: "ai_shorts",
      title: "AI 쇼츠 생성 완료",
      message: msg,
      time: "방금 전",
      isRead: false,
      actions: {
        accept: () => {
          openResultModal();
          closeNotifications();
        },
      },
    }),
  );

  const allNotifications = [...shortsNotifications, ...apiNotifications];

  const theme = useWorkspaceThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  if (isStudioPage) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full transition-colors duration-300",
        isDark ? "dark bg-gray-900 text-white" : "bg-white text-gray-900"
      )}
      data-theme={theme}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceTopNav />
        <main className="flex-1 overflow-auto p-8 transition-colors duration-300 bg-background text-foreground">
          {children}
        </main>
      </div>

      {showNotifications && (
        <NotificationPanel
          notifications={allNotifications}
          onClose={closeNotifications}
          onAccept={() => {}}
          onDecline={() => {}}
        />
      )}

      <ShortsResultModal />
    </div>
  );
}
