"use client";

import { Navbar } from "@/widgets/landing/navbar";
import { LandingFooter } from "@/widgets/landing/footer";
import { ThemeToggle } from "@/widgets/landing/theme-toggle";
import { AuthModalProvider } from "@/widgets/landing/auth-modal-context";
import { AuthModal } from "@/widgets/landing/auth-modal";
import { AuthButtons } from "@/widgets/landing/auth-buttons";
import { useLandingThemeStore } from "@/stores/useLandingThemeStore";
import { cn } from "@/shared/lib/utils";

const menuItems = [
  {
    label: "서비스 소개",
    dropdown: true as const,
    items: [
      { label: "YouTube 라이브 송출", href: "/#features" },
      { label: "로컬·서버 녹화", href: "/#features" },
      { label: "씬·소스·레이아웃", href: "/#features" },
      { label: "YouTube 채널 연동", href: "/#features" },
      { label: "해상도·오디오", href: "/#features" },
      { label: "녹화·라이브러리", href: "/#features" },
    ],
  },
  { label: "이용 방법", href: "/#guide" },
  { label: "문의하기", href: "/#contact" },
];

export function LandingThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useLandingThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  return (
    <AuthModalProvider>
      <div
        className={cn(
          "min-h-screen flex flex-col transition-colors duration-300",
          isDark ? "bg-[#121212] text-white" : "bg-[#F9F9F9] text-gray-900"
        )}
        data-theme={theme}
      >
        <Navbar
          variant={isDark ? "dark" : "solid"}
          menuItems={menuItems}
          rightElement={
            <div className="flex items-center gap-2">
              <ThemeToggle darkNav={isDark} />
              <AuthButtons isDark={isDark} />
            </div>
          }
        />
        <div className="flex-1">{children}</div>
        <LandingFooter />
      </div>
      <AuthModal />
    </AuthModalProvider>
  );
}
