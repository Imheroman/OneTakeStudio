"use client";

import { memo, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useCollapsible } from "@/hooks/useCollapsible";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { sidebarSpring, sidebarEaseReduced } from "@/shared/lib/sidebar-motion";
import { useAuthStore } from "@/stores/useAuthStore";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { usePrefersMotion } from "@/stores/useWorkspaceDisplayStore";

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarNavItemProps {
  menu: MenuItem;
  pathname: string;
  isDark: boolean;
  shouldShowText: boolean;
  isExpanded: boolean;
}

const SidebarNavItem = memo(function SidebarNavItem({
  menu,
  pathname,
  isDark,
  shouldShowText,
  isExpanded,
}: SidebarNavItemProps) {
  const isActive = pathname === menu.href;
  const Icon = menu.icon;

  return (
    <div className="sidebar-item-hover transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.99]">
      <Link
        href={menu.href}
        className={cn(
          "flex items-center p-3 rounded-lg transition-colors group relative h-12 min-w-0",
          isActive
            ? isDark
              ? "bg-onetake-point/20 text-indigo-300"
              : "bg-onetake-point/10 text-onetake-point"
            : isDark
              ? "text-gray-400 hover:bg-gray-800 hover:text-white"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <div className="min-w-[24px] flex justify-center items-center shrink-0">
          <Icon size={24} />
        </div>
        <span
          className={cn(
            "font-medium whitespace-nowrap flex-1 min-w-0 truncate overflow-hidden origin-left transition-[opacity,max-width,margin] duration-200",
            shouldShowText ? "ease-out opacity-100 max-w-[200px] ml-4" : "ease-in opacity-0 max-w-0 ml-0"
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
    </div>
  );
});

function SidebarInner() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { open, onOpenChange, shouldShowText } = useCollapsible(false);
  const isExpanded = open;
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const prefersMotion = usePrefersMotion();
  const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/login";
  const sidebarTransition = prefersMotion ? sidebarSpring : sidebarEaseReduced;

  const menus = useMemo<MenuItem[]>(
    () => [
      { name: "대시보드", href: workspaceLink, icon: Home },
      { name: "내 보관함", href: "/library", icon: Archive },
      { name: "채널 관리", href: "/channels", icon: Radio },
      { name: "팀 관리", href: "/members", icon: Users },
      { name: "저장 공간", href: "/storage", icon: Database },
      { name: "기능", href: "/features", icon: ListChecks },
    ],
    [workspaceLink]
  );

  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <motion.aside
        layout
        layoutRoot
        className={cn(
          "h-screen border-r flex flex-col sticky top-0 z-50 shrink-0 overflow-hidden transition-[color,background-color,border-color] duration-200 transition-smooth glass-panel will-change-[width]",
          isDark
            ? "bg-gray-900/80 dark:bg-gray-900/70 border-gray-700/50"
            : "bg-white/80 border-gray-200/80"
        )}
        animate={{ width: isExpanded ? 256 : 80 }}
        transition={sidebarTransition}
      >
        <div className="flex items-center gap-2 px-3 pt-5 pb-3 shrink-0">
          <Collapsible.Trigger asChild>
            <button
              type="button"
              className={cn(
                "sidebar-item-hover flex items-center justify-center w-12 h-12 shrink-0 rounded-lg transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]",
                isDark
                  ? "bg-transparent hover:bg-gray-800 active:bg-gray-700"
                  : "bg-transparent hover:bg-gray-100 active:bg-gray-200"
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
          </Collapsible.Trigger>
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-full border px-3 py-2 text-sm min-w-0 overflow-hidden origin-left transition-[opacity,max-width,margin] duration-200",
              shouldShowText ? "ease-out opacity-100 max-w-[200px] ml-4" : "ease-in opacity-0 max-w-0 ml-0",
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
        </div>

        <Collapsible.Content forceMount asChild>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
              {menus.map((menu) => (
                <SidebarNavItem
                  key={menu.name}
                  menu={menu}
                  pathname={pathname}
                  isDark={isDark}
                  shouldShowText={shouldShowText}
                  isExpanded={isExpanded}
                />
              ))}
            </nav>

            <SidebarFooter
              isDark={isDark}
              shouldShowText={shouldShowText}
              isExpanded={isExpanded}
            />
          </div>
        </Collapsible.Content>
      </motion.aside>
    </Collapsible.Root>
  );
}

interface SidebarFooterProps {
  isDark: boolean;
  shouldShowText: boolean;
  isExpanded: boolean;
}

const SidebarFooter = memo(function SidebarFooter({
  isDark,
  shouldShowText,
  isExpanded,
}: SidebarFooterProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <div
      className={cn(
        "px-3 py-4 border-t transition-colors duration-300",
        isDark ? "border-gray-800" : "border-gray-100"
      )}
    >
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          "sidebar-item-hover flex items-center w-full p-3 h-12 rounded-lg min-w-0 group relative transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]",
          isDark
            ? "text-gray-400 hover:bg-gray-800 hover:text-red-400"
            : "text-gray-500 hover:bg-red-50 hover:text-red-500"
        )}
      >
        <div className="min-w-[24px] flex justify-center items-center shrink-0">
          <LogOut size={24} />
        </div>
        <span
          className={cn(
            "font-medium whitespace-nowrap flex-1 min-w-0 truncate overflow-hidden origin-left transition-[opacity,max-width,margin] duration-200",
            shouldShowText ? "ease-out opacity-100 max-w-[200px] ml-4" : "ease-in opacity-0 max-w-0 ml-0"
          )}
        >
          로그아웃
        </span>
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
      </button>
    </div>
  );
});

export const Sidebar = memo(SidebarInner);
