"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Home,
  Archive,
  Radio,
  Users,
  Database,
  LogOut,
  ListChecks,
  PanelLeftClose,
  PanelLeft,
  Search,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const sidebarSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const sidebarEaseReduced = { duration: 0.08, ease: [0.4, 0, 0.2, 1] as const };
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceThemeStore, useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { usePrefersMotion } from "@/stores/useWorkspaceDisplayStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useWorkspaceThemeStore((s) => s.theme);
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const prefersMotion = usePrefersMotion();
  const sidebarTransition = prefersMotion ? sidebarSpring : sidebarEaseReduced;
  const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/login";

  const menus = [
    { name: "대시보드", href: workspaceLink, icon: Home },
    { name: "내 보관함", href: "/library", icon: Archive },
    { name: "채널 관리", href: "/channels", icon: Radio },
    { name: "팀 관리", href: "/members", icon: Users },
    { name: "저장 공간", href: "/storage", icon: Database },
    { name: "기능", href: "/features", icon: ListChecks },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <motion.aside
      layout
      className={cn(
        "h-screen border-r flex flex-col sticky top-0 z-50 shrink-0 overflow-hidden transition-[color,background-color,border-color] duration-200 transition-smooth glass-panel",
        isDark
          ? "bg-gray-900/80 dark:bg-gray-900/70 border-gray-700/50"
          : "bg-white/80 border-gray-200/80"
      )}
      animate={{ width: isExpanded ? 256 : 80 }}
      transition={sidebarTransition}
    >
      <div className="flex items-center gap-2 px-3 pt-5 pb-3 shrink-0">
        <motion.button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center justify-center w-12 h-12 shrink-0 rounded-lg",
            isDark
              ? "bg-transparent hover:bg-gray-800 active:bg-gray-700"
              : "bg-transparent hover:bg-gray-100 active:bg-gray-200"
          )}
          aria-label={isExpanded ? "사이드바 닫기" : "사이드바 열기"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
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
        </motion.button>
        {isExpanded && (
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-full border px-3 py-2 text-sm min-w-0",
              isDark
                ? "bg-gray-800/60 border-gray-700 text-gray-300 placeholder:text-gray-500"
                : "bg-gray-100/80 border-gray-200 text-gray-700 placeholder:text-gray-400"
            )}
          >
            <Search className="w-4 h-4 shrink-0 opacity-60" />
            <input
              type="text"
              placeholder="Ctrl + K"
              className="flex-1 min-w-0 bg-transparent border-none outline-none"
              readOnly
              aria-label="검색 (Ctrl + K)"
            />
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {menus.map((menu) => (
          <motion.div key={menu.name} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Link
              href={menu.href}
              className={cn(
                "flex items-center p-3 rounded-lg transition-all group relative h-12 min-w-0",
                pathname === menu.href
                  ? isDark
                    ? "bg-onetake-point/20 text-indigo-300"
                    : "bg-onetake-point/10 text-onetake-point"
                  : isDark
                    ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
            <div className="min-w-[24px] flex justify-center items-center shrink-0">
              <menu.icon size={24} />
            </div>
            <motion.span
              className="font-medium whitespace-nowrap flex-1 min-w-0 truncate overflow-hidden origin-left"
              animate={{
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? 200 : 0,
                marginLeft: isExpanded ? 16 : 0,
              }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {menu.name}
            </motion.span>
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
          </motion.div>
        ))}
      </nav>

      <div
        className={cn(
          "px-3 py-4 border-t transition-colors duration-300",
          isDark ? "border-gray-800" : "border-gray-100"
        )}
      >
        <motion.button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full p-3 h-12 rounded-lg min-w-0 group relative",
            isDark
              ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
              : "text-gray-500 hover:bg-red-50 hover:text-red-500"
          )}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="min-w-[24px] flex justify-center items-center shrink-0">
            <LogOut size={24} />
          </div>
          <motion.span
            className="font-medium whitespace-nowrap flex-1 min-w-0 truncate overflow-hidden origin-left"
            animate={{
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 200 : 0,
              marginLeft: isExpanded ? 16 : 0,
            }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            로그아웃
          </motion.span>
          {!isExpanded && (
            <div
              className={cn(
                "absolute left-14 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md",
                isDark ? "bg-gray-800 text-white" : "bg-gray-900 text-white"
              )}
            >
              로그아웃
            </div>
          )}
        </motion.button>
      </div>
    </motion.aside>
  );
}
