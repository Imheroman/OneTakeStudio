// src/app/(main)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/widgets/workspace/sidebar";
import { WorkspaceTopNav } from "@/widgets/workspace/top-nav";
import { NotificationPanel } from "@/widgets/workspace/notification-panel";
import type { NotificationWithActions } from "@/widgets/workspace/notification-panel";
import { NotificationListResponseSchema } from "@/entities/notification/model";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/shared/api/client";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuthStore();
  const { isOpen: showNotifications, close: closeNotifications } = useNotificationStore();
  const [notifications, setNotifications] = useState<NotificationWithActions[]>([]);

  // 스튜디오 페이지인지 확인
  const isStudioPage = pathname?.startsWith("/studio");

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isLoggedIn) return;
      try {
        const response = await apiClient.get(
          "/api/notifications",
          NotificationListResponseSchema,
        );
        setNotifications(
          response.notifications.map((notif) => ({
            ...notif,
            actions:
              notif.type === "friend_request" || notif.type === "studio_invite"
                ? {
                    accept: () => console.log("수락:", notif.id),
                    decline: () => console.log("거절:", notif.id),
                  }
                : undefined,
          })),
        );
      } catch (error) {
        console.error("알림 목록 조회 실패:", error);
      }
    };

    fetchNotifications();
  }, [isLoggedIn]);

  // 스튜디오 페이지는 전역 nav 없이 렌더링
  if (isStudioPage) {
    return <>{children}</>;
  }

  // 일반 워크스페이스 페이지는 nav 포함
  return (
    <div className="flex h-screen w-full">
      {/* 사이드바 고정 */}
      <Sidebar />

      {/* 우측 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceTopNav />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* 알림 패널 */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={closeNotifications}
          onAccept={(id) => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          }}
          onDecline={(id) => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          }}
        />
      )}
    </div>
  );
}
