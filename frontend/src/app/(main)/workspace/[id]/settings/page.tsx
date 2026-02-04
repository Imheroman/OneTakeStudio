"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkspaceThemeStore, useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import {
  useWorkspaceDisplayStore,
  type DisplayDensity,
  type PerformanceTier,
} from "@/stores/useWorkspaceDisplayStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { Loader2, Monitor, Cpu } from "lucide-react";
import { WorkspaceThemeToggle } from "@/widgets/workspace/workspace-theme-toggle";

interface WorkspaceSettingsPageProps {
  params: Promise<{ id: string }>;
}

const isValidWorkspaceId = (id: string) =>
  id != null && id !== "" && id !== "undefined";

const DENSITY_OPTIONS: { value: DisplayDensity; label: string }[] = [
  { value: "comfortable", label: "보통" },
  { value: "compact", label: "컴팩트" },
];

const TIER_OPTIONS: { value: PerformanceTier; label: string; desc: string }[] = [
  { value: "high", label: "고사양", desc: "풀 애니메이션·효과 (권장: 고사양 PC)" },
  { value: "medium", label: "보통", desc: "일부 효과만 축소" },
  { value: "low", label: "저사양", desc: "애니메이션 최소화 (저사양·저전력 기기)" },
];

export default function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user, isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();
  const userId = decodeURIComponent(id);
  const idInvalid = !isValidWorkspaceId(id);

  const theme = useWorkspaceThemeStore((s) => s.theme);
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  const density = useWorkspaceDisplayStore((s) => s.density);
  const setDensity = useWorkspaceDisplayStore((s) => s.setDensity);
  const performanceTier = useWorkspaceDisplayStore((s) => s.performanceTier);
  const setPerformanceTier = useWorkspaceDisplayStore((s) => s.setPerformanceTier);
  const reducedMotion = useWorkspaceDisplayStore((s) => s.reducedMotion);
  const setReducedMotion = useWorkspaceDisplayStore((s) => s.setReducedMotion);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!idInvalid && user?.userId && userId !== user.userId) {
      router.replace(`/workspace/${user.userId}/settings`);
      return;
    }
  }, [hasHydrated, isLoggedIn, idInvalid, userId, user?.userId, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!isLoggedIn) return null;
  if (idInvalid) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">워크스페이스 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">워크스페이스 세팅</h1>
        <p className="text-sm text-muted-foreground mt-1">
          테마, 디스플레이, 성능 사양을 설정합니다.
        </p>
      </div>

      <Tabs defaultValue="display" className="space-y-6">
        <TabsList
          className={cn(
            "grid w-full grid-cols-2",
            isDark ? "bg-gray-800" : "bg-gray-100"
          )}
        >
          <TabsTrigger value="display">디스플레이</TabsTrigger>
          <TabsTrigger value="spec">사양</TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-6">
          <Card className={cn(isDark ? "bg-gray-900/50 border-gray-700" : "")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                테마
              </CardTitle>
              <CardDescription>라이트 / 다크 / 시스템 설정 따르기</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceThemeToggle isDark={isDark} />
              <p className="text-xs text-muted-foreground mt-2">
                현재: {theme === "system" ? "시스템" : theme === "dark" ? "다크" : "라이트"}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(isDark ? "bg-gray-900/50 border-gray-700" : "")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                디스플레이 밀도
              </CardTitle>
              <CardDescription>
                UI 요소 간격·크기 (보통 / 컴팩트)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DENSITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                    density === opt.value
                      ? isDark
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-indigo-500 bg-indigo-50"
                      : isDark
                        ? "border-gray-700 hover:bg-gray-800"
                        : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="density"
                    value={opt.value}
                    checked={density === opt.value}
                    onChange={() => setDensity(opt.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">{opt.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spec" className="space-y-6">
          <Card className={cn(isDark ? "bg-gray-900/50 border-gray-700" : "")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                성능 사양
              </CardTitle>
              <CardDescription>
                고사양: 풀 애니메이션. 저사양: 애니메이션 최소화로 저사양 기기에서도 부드럽게.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TIER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                    performanceTier === opt.value
                      ? isDark
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-indigo-500 bg-indigo-50"
                      : isDark
                        ? "border-gray-700 hover:bg-gray-800"
                        : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="tier"
                      value={opt.value}
                      checked={performanceTier === opt.value}
                      onChange={() => setPerformanceTier(opt.value)}
                      className="sr-only"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className={cn(isDark ? "bg-gray-900/50 border-gray-700" : "")}>
            <CardHeader>
              <CardTitle>애니메이션 감소</CardTitle>
              <CardDescription>
                접근성·저사양용. 애니메이션을 최소화합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label>애니메이션 감소 사용</Label>
              </label>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
