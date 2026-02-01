"use client";

import { Logo } from "@/shared/ui/logo";
import { useLandingThemeStore } from "@/stores/useLandingThemeStore";
import { cn } from "@/shared/lib/utils";

export function LandingFooter() {
  const theme = useLandingThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  return (
    <footer
      className={cn(
        "border-t py-8 px-6 transition-colors duration-300",
        isDark
          ? "bg-black border-white/10"
          : "bg-white border-gray-200"
      )}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Logo dark={isDark} size="md" />
          <p
            className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-600"
            )}
          >
            창작의 시간은 줄이고 가치는 높이는 통합 영상 송출 솔루션
          </p>
        </div>
        <div
          className={cn(
            "text-xs",
            isDark ? "text-white/50" : "text-gray-500"
          )}
        >
          © {new Date().getFullYear()} OneTake. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
