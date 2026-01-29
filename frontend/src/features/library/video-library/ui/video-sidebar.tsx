"use client";

import type { VideoDetail, Clip } from "@/entities/video/model";

interface VideoSidebarProps {
  video: VideoDetail;
  onClipClick?: (clip: Clip) => void;
}

export const VideoSidebar = ({ video, onClipClick }: VideoSidebarProps) => {
  const clips = video.clips ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold text-blue-600 mb-2 px-1">
          원본
        </div>
        <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50/30">
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
          <div className="font-semibold text-sm text-gray-900 truncate">
            {video.title}
          </div>
          <div className="text-xs text-gray-500 mt-1">{video.duration}</div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div>
        <div className="text-xs font-semibold text-gray-500 mb-3 px-1">
          Shorts
        </div>
        {clips.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-xl">
              🎬
            </div>
            <p className="text-sm text-gray-500">아직 생성된 쇼츠가 없어요.</p>
            <p className="text-xs text-gray-400 mt-1">
              Generate Shorts 또는 Save(트림) 버튼을 눌러보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onClipClick?.(clip)}
                className="w-full text-left border border-gray-200 rounded-xl p-3 hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
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
                <div className="font-medium text-sm text-gray-900 truncate">
                  {clip.title}
                </div>
                {clip.duration && (
                  <div className="text-xs text-gray-500">{clip.duration}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
