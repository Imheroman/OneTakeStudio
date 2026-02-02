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
  ListChecks,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceThemeStore } from "@/stores/useWorkspaceThemeStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useWorkspaceThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/login";

  const menus = [
    { name: "Home", href: workspaceLink, icon: Home },
    { name: "Library", href: "/library", icon: BarChart2 },
    { name: "Channels", href: "/channels", icon: Radio },
    { name: "Members", href: "/members", icon: Users },
    { name: "Storage", href: "/storage", icon: Database },
    { name: "Features", href: "/features", icon: ListChecks },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen border-r flex flex-col sticky top-0 z-50 transition-all duration-300 ease-in-out shadow-sm",
        isDark
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200",
        isExpanded ? "w-64" : "w-20",
      )}
    >
      <div
        className={cn(
          "h-14 flex items-start justify-start px-3 pt-5 border-b overflow-hidden transition-colors duration-300",
          isDark ? "border-gray-800" : "border-gray-100"
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center justify-center w-12 h-12 p-3 rounded-lg transition-colors duration-200 shrink-0",
            isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
          )}
          aria-label={isExpanded ? "사이드바 닫기" : "사이드바 열기"}
        >
          {isExpanded ? (
            <PanelLeftClose
              className={cn("w-[28px] h-[28px]", isDark ? "text-gray-400" : "text-gray-600")}
            />
          ) : (
            <PanelLeft
              className={cn("w-[28px] h-[28px]", isDark ? "text-gray-400" : "text-gray-600")}
            />
          )}
        </button>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {menus.map((menu) => (
          <Link
            key={menu.name}
            href={menu.href}
            className={cn(
              "flex items-center p-3 rounded-lg transition-all group relative h-12 overflow-hidden",
              pathname === menu.href
                ? isDark
                  ? "bg-gray-800 text-indigo-300"
                  : "bg-indigo-50 text-indigo-600"
                : isDark
                  ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            <div className="min-w-[24px] flex justify-center items-center">
              <menu.icon size={24} />
            </div>
            <span
              className={cn(
                "ml-4 font-medium whitespace-nowrap transition-all duration-300",
                isExpanded
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-2",
              )}
            >
              {menu.name}
            </span>
            {!isExpanded && (
              <div
                className={cn(
                  "absolute left-14 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md",
                  isDark ? "bg-gray-800 text-white" : "bg-gray-900 text-white"
                )}
              >
                {menu.name}
              </div>
            )}
          </Link>
        ))}
      </nav>

      <div
        className={cn(
          "p-4 border-t transition-colors duration-300",
          isDark ? "border-gray-800" : "border-gray-100"
        )}
      >
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full p-2 h-12 rounded-lg transition-colors overflow-hidden group relative",
            isDark
              ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
              : "text-gray-500 hover:bg-red-50 hover:text-red-500"
          )}
        >
          <div className="min-w-[24px] flex justify-center items-center">
            <LogOut size={24} />
          </div>
          <span
            className={cn(
              "ml-4 font-medium whitespace-nowrap transition-all duration-300",
              isExpanded
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2",
            )}
          >
            Logout
          </span>
          {!isExpanded && (
            <div
              className={cn(
                "absolute left-14 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md",
                isDark ? "bg-gray-800 text-white" : "bg-gray-900 text-white"
              )}
            >
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
