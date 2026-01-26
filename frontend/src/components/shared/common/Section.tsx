import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

interface SectionProps {
  children: ReactNode;
  className?: string;
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "sm" | "md" | "lg" | "xl" | "none";
  id?: string;
}

const paddingClasses = {
  sm: "py-8",
  md: "py-16",
  lg: "py-20",
  xl: "py-24",
  none: "",
};

export function Section({
  children,
  className,
  containerSize = "md",
  padding = "md",
  id,
}: SectionProps) {
  return (
    <section id={id} className={cn(paddingClasses[padding], className)}>
      <Container size={containerSize}>{children}</Container>
    </section>
  );
}
