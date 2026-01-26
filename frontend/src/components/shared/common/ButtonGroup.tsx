import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  direction?: "row" | "col";
  align?: "start" | "center" | "end";
}

export function ButtonGroup({
  children,
  className,
  direction = "row",
  align = "start",
}: ButtonGroupProps) {
  const alignClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  };

  return (
    <div
      className={cn(
        "flex gap-3",
        direction === "col" ? "flex-col" : "flex-row",
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}
