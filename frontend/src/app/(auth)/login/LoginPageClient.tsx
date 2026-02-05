"use client";

import { LoginForm } from "@/features/auth/login/ui/LoginForm";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

export function LoginPageClient() {
  const isDark = useResolvedTheme() === "dark";

  return (
    <div className="flex min-h-full w-full items-center justify-center">
      <LoginForm isDark={isDark} />
    </div>
  );
}
