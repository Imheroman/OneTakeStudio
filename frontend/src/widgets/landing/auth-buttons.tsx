"use client";

import { motion } from "framer-motion";
import { useAuthModal } from "./auth-modal-context";
import { cn } from "@/shared/lib/utils";

interface AuthButtonsProps {
  isDark: boolean;
}

export function AuthButtons({ isDark }: AuthButtonsProps) {
  const { openLoginModal, openSignupModal } = useAuthModal();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={openLoginModal}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          isDark
            ? "text-white/80 border border-white/20 hover:bg-white/10"
            : "text-gray-700 border border-gray-300 hover:bg-gray-100"
        )}
      >
        로그인
      </button>
      <button
        type="button"
        onClick={openSignupModal}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-lg font-semibold px-6 h-11",
          "bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        )}
      >
        <motion.span
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        <span className="relative z-10">시작하기</span>
      </button>
    </div>
  );
}
