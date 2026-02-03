"use client";

/**
 * 워크스페이스 메인 레이아웃 (사이드바·알림 패널·메인 영역).
 * 메인/알림은 애니메이션 없음(단일 타임라인·부하 감소). 관련 경로: docs/WORKSPACE_LAYOUT_FILES.md
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/widgets/workspace/sidebar";
import { WorkspaceTopNav } from "@/widgets/workspace/top-nav";
import { NotificationPanel } from "@/widgets/workspace/notification-panel";
import type { NotificationWithActions } from "@/widgets/workspace/notification-panel";
import { NotificationListResponseSchema } from "@/entities/notification/model";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useWorkspaceThemeStore,
  useResolvedTheme,
} from "@/stores/useWorkspaceThemeStore";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";
import { useShortsPolling } from "@/features/shorts/useShortsPolling";
import { ShortsResultModal } from "@/widgets/shorts/shorts-result-modal";
import { useShortsStore } from "@/stores/useShortsStore";
import { z } from "zod";
const MessageResponseSchema = z.object({
  message: z.string().optional(),
});

const noop = () => {};

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

  useEffect(() => {
    if (!showNotifications) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNotifications();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showNotifications, closeNotifications]);

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
        NotificationListResponseSchema
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
                        {}
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
                        {}
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
                        {}
                      );
                      removeNotification(notif.id);
                      // 워크스페이스 데이터 갱신 트리거
                      window.dispatchEvent(
                        new CustomEvent("studio-invite-accepted")
                      );
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
                        {}
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
        }))
      );
    } catch (error) {
      console.error("알림 목록 조회 실패:", error);
    }
  }, [isLoggedIn, removeNotification, closeNotifications]);

  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthenticated = checkAuth();
    if (!isAuthenticated) {
      router.replace(
        `/?auth=login&redirect=${encodeURIComponent(pathname || "/workspace")}`
      );
    }
  }, [hasHydrated, checkAuth, router, pathname]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const shortsNotifications = useMemo<NotificationWithActions[]>(
    () =>
      shortsMsgs.map((msg, index) => ({
        id: `shorts-${index}-${typeof msg === "string" ? msg : index}`,
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
      })),
    [shortsMsgs, openResultModal, closeNotifications]
  );

  const allNotifications = useMemo(
    () => [...shortsNotifications, ...apiNotifications],
    [shortsNotifications, apiNotifications]
  );

  const theme = useWorkspaceThemeStore((s) => s.theme);
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  /** 메인 콘텐츠 최소 너비: 사이드바·알림 동시 오픈 시에도 카드 영역이 줄지 않도록 */
  const MAIN_MIN_WIDTH = 720;
  const PANEL_WIDTH = 384;
  const contentMinWidth = useMemo(
    () => (showNotifications ? MAIN_MIN_WIDTH + PANEL_WIDTH : MAIN_MIN_WIDTH),
    [showNotifications]
  );
  const contentColumnStyle = useMemo(
    () => ({ minWidth: contentMinWidth }),
    [contentMinWidth]
  );
  const mainStyle = useMemo(() => ({ minWidth: MAIN_MIN_WIDTH }), []);

  if (isStudioPage) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full min-w-0 overflow-x-auto overflow-y-hidden transition-colors duration-280 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isDark ? "dark bg-[#0c0c0f] text-white" : "bg-[#f4f4f8] text-gray-900"
      )}
      data-theme={theme}
    >
      <Sidebar />

      {/* 높이 고정(h-screen), 가로만 변화 → 패널/사이드바 동시 오픈 시에도 세로 레이아웃 유지 */}
      <div
        className="flex flex-col flex-1 h-full min-h-0 shrink-0"
        style={contentColumnStyle}
      >
        <WorkspaceTopNav />

        <div className="flex flex-1 min-w-0 min-h-0">
          {/* 메인: 애니메이션 없음(알림/사이드바 영향 제거로 부하 감소), 최소 너비만 보장 */}
          <main
            className="flex-1 overflow-auto p-8 transition-colors duration-280 ease-[cubic-bezier(0.4,0,0.2,1)] bg-transparent text-foreground shrink-0 min-h-0"
            style={mainStyle}
          >
            {children}
          </main>

          {/* 알림 패널: 애니메이션 없이 표시/숨김만 */}
          {showNotifications && (
            <div
              className="shrink-0 w-96 h-full flex flex-col border-l border-gray-200/80 dark:border-gray-700/50 shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.1)] min-h-0"
              aria-hidden={false}
            >
              <NotificationPanel
                notifications={allNotifications}
                onClose={closeNotifications}
                onAccept={noop}
                onDecline={noop}
              />
            </div>
          )}
        </div>
      </div>

      <ShortsResultModal />
    </div>
  );
}
