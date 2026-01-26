"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { IconButton } from "@/shared/common";

export function WorkspaceTopNav({ notificationCount = 3 }: { notificationCount?: number }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <Link href={user?.id ? `/workspace/${user.id}` : "/"} className="text-xl font-black italic text-indigo-600">
        OneTake
      </Link>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="font-semibold text-gray-800"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          LOGOUT
        </Button>

        <IconButton
          icon={<Bell className="h-5 w-5 text-gray-700" />}
          label="Notifications"
          badge={notificationCount > 0 ? notificationCount : undefined}
        />

        <IconButton
          icon={
            <Avatar>
              <AvatarFallback className="bg-gray-100 text-gray-700 font-bold">
                {user?.name?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          }
          label="Profile"
        />
      </div>
    </header>
  );
}
