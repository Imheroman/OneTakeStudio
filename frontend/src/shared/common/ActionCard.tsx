"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  actionLabel?: string;
  className?: string;
  iconBg?: "indigo" | "gray" | "blue";
  /** 다크 모드일 때 카드/텍스트 스타일 적용 */
  dark?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const iconBgClasses = {
  indigo: {
    light: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100",
    dark: "bg-indigo-900/50 text-indigo-300 group-hover:bg-indigo-800/50",
  },
  gray: {
    light: "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
    dark: "bg-gray-700 text-gray-300 group-hover:bg-gray-600",
  },
  blue: {
    light: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
    dark: "bg-blue-900/50 text-blue-300 group-hover:bg-blue-800/50",
  },
};

export function ActionCard({
  title,
  description,
  icon,
  href,
  actionLabel = "Start",
  className,
  iconBg = "gray",
  dark = false,
  onClick,
}: ActionCardProps) {
  const iconBgSet = iconBgClasses[iconBg][dark ? "dark" : "light"];
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={cn(
          "hover:shadow-lg transition-all transition-smooth group gpu-layer gpu-layer-hover",
          dark
            ? "border-gray-700 bg-gray-800/50 hover:bg-gray-800/70"
            : "border-gray-200",
          className
        )}
      >
      <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div
          className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
            iconBgSet
          )}
        >
          {icon}
        </div>
        <div>
          <h2
            className={cn(
              "text-xl font-bold mb-2",
              dark ? "text-gray-100" : "text-gray-900"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "text-sm max-w-xs mx-auto",
              dark ? "text-gray-400" : "text-gray-500"
            )}
          >
            {description}
          </p>
        </div>
        <Link href={href} onClick={onClick}>
          <Button className="bg-onetake-point hover:bg-onetake-point/90 px-8 py-2 h-auto text-base">
            {actionLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
    </motion.div>
  );
}
