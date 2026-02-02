"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Radio, Video, Users, VideoIcon } from "lucide-react";
import { StudioCreation } from "@/widgets/studio/studio-creation";
import { useWorkspaceHome } from "@/features/workspace/workspace-home";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";
import type { RecentStudioItem } from "@/shared/api/workspace";

interface WorkspaceHomeProps {
  userId: string;
  userName?: string;
}

function StudioBentoCard({
  studio,
  isDark,
  span = 1,
}: {
  studio: RecentStudioItem;
  isDark: boolean;
  span?: 1 | 2;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={span === 2 ? "md:col-span-2" : ""}
    >
      <Link
        href={`/studio/${studio.id}`}
        className={cn(
          "glass-card gpu-layer gpu-layer-hover flex flex-col transition-shadow duration-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-onetake-point focus-visible:ring-offset-2 focus-visible:ring-offset-transparent block h-full",
          span === 2 && "md:col-span-2"
        )}
      >
      <div
        className={cn(
          "relative aspect-video w-full flex items-center justify-center shrink-0",
          isDark ? "bg-gray-800/80" : "bg-gray-100/80"
        )}
      >
        <VideoIcon
          className={cn(
            "w-12 h-12 opacity-40",
            isDark ? "text-gray-500" : "text-gray-400"
          )}
        />
        <div
          className={cn(
            "absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isDark ? "bg-gray-800/90 text-gray-300" : "bg-white/90 text-gray-600"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          팀원 —
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3
            className={cn(
              "font-semibold line-clamp-1",
              isDark ? "text-gray-100" : "text-gray-900"
            )}
          >
            {studio.title}
          </h3>
          <p
            className={cn(
              "mt-1 text-sm",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          >
            {studio.date}
          </p>
        </div>
        <span
          className={cn(
            "mt-3 inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium bg-onetake-point text-white hover:bg-onetake-point/90"
          )}
        >
          스튜디오 입장
        </span>
      </div>
      </Link>
    </motion.div>
  );
}

export function WorkspaceHome({ userId }: WorkspaceHomeProps) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const {
    recentStudios,
    dashboardStats,
    isLoading,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createDialogType,
    openCreateDialog,
  } = useWorkspaceHome(userId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {dashboardStats != null && (
        <p
          className={cn(
            "text-sm",
            isDark ? "text-gray-400" : "text-gray-500"
          )}
        >
          스튜디오 {dashboardStats.totalStudioCount}개 · 연결된 송출 채널{" "}
          {dashboardStats.connectedDestinationCount}개
        </p>
      )}

      {/* 상단 얇은 배너: 라이브 / 녹화 진입점 */}
      <div
        className={cn(
          "glass-card flex flex-col sm:flex-row rounded-xl overflow-hidden",
          isDark ? "bg-white/5" : "bg-white/70"
        )}
      >
        <motion.button
          type="button"
          onClick={() => openCreateDialog("live")}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-3.5 px-4 min-w-0",
            isDark
              ? "hover:bg-white/10 text-gray-200"
              : "hover:bg-gray-100/80 text-gray-800"
          )}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.05)" }}
          whileTap={{ scale: 0.98 }}
        >
          <Radio className="w-5 h-5 shrink-0 text-onetake-point" />
          <span className="font-medium text-sm truncate">라이브 스트리밍</span>
          <span className="text-xs opacity-70 shrink-0">시작</span>
        </motion.button>
        <div
          className={cn(
            "w-px shrink-0 self-stretch",
            isDark ? "bg-white/10" : "bg-gray-200/80"
          )}
        />
        <motion.button
          type="button"
          onClick={() => openCreateDialog("recording")}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 py-3.5 px-4 min-w-0",
            isDark
              ? "hover:bg-white/10 text-gray-200"
              : "hover:bg-gray-100/80 text-gray-800"
          )}
          whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.05)" }}
          whileTap={{ scale: 0.98 }}
        >
          <Video className="w-5 h-5 shrink-0 text-onetake-point" />
          <span className="font-medium text-sm truncate">녹화</span>
          <span className="text-xs opacity-70 shrink-0">시작</span>
        </motion.button>
      </div>

      {/* 최근 스튜디오 벤토 그리드 */}
      <div className="space-y-4">
        <h2
          className={cn(
            "text-lg font-bold",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          최근 스튜디오
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-fr">
          {isLoading ? (
            <div
              className={cn(
                "md:col-span-4 py-16 text-center rounded-2xl glass-card flex items-center justify-center",
                isDark ? "text-gray-400" : "text-gray-500"
              )}
            >
              로딩 중...
            </div>
          ) : recentStudios.length === 0 ? (
            <div
              className={cn(
                "md:col-span-4 py-16 text-center rounded-2xl glass-card",
                isDark ? "text-gray-400" : "text-gray-500"
              )}
            >
              최근 스튜디오가 없습니다.
            </div>
          ) : (
            recentStudios.map((studio, index) => (
              <StudioBentoCard
                key={studio.id}
                studio={studio}
                isDark={isDark}
                span={index === 0 ? 2 : 1}
              />
            ))
          )}
        </div>
      </div>

      <StudioCreation
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialType={createDialogType}
      />
    </div>
  );
}
