import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 디스플레이 밀도: 보통(기본) / 컴팩트 */
export type DisplayDensity = "comfortable" | "compact";

/** 성능 사양: 고사양(풀 애니메이션) / 보통 / 저사양(애니메이션 최소화) */
export type PerformanceTier = "high" | "medium" | "low";

interface WorkspaceDisplayState {
  /** 디스플레이 밀도 */
  density: DisplayDensity;
  setDensity: (density: DisplayDensity) => void;
  /** 성능 사양. 저사양일 때 애니메이션·효과를 줄여 저사양 기기에서도 부드럽게 동작 */
  performanceTier: PerformanceTier;
  setPerformanceTier: (tier: PerformanceTier) => void;
  /** 애니메이션 감소(접근성·저사양용) */
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

const WORKSPACE_DISPLAY_KEY = "workspace-display";

export const useWorkspaceDisplayStore = create<WorkspaceDisplayState>()(
  persist(
    (set) => ({
      density: "comfortable",
      setDensity: (density) => set({ density }),
      performanceTier: "high",
      setPerformanceTier: (performanceTier) => set({ performanceTier }),
      reducedMotion: false,
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: WORKSPACE_DISPLAY_KEY }
  )
);

/** 애니메이션을 적용할지 여부. 저사양/감소 시 false 권장 */
export function usePrefersMotion(): boolean {
  const performanceTier = useWorkspaceDisplayStore((s) => s.performanceTier);
  const reducedMotion = useWorkspaceDisplayStore((s) => s.reducedMotion);
  if (reducedMotion) return false;
  if (performanceTier === "low") return false;
  return true;
}
