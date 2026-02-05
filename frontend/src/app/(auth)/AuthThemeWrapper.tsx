"use client";

import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

export function AuthThemeWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isDark = useResolvedTheme() === "dark";

  return (
    <div
      className={cn(
        "flex min-h-screen w-full flex-col items-center justify-center p-4 transition-colors duration-200",
        isDark ? "bg-[#0c0c0f]" : "bg-gray-100/50",
        className
      )}
    >
      {children}
    </div>
  );
}
