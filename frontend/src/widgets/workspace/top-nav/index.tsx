"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { IconButton } from "@/shared/common";
import { apiClient } from "@/shared/api/client";
import { NotificationListResponseSchema } from "@/entities/notification/model";

export function WorkspaceTopNav() {
  const router = useRouter();
  const { user, logout, isLoggedIn } = useAuthStore();
  const openNotifications = useNotificationStore((state) => state.open);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchNotificationCount = async () => {
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
    };

    fetchNotificationCount();
  }, [isLoggedIn]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <Link href={user?.id ? `/workspace/${user.id}` : "/"} className="text-xl font-black italic text-indigo-600">
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

        <IconButton
          icon={<Bell className="h-5 w-5 text-gray-700" />}
          label="Notifications"
          badge={notificationCount > 0 ? notificationCount : undefined}
          onClick={openNotifications}
        />

        <IconButton
          icon={
            <Avatar>
              <AvatarFallback className="bg-gray-100 text-gray-700 font-bold">
                {user?.name?.[0] ?? "U"}
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
