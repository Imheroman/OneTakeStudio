"use client";

import { X, Bell } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";
import type { Notification } from "@/entities/notification/model";

export interface NotificationWithActions extends Notification {
  actions?: {
    accept?: () => void;
    decline?: () => void;
  };
}

interface NotificationPanelProps {
  notifications: NotificationWithActions[];
  onClose: () => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

export function NotificationPanel({
  notifications,
  onClose,
  onAccept,
  onDecline,
}: NotificationPanelProps) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-96 border-l shadow-xl z-50 flex flex-col transition-colors",
        isDark
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200"
      )}
    >
      {/* 헤더 */}
      <div
        className={cn(
          "h-16 border-b flex items-center justify-between px-6 shrink-0",
          isDark ? "border-gray-800" : "border-gray-200"
        )}
      >
        <h2
          className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          알림
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={cn(
            "h-8 w-8",
            isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : ""
          )}
          aria-label="알림 패널 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div
              className={cn(
                "rounded-full p-4 mb-4",
                isDark ? "bg-gray-800" : "bg-gray-100"
              )}
            >
              <Bell className={cn("h-8 w-8", isDark ? "text-gray-500" : "text-gray-400")} />
            </div>
            <p className={cn("font-medium", isDark ? "text-gray-300" : "text-gray-600")}>
              알림이 없습니다
            </p>
            <p className={cn("text-sm mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
              새 알림이 오면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "rounded-lg p-4 space-y-3 transition-colors",
                isDark
                  ? "bg-gray-800/50 border border-gray-700"
                  : "border border-gray-200 bg-gray-50/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full mt-2 shrink-0",
                    notification.read ? "bg-gray-400" : "bg-indigo-600"
                  )}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h3
                    className={cn(
                      "font-semibold text-sm truncate",
                      isDark ? "text-gray-100" : "text-gray-900"
                    )}
                  >
                    {notification.title}
                  </h3>
                  <p
                    className={cn(
                      "text-sm line-clamp-2",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    {notification.message}
                  </p>
                  {(notification.time ?? notification.createdAt) && (
                    <p className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>
                      {notification.time ?? notification.createdAt}
                    </p>
                  )}
                </div>
              </div>

              {(notification.actions?.accept ||
                notification.actions?.decline) && (
                <div className="flex gap-2 pt-2">
                  {notification.actions.accept && (
                    <Button
                      size="sm"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        notification.actions?.accept?.();
                        onAccept?.(notification.id);
                      }}
                    >
                      {notification.type === "ai_shorts" ? "결과 보기" : "수락"}
                    </Button>
                  )}
                  {notification.actions.decline && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "flex-1",
                        isDark
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : ""
                      )}
                      onClick={() => {
                        notification.actions?.decline?.();
                        onDecline?.(notification.id);
                      }}
                    >
                      거절
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
