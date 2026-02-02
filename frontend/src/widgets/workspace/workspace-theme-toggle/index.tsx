"use client";

import { Moon, Sun } from "lucide-react";
import { useWorkspaceThemeStore } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

interface WorkspaceThemeToggleProps {
  isDark?: boolean;
  className?: string;
}

export function WorkspaceThemeToggle({
  isDark = false,
  className,
}: WorkspaceThemeToggleProps) {
  const { theme, toggleTheme } = useWorkspaceThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0",
        isDark
          ? "text-gray-300 hover:text-white hover:bg-gray-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
        className
      )}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          <span>라이트</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span>다크</span>
        </>
      )}
    </button>
  );
}
