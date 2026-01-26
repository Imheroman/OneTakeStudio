// src/components/shared/Navigation/Navbar.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  menuItems: NavItem[]; // 페이지마다 달라지는 메뉴 목록
  rightElement?: ReactNode; // 로그인 버튼 혹은 프로필 아이콘
  variant?: "solid" | "glass";
  className?: string;
}

export default function Navbar({
  menuItems,
  rightElement,
  variant = "solid",
  className,
}: NavbarProps) {
  const base =
    variant === "glass"
      ? "h-16 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/30"
      : "h-16 border-b flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50";

  return (
    <nav className={cn(base, className)}>
      <div className="flex items-center gap-10">
        <Link href="/" className="text-xl font-black italic text-indigo-600">
          OneTake
        </Link>
        <ul className="flex gap-6">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>{rightElement}</div>
    </nav>
  );
}