"use client";

import { useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { useWorkspaceThemeStore } from "@/stores/useWorkspaceThemeStore";
import type { WorkspaceTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

const SEGMENTS: {
  value: WorkspaceTheme;
  icon: typeof Monitor;
  label: string;
  description?: string;
}[] = [
  {
    value: "system",
    icon: Monitor,
    label: "오토 모드",
    description: "시스템 테마를 따릅니다.",
  },
  { value: "light", icon: Sun, label: "라이트 모드" },
  { value: "dark", icon: Moon, label: "다크 모드" },
];

interface WorkspaceThemeToggleProps {
  isDark?: boolean;
  className?: string;
}

export function WorkspaceThemeToggle({
  isDark = false,
  className,
}: WorkspaceThemeToggleProps) {
  const { theme, setTheme } = useWorkspaceThemeStore();
  const [hovered, setHovered] = useState<WorkspaceTheme | null>(null);

  return (
    <div
      role="group"
      aria-label="테마 선택"
      className={cn(
        "inline-flex items-center rounded-lg p-1 shadow-sm transition-colors shrink-0",
        isDark ? "bg-gray-800" : "bg-gray-200",
        className
      )}
    >
      {SEGMENTS.map(({ value, icon: Icon, label, description }) => {
        const isActive = theme === value;
        const isHovered = hovered === value;
        return (
          <div
            key={value}
            className="relative flex"
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              type="button"
              onClick={() => setTheme(value)}
              aria-label={label}
              aria-pressed={isActive}
              className={cn(
                "relative flex items-center justify-center size-9 transition-all duration-200",
                isActive ? "rounded-full" : "rounded-md",
                isActive
                  ? isDark
                    ? "bg-gray-700 text-indigo-400 shadow"
                    : "bg-white text-indigo-600 shadow-md"
                  : isDark
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-300/60"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
            </button>

            {isHovered && (
              <div
                role="tooltip"
                className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 px-3 py-2 min-w-[160px] max-w-[220px] rounded-lg bg-gray-900 text-white text-sm shadow-lg"
                style={{ pointerEvents: "none" }}
              >
                <span className="absolute -top-1.5 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                <div className="relative">
                  <p className="font-medium">{label}</p>
                  {description != null && (
                    <p className="mt-0.5 pl-1 text-xs text-gray-400 whitespace-normal">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
