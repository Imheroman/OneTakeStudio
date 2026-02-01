import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/ui/logo";

interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  menuItems: NavItem[];
  rightElement?: ReactNode;
  variant?: "solid" | "glass";
  className?: string;
}

export function Navbar({
  menuItems,
  rightElement,
  variant = "solid",
  className,
}: NavbarProps) {
  const base =
    variant === "glass"
      ? "h-16 flex items-center justify-between px-6 md:px-16 lg:px-[120px] bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/30"
      : "h-16 border-b flex items-center justify-between px-6 md:px-16 lg:px-[120px] bg-white/80 backdrop-blur-md sticky top-0 z-50";

  return (
    <nav className={cn(base, className)}>
      <div className="flex items-center gap-10">
        <Logo href="/" size="md" />
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
