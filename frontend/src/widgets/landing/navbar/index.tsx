"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/ui/logo";

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavDropdownItem {
  label: string;
  items: NavLinkItem[];
}

export type NavItem =
  | { label: string; href: string }
  | (NavDropdownItem & { dropdown: true });

interface NavbarProps {
  menuItems: NavItem[];
  rightElement?: ReactNode;
  variant?: "solid" | "glass" | "dark";
  className?: string;
}

function isDropdown(
  item: NavItem
): item is NavDropdownItem & { dropdown: true } {
  return "dropdown" in item && item.dropdown === true;
}

export function Navbar({
  menuItems,
  rightElement,
  variant = "solid",
  className,
}: NavbarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const base =
    variant === "glass"
      ? "h-16 flex items-center justify-between px-6 md:px-16 lg:px-[120px] bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/30"
      : variant === "dark"
        ? "h-16 flex items-center justify-between px-6 md:px-16 lg:px-[120px] bg-black/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10"
        : "h-16 border-b flex items-center justify-between px-6 md:px-16 lg:px-[120px] bg-white/80 backdrop-blur-md sticky top-0 z-50";

  const linkClass = cn(
    "text-sm font-medium transition-colors",
    variant === "dark"
      ? "text-white/80 hover:text-white"
      : "text-gray-600 hover:text-indigo-600"
  );

  return (
    <nav className={cn(base, className)}>
      <div className="flex items-center gap-10">
        <Logo href="/" size="md" />
        <ul className="flex gap-6 items-center">
          {menuItems.map((item) => {
            if (isDropdown(item)) {
              const isOpen = openDropdown === item.label;
              return (
                <li key={item.label} className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(isOpen ? null : item.label)
                    }
                    className={cn("flex items-center gap-1 py-2", linkClass)}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg border border-white/10 bg-black/95 backdrop-blur-md py-2 shadow-xl z-50"
                      role="listbox"
                    >
                      {item.items.map((sub) => (
                        <Link
                          key={sub.href + sub.label}
                          href={sub.href}
                          onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2.5 text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div>{rightElement}</div>
    </nav>
  );
}
