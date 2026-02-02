import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WorkspaceTheme = "dark" | "light";

interface WorkspaceThemeState {
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
  toggleTheme: () => void;
}

const WORKSPACE_THEME_KEY = "workspace-theme";

export const useWorkspaceThemeStore = create<WorkspaceThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: WORKSPACE_THEME_KEY }
  )
);
