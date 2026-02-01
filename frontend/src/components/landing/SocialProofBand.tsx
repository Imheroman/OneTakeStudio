"use client";

import { motion } from "motion/react";
import { User } from "lucide-react";
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
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={cn(
            "text-sm sm:text-base text-center sm:text-left",
            isDark ? "text-white/90" : "text-gray-800"
          )}
        >
          이미{" "}
          <strong className={isDark ? "text-white" : "text-gray-900"}>
            1,000명 이상
          </strong>
          의 크리에이터가 OneTake로 시간을 절약하고 있습니다
        </motion.p>
        <div className="flex shrink-0 items-center gap-0">
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 ring-2",
                  isDark
                    ? "border-black bg-white/10 text-white/90 ring-black"
                    : "border-gray-200 bg-gray-100 text-gray-600 ring-gray-100"
                )}
              >
                <User className="size-5" strokeWidth={2} />
              </div>
            ))}
          </div>
          <span
            className={cn(
              "ml-2 text-lg font-medium tracking-wider",
              isDark ? "text-white/70" : "text-gray-500"
            )}
          >
            ...
          </span>
        </div>
      </div>
    </section>
  );
}
