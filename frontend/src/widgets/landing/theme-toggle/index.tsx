"use client";

import { Moon, Sun } from "lucide-react";
import { useLandingThemeStore } from "@/stores/useLandingThemeStore";
import { cn } from "@/shared/lib/utils";

interface ThemeToggleProps {
  /** 다크일 때 토글 스타일 (네브바가 dark variant) */
  darkNav?: boolean;
  className?: string;
}

export function ThemeToggle({ darkNav = true, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useLandingThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        darkNav
          ? "text-white/80 hover:text-white hover:bg-white/10"
          : "text-gray-600 hover:text-indigo-600 hover:bg-gray-100",
        className
      )}
    >
      {theme === "dark" ? (
        <>
          <Sun className="h-4 w-4" />
          <span>라이트 모드</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span>다크 모드</span>
        </>
      )}
    </button>
  );
}
