import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  label: string;
  badge?: number | ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function IconButton({
  icon,
  onClick,
  href,
  label,
  badge,
  className,
  size = "md",
}: IconButtonProps) {
  const baseClasses = cn(
    "relative inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors",
    sizeClasses[size],
    className
  );

  const content = (
    <>
      {icon}
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] leading-[18px] text-center font-bold">
          {typeof badge === "number" ? badge : badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses} aria-label={label}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      aria-label={label}
    >
      {content}
    </button>
  );
}
