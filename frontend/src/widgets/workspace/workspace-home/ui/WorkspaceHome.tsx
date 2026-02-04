"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Radio,
  Video,
  VideoIcon,
  Crown,
  Shield,
  Trash2,
  Loader2,
} from "lucide-react";
import { StudioCreation } from "@/widgets/studio/studio-creation";
import { useWorkspaceHome } from "@/features/workspace/workspace-home";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";
import type { RecentStudio } from "@/entities/studio/model";

// 역할별 배지 컴포넌트
function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;

  const config = {
    HOST: {
      label: "호스트",
      icon: Crown,
      className:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    },
    MANAGER: {
      label: "관리자",
      icon: Shield,
      className:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
    },
  }[role];

  if (!config) return null;

  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

interface WorkspaceHomeProps {
  userId: string;
  userName?: string;
}

function StudioListItem({
  studio,
  isDark,
  onDelete,
  isDeleting,
}: {
  studio: RecentStudio;
  isDark: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-card flex items-center gap-4 px-4 py-3 rounded-xl transition-colors",
        isDark ? "hover:bg-white/5" : "hover:bg-gray-50/80"
      )}
    >
      <div
        className={cn(
          "shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
          isDark ? "bg-gray-800/80" : "bg-gray-100/80"
        )}
      >
        <VideoIcon
          className={cn("w-6 h-6", isDark ? "text-gray-500" : "text-gray-400")}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "font-semibold truncate",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          {studio.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <p
            className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          >
            {studio.date}
          </p>
          {studio.role && <RoleBadge role={studio.role} />}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/studio/${studio.id}`}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-onetake-point text-white hover:bg-onetake-point/90",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-onetake-point focus-visible:ring-offset-2"
          )}
        >
          입장
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(studio.id);
          }}
          disabled={isDeleting}
          className={cn(
            "p-2 rounded-lg transition-colors",
            "text-red-500 hover:bg-red-500/10 hover:text-red-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          )}
          aria-label="스튜디오 삭제"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function WorkspaceHome({ userId, userName }: WorkspaceHomeProps) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const {
    recentStudios,
    isLoading,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createDialogType,
    openCreateDialog,
    handleDeleteStudio,
    deletingId,
  } = useWorkspaceHome(userId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
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

      {/* 스튜디오 목록 섹션 */}
      <section
        className={cn(
          "rounded-2xl p-6",
          isDark
            ? "bg-white/5 backdrop-blur-sm"
            : "bg-white/70 backdrop-blur-sm",
          "border",
          isDark ? "border-white/10" : "border-gray-200/80",
          "shadow-sm"
        )}
      >
        <h2
          className={cn(
            "text-lg font-bold mb-4",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          스튜디오 목록
        </h2>
        <div className="space-y-2">
          {isLoading ? (
            <div
              className={cn(
                "py-16 text-center rounded-xl flex items-center justify-center",
                isDark
                  ? "bg-white/5 text-gray-400"
                  : "bg-gray-50/80 text-gray-500"
              )}
            >
              로딩 중...
            </div>
          ) : recentStudios.length === 0 ? (
            <div
              className={cn(
                "py-16 text-center rounded-xl",
                isDark
                  ? "bg-white/5 text-gray-400"
                  : "bg-gray-50/80 text-gray-500"
              )}
            >
              스튜디오가 없습니다.
            </div>
          ) : (
            recentStudios.map((studio) => (
              <StudioListItem
                key={studio.id}
                studio={studio}
                isDark={isDark}
                onDelete={handleDeleteStudio}
                isDeleting={deletingId === studio.id}
              />
            ))
          )}
        </div>
      </section>

      <StudioCreation
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialType={createDialogType}
      />
    </div>
  );
}
