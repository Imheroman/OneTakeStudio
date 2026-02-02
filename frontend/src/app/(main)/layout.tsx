"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/widgets/workspace/sidebar";
import { WorkspaceTopNav } from "@/widgets/workspace/top-nav";
import { NotificationPanel } from "@/widgets/workspace/notification-panel";
import type { NotificationWithActions } from "@/widgets/workspace/notification-panel";
import { NotificationListResponseSchema } from "@/entities/notification/model";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceThemeStore, useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { usePrefersMotion } from "@/stores/useWorkspaceDisplayStore";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";
import { useShortsPolling } from "@/features/shorts/useShortsPolling";
import { ShortsResultModal } from "@/widgets/shorts/shorts-result-modal";
import { useShortsStore } from "@/stores/useShortsStore";
import { z } from "zod";

const panelSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const panelEaseReduced = { duration: 0.08, ease: [0.4, 0, 0.2, 1] as const };
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

  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthenticated = checkAuth();
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/workspace")}`);
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
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const prefersMotion = usePrefersMotion();
  const panelTransition = prefersMotion ? panelSpring : panelEaseReduced;

  if (isStudioPage) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "flex h-screen w-full transition-colors duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        isDark
          ? "dark bg-[#0c0c0f] text-white"
          : "bg-[#f4f4f8] text-gray-900"
      )}
      data-theme={theme}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <WorkspaceTopNav />

        <div className="flex-1 flex min-w-0 min-h-0">
          <motion.main
            layout
            className="flex-1 overflow-auto p-8 transition-colors duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] bg-transparent text-foreground min-w-0 gpu-layer"
          >
            {children}
          </motion.main>

          {/* 알림 패널: Spring 물리 엔진으로 제미나이처럼 부드럽게 밀기 */}
          <motion.div
            layout
            className="shrink-0 overflow-hidden gpu-layer"
            animate={{ width: showNotifications ? 384 : 0 }}
            transition={panelTransition}
            aria-hidden={!showNotifications}
          >
            <motion.div
              layout
              className={cn(
                "h-full w-96 gpu-layer",
                showNotifications && "shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.1)]"
              )}
              animate={{ x: showNotifications ? 0 : "100%" }}
              transition={panelTransition}
            >
              <NotificationPanel
                notifications={allNotifications}
                onClose={closeNotifications}
                onAccept={() => {}}
                onDecline={() => {}}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <ShortsResultModal />
    </div>
  );
}
