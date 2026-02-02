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

// 쇼츠 관련 Import
import { useShortsPolling } from "@/features/shorts/useShortsPolling";
import { ShortsResultModal } from "@/widgets/shorts/shorts-result-modal";
import { useShortsStore } from "@/stores/useShortsStore";

// 간단한 응답 스키마
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

  // 1. 기존 API 알림 데이터
  const [apiNotifications, setApiNotifications] = useState<
    NotificationWithActions[]
  >([]);

  // 2. 쇼츠 스토어 데이터
  const { notifications: shortsMsgs, openResultModal } = useShortsStore();

  // 폴링 시작 (백그라운드 감지)
  useShortsPolling();

  const isStudioPage = pathname?.startsWith("/studio");

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
            notif.type === "friend_request" || notif.type === "studio_invite"
              ? {
                  accept: async () => {
                    try {
                      await apiClient.post(
                        `/api/favorites/requests/${notif.id}/accept`,
                        MessageResponseSchema,
                        {},
                      );
                      // 알림 목록에서 제거
                      setApiNotifications((prev) =>
                        prev.filter((n) => n.id !== notif.id),
                      );
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
                      // 알림 목록에서 제거
                      setApiNotifications((prev) =>
                        prev.filter((n) => n.id !== notif.id),
                      );
                    } catch (error) {
                      console.error("거절 실패:", error);
                      alert("요청 거절에 실패했습니다.");
                    }
                  },
                }
              : undefined,
        })),
      );
    } catch (error) {
      console.error("알림 목록 조회 실패:", error);
    }
  }, [isLoggedIn]);

  // 인증 상태 체크 (토큰 만료 확인)
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

  // 쇼츠 알림 메시지를 Notification 포맷으로 변환
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

  // 두 리스트 합치기 (최신 쇼츠 알림이 위로 오게)
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
        isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      )}
      data-theme={theme}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceTopNav />
        <main
          className={cn(
            "flex-1 overflow-auto p-8 transition-colors duration-300",
            isDark ? "bg-gray-900" : "bg-white"
          )}
        >
          {children}
        </main>
      </div>

      {/* 알림 패널 */}
      {showNotifications && (
        <NotificationPanel
          notifications={allNotifications}
          onClose={closeNotifications}
          onAccept={(id) => {
            // actions.accept()가 실행되므로 여기서는 추가 로직 불필요
            // 쇼츠 알림만 처리 (API 알림은 accept 함수 내에서 처리)
          }}
          onDecline={(id) => {
            // actions.decline()가 실행되므로 여기서는 추가 로직 불필요
          }}
        />
      )}

      {/* 쇼츠 결과 모달 (전역 배치) */}
      <ShortsResultModal />
    </div>
  );
}
