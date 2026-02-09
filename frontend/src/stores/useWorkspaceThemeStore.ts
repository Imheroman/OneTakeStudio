import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export type WorkspaceTheme = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

interface WorkspaceThemeState {
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
  toggleTheme: () => void;
}

/** 앱 전체(랜딩·워크스페이스) 공통 테마 저장 키 */
const APP_THEME_KEY = "app-theme";

/** 기존 landing-theme, workspace-theme → app-theme 마이그레이션 */
function migrateThemeFromLegacy(): string | null {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(APP_THEME_KEY);
  if (existing) return null; // 이미 마이그레이션됨

  const workspace = localStorage.getItem("workspace-theme");
  const landing = localStorage.getItem("landing-theme");

  if (workspace) {
    try {
      const parsed = JSON.parse(workspace);
      const theme = parsed?.state?.theme;
      if (theme === "light" || theme === "dark" || theme === "system") {
        localStorage.setItem(
          APP_THEME_KEY,
          JSON.stringify({ state: { theme }, version: 1 })
        );
        return theme;
      }
    } catch {
      /* ignore */
    }
  }

  if (landing) {
    try {
      const parsed = JSON.parse(landing);
      const theme = parsed?.state?.theme;
      if (theme === "light" || theme === "dark") {
        localStorage.setItem(
          APP_THEME_KEY,
          JSON.stringify({ state: { theme }, version: 1 })
        );
        return theme;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

export const useWorkspaceThemeStore = create<WorkspaceThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({
          theme: s.theme === "dark" ? "light" : "dark",
        })),
    }),
    {
      name: APP_THEME_KEY,
      storage: {
        getItem: (name) => {
          migrateThemeFromLegacy();
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

/** 실제 적용되는 테마(light | dark). system일 때는 OS 설정을 따름. */
export function useResolvedTheme(): ResolvedTheme {
  const theme = useWorkspaceThemeStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [theme]);

  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  return systemDark ? "dark" : "light";
}
