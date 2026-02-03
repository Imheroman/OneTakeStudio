"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { LoginForm } from "@/features/auth/login/ui/LoginForm";
import { SignupForm } from "@/features/auth/signup/ui/SignupForm";
import { useAuthModal } from "./auth-modal-context";
import { cn } from "@/shared/lib/utils";

export function AuthModal() {
  const { authModal, closeAuthModal, openLoginModal, openSignupModal } =
    useAuthModal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [authModal]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      scrollTimeoutRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, authModal]);

  return createPortal(
    <AnimatePresence>
      {authModal && (
        <motion.div
          key="auth-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          initial={false}
        >
          {/* 블러 배경 - 부드러운 페이드인 */}
          <motion.button
            type="button"
            onClick={closeAuthModal}
            className="absolute inset-0 -z-10 backdrop-blur-md bg-black/40"
            aria-label="모달 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* 모달 카드 - 둥근 모서리 + 부드러운 등장 */}
          <motion.div
            className="relative w-full max-w-md max-h-[90vh] rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <button
              type="button"
              onClick={closeAuthModal}
              className={cn(
                "absolute top-4 right-4 z-10 w-10 h-10 rounded-full",
                "bg-white/90 dark:bg-gray-800/90 shadow-lg",
                "flex items-center justify-center",
                "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                "transition-colors"
              )}
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              ref={scrollRef}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className={cn(
                "overflow-y-auto overflow-x-hidden max-h-[90vh] auth-modal-scrollbar",
                (isScrolling || isHovering) && "auth-modal-scrollbar-visible"
              )}
            >
              {authModal === "login" && (
                <LoginForm onSwitchToSignup={openSignupModal} />
              )}
              {authModal === "signup" && (
                <SignupForm
                  onSwitchToLogin={openLoginModal}
                  onSignupSuccess={() => {
                    closeAuthModal();
                    openLoginModal();
                  }}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
