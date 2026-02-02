"use client";

import Link from "next/link";
import { Navbar } from "@/widgets/landing/navbar";
import { LandingFooter } from "@/widgets/landing/footer";
import { ThemeToggle } from "@/widgets/landing/theme-toggle";
import { ShineButton } from "@/shared/ui/shine-button";
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
            <Link
              href="/login"
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                isDark
                  ? "text-white/80 border border-white/20 hover:bg-white/10"
                  : "text-gray-700 border border-gray-300 hover:bg-gray-100"
              )}
            >
              로그인
            </Link>
            <ShineButton href="/signup" variant="primary">
              시작하기
            </ShineButton>
          </div>
        }
      />
      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}
