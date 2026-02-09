"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/utils";

interface ShineButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "outline";
}

const wrapperVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.04,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
  },
};

const shineVariants = {
  rest: { x: "-100%" },
  hover: {
    x: "100%",
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

export function ShineButton({
  href,
  children,
  className,
  variant = "primary",
}: ShineButtonProps) {
  return (
    <Link href={href} className={cn("inline-block", className)}>
      <motion.span
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-lg font-semibold px-6 h-11",
          variant === "primary"
            ? "bg-indigo-600 text-white"
            : "border-2 border-white text-white bg-transparent"
        )}
        variants={wrapperVariants}
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
      >
        <motion.span
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          style={{ left: 0 }}
          variants={shineVariants}
        />
        <span className="relative z-10">{children}</span>
      </motion.span>
    </Link>
  );
}
