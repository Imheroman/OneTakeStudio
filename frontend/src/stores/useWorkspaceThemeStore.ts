import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export type WorkspaceTheme = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

interface WorkspaceThemeState {
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
}

const WORKSPACE_THEME_KEY = "workspace-theme";

export const useWorkspaceThemeStore = create<WorkspaceThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    { name: WORKSPACE_THEME_KEY }
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
