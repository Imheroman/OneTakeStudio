"use client";

import { motion } from "motion/react";
import { useLandingThemeStore } from "@/stores/useLandingThemeStore";
import { cn } from "@/shared/lib/utils";

export function SocialProofBand() {
  const theme = useLandingThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  return (
    <section
      className={cn(
        "relative py-6 border-y transition-colors duration-300",
        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-gray-200"
      )}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={cn(
            "text-sm sm:text-base text-center",
            isDark ? "text-white/90" : "text-gray-700"
          )}
        >
          브라우저만 있으면 바로 시작할 수 있는{" "}
          <strong className={isDark ? "text-white" : "text-gray-900"}>
            원테이크 스튜디오
          </strong>
          를 지금 체험해보세요.
        </motion.p>
      </div>
    </section>
  );
}
