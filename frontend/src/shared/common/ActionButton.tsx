import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface ActionButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactNode;
  external?: boolean;
}

const variantClasses = {
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  secondary: "bg-gray-900 hover:bg-gray-800 text-white",
  outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
  ghost: "text-gray-700 hover:bg-gray-100",
};

const sizeClasses = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6",
  lg: "h-12 px-8 text-lg",
};

export function ActionButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  icon,
  external = false,
}: ActionButtonProps) {
  const buttonVariant =
    variant === "outline"
      ? "outline"
      : variant === "secondary"
        ? "secondary"
        : variant === "ghost"
          ? "ghost"
          : "default";

  const content = (
    <Button
      variant={buttonVariant}
      className={cn(
        sizeClasses[size],
        variant !== "ghost" && variantClasses[variant],
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
