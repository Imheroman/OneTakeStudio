"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type AuthModalType = "login" | "signup" | null;

interface AuthModalContextValue {
  authModal: AuthModalType;
  openLoginModal: () => void;
  openSignupModal: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [authModal, setAuthModal] = useState<AuthModalType>(null);

  const openLoginModal = useCallback(() => setAuthModal("login"), []);
  const openSignupModal = useCallback(() => setAuthModal("signup"), []);
  const closeAuthModal = useCallback(() => setAuthModal(null), []);

  return (
    <AuthModalContext.Provider
      value={{
        authModal,
        openLoginModal,
        openSignupModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
