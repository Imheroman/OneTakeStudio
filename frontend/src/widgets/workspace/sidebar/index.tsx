"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  BarChart2,
  Radio,
  Users,
  Database,
  LogOut,
  ListChecks,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { Logo } from "@/shared/ui/logo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isHovered, setIsHovered] = useState(false);
  const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/login";

  const menus = [
    { name: "Home", href: workspaceLink, icon: Home },
    { name: "Library", href: "/library", icon: BarChart2 },
    { name: "Channels", href: "/channels", icon: Radio },
    { name: "Members", href: "/members", icon: Users },
    { name: "Storage", href: "/storage", icon: Database },
    { name: "Features", href: "/features", icon: ListChecks },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0 z-50 transition-all duration-300 ease-in-out shadow-sm",
        isHovered ? "w-64" : "w-20",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-16 flex items-center justify-center border-b border-gray-100 overflow-hidden relative">
        <div
          className={cn(
            "transition-all duration-300 absolute",
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90",
          )}
        >
          <Logo href={workspaceLink} size="md" />
        </div>
        <div
          className={cn(
            "transition-all duration-300 absolute",
            !isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90",
          )}
        >
          <Logo href={workspaceLink} size="sm" />
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {menus.map((menu) => (
          <Link
            key={menu.name}
            href={menu.href}
            className={cn(
              "flex items-center p-3 rounded-lg transition-all group relative h-12 overflow-hidden",
              pathname === menu.href
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
            )}
          >
            <div className="min-w-[24px] flex justify-center items-center">
              <menu.icon size={24} />
            </div>
            <span
              className={cn(
                "ml-4 font-medium whitespace-nowrap transition-all duration-300",
                isHovered
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-2",
              )}
            >
              {menu.name}
            </span>
            {!isHovered && (
              <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md">
                {menu.name}
              </div>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 h-12 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors overflow-hidden group relative"
        >
          <div className="min-w-[24px] flex justify-center items-center">
            <LogOut size={24} />
          </div>
          <span
            className={cn(
              "ml-4 font-medium whitespace-nowrap transition-all duration-300",
              isHovered
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2",
            )}
          >
            Logout
          </span>
          {!isHovered && (
            <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-md">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
