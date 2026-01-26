// src/components/organisms/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  BarChart2,
  Radio,
  Users,
  Database,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Zustand에서 로그인한 유저 정보와 로그아웃 함수 가져오기
  const { user, logout } = useAuthStore();

  // 마우스 호버 상태 관리 (true면 확장, false면 축소)
  const [isHovered, setIsHovered] = useState(false);

  // Home 버튼 클릭 시 이동할 경로 설정
  // 유저 정보가 있으면 개인 워크스페이스로, 없으면 로그인 페이지로 이동
  const workspaceLink = user?.id ? `/workspace/${user.id}` : "/login";

  // 메뉴 목록 정의 (5개)
  const menus = [
    { name: "Home", href: workspaceLink, icon: Home }, // 동적 링크 적용됨
    { name: "Library", href: "/library", icon: BarChart2 },
    { name: "Channels", href: "/channels", icon: Radio },
    { name: "Members", href: "/members", icon: Users },
    { name: "Storage", href: "/storage", icon: Database },
  ];

  const handleLogout = () => {
    logout(); // 스토어 초기화
    router.push("/login"); // 로그인 페이지로 이동
  };

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0 z-50 transition-all duration-300 ease-in-out shadow-sm",
        isHovered ? "w-64" : "w-20", // 호버 여부에 따라 너비 변경
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. 로고 영역 */}
      <div className="h-16 flex items-center justify-center border-b border-gray-100 overflow-hidden relative">
        {/* 확장되었을 때 보이는 전체 로고 */}
        <h1
          className={cn(
            "font-bold text-indigo-600 text-2xl transition-all duration-300 whitespace-nowrap absolute",
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90",
          )}
        >
          OneTake
        </h1>
        {/* 축소되었을 때 보이는 로고 (O) */}
        <span
          className={cn(
            "text-xl font-bold text-indigo-600 transition-all duration-300 absolute",
            !isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90",
          )}
        >
          O
        </span>
      </div>

      {/* 2. 네비게이션 메뉴 영역 */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {menus.map((menu) => (
          <Link
            key={menu.name}
            href={menu.href}
            className={cn(
              "flex items-center p-3 rounded-lg transition-all group relative h-12 overflow-hidden",
              pathname === menu.href
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            {/* 아이콘 (항상 중앙 정렬 유지) */}
            <div className="min-w-[24px] flex justify-center items-center">
              <menu.icon size={24} />
            </div>

            {/* 메뉴 이름 (호버 시에만 보임) */}
            <span
              className={cn(
                "ml-4 font-medium whitespace-nowrap transition-all duration-300",
                isHovered
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-2",
              )}
            >
              {menu.name}
            </span>

            {/* (옵션) 축소 상태일 때 마우스 올리면 뜨는 툴팁 */}
            {!isHovered && (
              <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md">
                {menu.name}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* 3. 하단 로그아웃 버튼 */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 h-12 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors overflow-hidden group relative"
        >
          <div className="min-w-[24px] flex justify-center items-center">
            <LogOut size={24} />
          </div>
          <span
            className={cn(
              "ml-4 font-medium whitespace-nowrap transition-all duration-300",
              isHovered
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2",
            )}
          >
            Logout
          </span>

          {/* 축소 상태 툴팁 */}
          {!isHovered && (
            <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
