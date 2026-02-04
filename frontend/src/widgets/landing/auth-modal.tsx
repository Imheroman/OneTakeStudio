"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useAuthModal } from "./auth-modal-context";
import { cn } from "@/shared/lib/utils";

const LoginForm = dynamic(
  () =>
    import("@/features/auth/login/ui/LoginForm").then((m) => ({
      default: m.LoginForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-gray-500">로딩 중...</div>
    ),
  }
);

const SignupForm = dynamic(
  () =>
    import("@/features/auth/signup/ui/SignupForm").then((m) => ({
      default: m.SignupForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-gray-500">로딩 중...</div>
    ),
  }
);

export function AuthModal() {
  const { authModal, closeAuthModal, openLoginModal, openSignupModal } =
    useAuthModal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushedRef = useRef(false);

  // SSR 시 document 미존재 → 클라이언트 마운트 후에만 포탈 렌더
  useEffect(() => {
    setMounted(true);
  }, []);

  const prevAuthRef = useRef<typeof authModal>(null);

  // 모달 열릴 때 history push → 뒤로가기로 닫을 수 있게 (null → login/signup 시에만 push)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!authModal) {
      prevAuthRef.current = null;
      pushedRef.current = false;
      return;
    }

    const isOpening = prevAuthRef.current === null;
    prevAuthRef.current = authModal;

    if (isOpening) {
      const url = new URL(window.location.href);
      const hasAuth = url.searchParams.has("auth");

      if (hasAuth) {
        url.searchParams.set("auth", authModal);
        const withAuth = url.pathname + url.search;
        url.searchParams.delete("auth");
        const clean = url.pathname + url.search || url.pathname;
        window.history.replaceState(null, "", clean);
        window.history.pushState({ authModal: true }, "", withAuth);
      } else {
        url.searchParams.set("auth", authModal);
        window.history.pushState(
          { authModal: true },
          "",
          url.pathname + url.search
        );
      }
      pushedRef.current = true;
    } else {
      // login ↔ signup 전환 시 replaceState
      const url = new URL(window.location.href);
      url.searchParams.set("auth", authModal);
      window.history.replaceState(
        { authModal: true },
        "",
        url.pathname + url.search
      );
    }

    return () => {
      if (!authModal) pushedRef.current = false;
    };
  }, [authModal]);

  // popstate(뒤로가기) 시 모달 닫기
  useEffect(() => {
    const handlePopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
      }
      closeAuthModal();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeAuthModal]);

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

  const handleClose = useCallback(() => {
    if (pushedRef.current) {
      window.history.back();
    } else {
      closeAuthModal();
    }
  }, [closeAuthModal]);

  if (!mounted) return null;

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
            onClick={handleClose}
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
              onClick={handleClose}
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
                  onSignupSuccess={openLoginModal}
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
