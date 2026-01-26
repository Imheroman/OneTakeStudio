import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  title,
  description,
  badge,
  className,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "space-y-2",
        align === "center" && "text-center",
        className
      )}
    >
      {badge && <div className="inline-block">{badge}</div>}
      <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
      {description && (
        <p className="text-gray-600 max-w-3xl">{description}</p>
      )}
    </div>
  );
}
