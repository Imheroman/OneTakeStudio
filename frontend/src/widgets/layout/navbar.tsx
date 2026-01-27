"use client";

import { Bell } from "lucide-react";
import { useShortsStore } from "@/stores/useShortsStore";
import { useShortsPolling } from "@/features/shorts/useShortsPolling"; // 훅 import (없으면 아래 설명 참고)
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

export const Navbar = () => {
  // ✅ 핵심: 여기서 폴링 훅을 실행해야 앱 전체에서 알림 체크가 동작합니다.
  useShortsPolling();

  const { notifications, openResultModal } = useShortsStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-50">
      {/* 로고 영역 */}
      <div className="text-xl font-bold text-indigo-600">OneTake</div>

      {/* 우측 아이콘 영역 */}
      <div className="flex items-center gap-4">
        {/* 알림 아이콘 */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 hover:bg-gray-100 rounded-full relative transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
            )}
          </button>

          {/* 알림 드롭다운 */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b font-semibold text-gray-900 flex justify-between items-center">
                <span>알림</span>
                <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  모두 읽음
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  새로운 알림이 없습니다.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((msg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        openResultModal(); // 클릭 시 결과 모달 열기
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-0 transition-colors flex items-start gap-3"
                    >
                      <div className="w-2 h-2 mt-1.5 bg-indigo-500 rounded-full shrink-0" />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {msg}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 프로필 아이콘 (예시) */}
        <div className="w-8 h-8 bg-gray-200 rounded-full border border-gray-300" />
      </div>
    </nav>
  );
};
