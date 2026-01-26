import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";


interface User {
  id: string
  name: string
}

interface AuthState {
  user: User | null;
  accessToken: string | null
  isLoggedIn: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  login: (userData: User, token: string) => void; 
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoggedIn: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: (userData, token) =>
        set({
          user: userData,
          accessToken: token,
          isLoggedIn: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isLoggedIn: false,
        }),
    }),
    {
      name: "onetake-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);