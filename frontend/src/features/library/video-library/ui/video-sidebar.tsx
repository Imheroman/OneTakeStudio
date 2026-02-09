"use client";

import type { VideoDetail, Clip } from "@/entities/video/model";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

interface VideoSidebarProps {
  video: VideoDetail;
  onClipClick?: (clip: Clip) => void;
}

export const VideoSidebar = ({ video, onClipClick }: VideoSidebarProps) => {
  const clips = video.clips ?? [];
  const isDark = useResolvedTheme() === "dark";

  return (
    <div className="space-y-6">
      <div>
        <div
          className={cn(
            "text-xs font-semibold mb-2 px-1",
            isDark ? "text-blue-400" : "text-blue-600"
          )}
        >
          원본
        </div>
        <div
          className={cn(
            "border-2 rounded-xl p-3",
            isDark
              ? "border-blue-500/60 bg-blue-500/10"
              : "border-blue-500 bg-blue-50/30"
          )}
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="aspect-video rounded-lg object-cover w-full mb-3"
            />
          ) : (
            <div className="bg-slate-800 aspect-video rounded-lg flex items-center justify-center text-white text-xs mb-3">
              Thumbnail
            </div>
          )}
          <div
            className={cn(
              "font-semibold text-sm truncate",
              isDark ? "text-white/90" : "text-gray-900"
            )}
          >
            {video.title}
          </div>
          <div
            className={cn(
              "text-xs mt-1",
              isDark ? "text-white/60" : "text-gray-500"
            )}
          >
            {video.duration}
          </div>
        </div>
      </div>

      <div className={cn("h-px", isDark ? "bg-white/10" : "bg-gray-100")} />

      <div>
        <div
          className={cn(
            "text-xs font-semibold mb-3 px-1",
            isDark ? "text-white/60" : "text-gray-500"
          )}
        >
          Shorts
        </div>
        {clips.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-3 text-xl",
                isDark ? "bg-white/10" : "bg-gray-100"
              )}
            >
              🎬
            </div>
            <p
              className={cn(
                "text-sm",
                isDark ? "text-white/60" : "text-gray-500"
              )}
            >
              아직 생성된 쇼츠가 없어요.
            </p>
            <p
              className={cn(
                "text-xs mt-1",
                isDark ? "text-white/50" : "text-gray-400"
              )}
            >
              Generate Shorts 버튼을 눌러보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onClipClick?.(clip)}
                className={cn(
                  "w-full text-left border rounded-xl p-3 transition-colors",
                  isDark
                    ? "border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                )}
              >
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.title}
                    className="aspect-video rounded-lg object-cover w-full mb-2"
                  />
                ) : (
                  <div className="bg-slate-700 aspect-video rounded-lg flex items-center justify-center text-white text-xs mb-2">
                    쇼츠
                  </div>
                )}
                <div
                  className={cn(
                    "font-medium text-sm truncate",
                    isDark ? "text-white/90" : "text-gray-900"
                  )}
                >
                  {clip.title}
                </div>
                {clip.duration && (
                  <div
                    className={cn(
                      "text-xs",
                      isDark ? "text-white/60" : "text-gray-500"
                    )}
                  >
                    {clip.duration}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
