import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/entities/user/model";

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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoggedIn: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: (userData, accessToken, refreshToken) =>
        set({
          user: userData,
          accessToken,
          refreshToken: refreshToken || null,
          isLoggedIn: true,
        }),

      logout: () => {
        localStorage.removeItem("refreshToken");
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
      },
    },
  ),
);