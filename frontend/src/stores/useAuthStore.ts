import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/entities/user/model";
import { isTokenExpired } from "@/shared/lib/jwt";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (userData: User, accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  checkAuth: () => boolean;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoggedIn: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: (userData, accessToken, refreshToken) => {
        // 미들웨어용 쿠키 설정
        if (typeof document !== "undefined") {
          document.cookie = "onetake-authenticated=true; path=/; max-age=86400";
        }
        set({
          user: userData,
          accessToken,
          refreshToken: refreshToken || null,
          isLoggedIn: true,
        });
      },

      logout: () => {
        // 쿠키 제거
        if (typeof document !== "undefined") {
          document.cookie = "onetake-authenticated=; path=/; max-age=0";
        }
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("onetake-auth");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoggedIn: false,
        });
      },

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      /**
       * 인증 상태를 확인하고 만료된 경우 로그아웃 처리
       * @returns 유효한 인증 상태인지 여부
       */
      checkAuth: () => {
        const state = get();

        if (!state.isLoggedIn || !state.accessToken) {
          return false;
        }

        // 토큰 만료 체크
        if (isTokenExpired(state.accessToken)) {
          console.log("[Auth] 토큰이 만료되었습니다. 로그아웃 처리합니다.");
          get().logout();
          return false;
        }

        return true;
      },

      /**
       * 현재 인증 상태 확인 (로그아웃 처리 없이)
       */
      isAuthenticated: () => {
        const state = get();

        if (!state.isLoggedIn || !state.accessToken) {
          return false;
        }

        return !isTokenExpired(state.accessToken);
      },
    }),
    {
      name: "onetake-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // 리하이드레이션 후 토큰 만료 체크
        if (state) {
          setTimeout(() => {
            state.checkAuth();
          }, 0);
        }
      },
    },
  ),
);
