"use client";

import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
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
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* 헤더 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <h2 className="text-lg font-bold text-gray-900">알림</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500 py-8">알림이 없습니다.</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400">{notification.time}</p>
                </div>
              </div>

              {/* 액션 버튼 */}
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
                      {/* ✨ [수정] 타입에 따라 버튼 텍스트 변경 */}
                      {notification.type === "ai_shorts" ? "결과 보기" : "수락"}
                    </Button>
                  )}
                  {notification.actions.decline && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
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
