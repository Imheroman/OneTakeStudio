"use client";

import {
  MessageSquare,
  Image,
  Palette,
  List,
  Users,
  Circle,
  CircleDot,
} from "lucide-react";
import { IconButton } from "@/shared/common";
import { cn } from "@/shared/lib/utils";

interface StudioSidebarProps {
  className?: string;
}

const sidebarItems = [
  { icon: MessageSquare, label: "Chat" },
  { icon: Image, label: "Gallery" },
  { icon: Palette, label: "Paint" },
  { icon: List, label: "List" },
  { icon: Users, label: "Users" },
];

export function StudioSidebar({ className }: StudioSidebarProps) {
  return (
    <aside
      className={cn(
        "w-16 bg-gray-900 border-l border-gray-800 flex flex-col items-center py-4 gap-3",
        className,
      )}
    >
      {sidebarItems.map((item, index) => (
        <IconButton
          key={index}
          icon={<item.icon className="h-5 w-5 text-gray-400" />}
          label={item.label}
          className="hover:bg-gray-800"
        />
      ))}

      <div className="mt-auto space-y-2">
        <div className="h-8 w-8 rounded-full bg-gray-700 border-2 border-gray-600" />
        <div className="h-8 w-8 rounded-full border-2 border-gray-600" />
      </div>
    </aside>
  );
}
