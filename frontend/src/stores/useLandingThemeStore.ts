import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LandingTheme = "dark" | "light";

interface LandingThemeState {
  theme: LandingTheme;
  setTheme: (theme: LandingTheme) => void;
  toggleTheme: () => void;
}

const LANDING_THEME_KEY = "landing-theme";

export const useLandingThemeStore = create<LandingThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: LANDING_THEME_KEY }
  )
);
