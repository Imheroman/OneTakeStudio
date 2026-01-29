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

// ✨ 쇼츠 관련 Import
import { useShortsPolling } from "@/features/shorts/useShortsPolling";
import { ShortsResultModal } from "@/widgets/shorts/shorts-result-modal";
import { useShortsStore } from "@/stores/useShortsStore";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuthStore();
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

  useEffect(() => {
    const fetchNotifications = async () => {
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

  // ✨ [핵심] 쇼츠 알림 메시지를 Notification 포맷으로 변환
  const shortsNotifications: NotificationWithActions[] = shortsMsgs.map(
    (msg, index) => ({
      id: `shorts-${index}-${Date.now()}`, // 고유 ID
      type: "ai_shorts", // 이 타입을 보고 버튼을 '결과 보기'로 바꿈
      title: "AI 쇼츠 생성 완료",
      message: msg,
      time: "방금 전",
      isRead: false,
      actions: {
        // ✨ '결과 보기' 버튼 클릭 시 실행될 함수
        accept: () => {
          openResultModal(); // 1. 모달 열기
          closeNotifications(); // 2. 알림 패널 닫기
        },
      },
    }),
  );

  // ✨ 두 리스트 합치기 (최신 쇼츠 알림이 위로 오게)
  const allNotifications = [...shortsNotifications, ...apiNotifications];

  if (isStudioPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceTopNav />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* 알림 패널 */}
      {showNotifications && (
        <NotificationPanel
          notifications={allNotifications} // ✨ 합쳐진 리스트 전달
          onClose={closeNotifications}
          onAccept={(id) => {
            // 쇼츠 알림은 클릭 시 actions.accept()가 실행되므로 여기서는 추가 로직 불필요
            // API 알림(친구 요청 등)만 목록에서 제거
            if (!id.startsWith("shorts-")) {
              setApiNotifications((prev) => prev.filter((n) => n.id !== id));
            }
          }}
          onDecline={(id) => {
            setApiNotifications((prev) => prev.filter((n) => n.id !== id));
          }}
        />
      )}

      {/* 쇼츠 결과 모달 (전역 배치) */}
      <ShortsResultModal />
    </div>
  );
}
