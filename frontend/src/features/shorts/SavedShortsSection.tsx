"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/client";
import { Download, Play, Film } from "lucide-react";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const SavedShortsSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      jobId: z.string(),
      videoId: z.string(),
      durationSec: z.number().nullable().optional(),
      titles: z.array(z.string()).nullable().optional(),
      streamUrl: z.string(),
      downloadUrl: z.string(),
    }),
  ),
});

type SavedShort = z.infer<typeof SavedShortsSchema>["data"][number];

interface SavedShortsSectionProps {
  recordingId: string;
}

export function SavedShortsSection({ recordingId }: SavedShortsSectionProps) {
  const [shorts, setShorts] = useState<SavedShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedShorts = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(
          `/api/ai/shorts/saved/${recordingId}`,
          SavedShortsSchema,
        );
        setShorts(response.data);
      } catch (err) {
        console.warn("저장된 숏츠 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedShorts();
  }, [recordingId]);

  if (loading) return null;
  if (shorts.length === 0) return null;

  const formatDuration = (sec?: number | null) => {
    if (!sec) return "--:--";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <section className="w-full bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-bold text-gray-800">
          저장된 AI 숏츠 ({shorts.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shorts.map((s) => {
          const key = `${s.jobId}/${s.videoId}`;
          const isPlaying = playingId === key;

          return (
            <div
              key={key}
              className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 hover:shadow-md transition-shadow"
            >
              {/* 비디오 미리보기 */}
              <div className="aspect-[9/16] max-h-[320px] bg-black relative">
                {isPlaying ? (
                  <video
                    src={`${API_BASE}${s.streamUrl}`}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <button
                    onClick={() => setPlayingId(key)}
                    className="w-full h-full flex items-center justify-center group"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all shadow-lg">
                      <Play className="w-6 h-6 text-purple-600 ml-1" />
                    </div>
                  </button>
                )}
              </div>

              {/* 정보 + 다운로드 */}
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                  {s.titles?.[0] ?? s.videoId}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDuration(s.durationSec)}
                  </span>
                  <a
                    href={`${API_BASE}${s.downloadUrl}`}
                    download
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    다운로드
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
