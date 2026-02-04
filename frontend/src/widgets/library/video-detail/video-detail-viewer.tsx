"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  VideoPlayer,
  VideoSidebar,
  AnalysisChart,
  TrimSection,
} from "@/features/library/video-library";
import { DownloadVideoModal } from "@/widgets/library/download-video-modal";
import { ShortsPlaybackModal } from "@/widgets/library/shorts-playback-modal";
import { getRecordingDetail } from "@/shared/api/library";
import { type VideoDetail, type Clip } from "@/entities/video/model";
import { Button } from "@/shared/ui/button";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

interface VideoDetailViewerProps {
  videoId: string;
}

export const VideoDetailViewer = ({ videoId }: VideoDetailViewerProps) => {
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [playbackClip, setPlaybackClip] = useState<Clip | null>(null);
  const router = useRouter();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecordingDetail(videoId);
        setVideo(data as VideoDetail);
        const totalSec = parseDurationToSeconds(data.duration);
        setTrimEnd(totalSec);
      } catch (err) {
        console.error("비디오 상세 조회 실패:", err);
        setError("비디오를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [videoId]);

  const handleGenerateShorts = useCallback(() => {
    if (!video) return;
    router.push(`/library/${video.id}/shorts`);
  }, [router, video]);

  const handleClipClick = useCallback((clip: Clip) => {
    setPlaybackClip(clip);
  }, []);

  if (loading) {
    return (
      <div
        className={`flex h-[calc(100vh-64px)] items-center justify-center ${
          isDark ? "bg-[#0B1020]" : "bg-[#F8FAFC]"
        }`}
      >
        <p className={isDark ? "text-white/70" : "text-gray-500"}>로딩 중...</p>
      </div>
    );
  }
  if (error || !video) {
    return (
      <div
        className={`flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 ${
          isDark ? "bg-[#0B1020]" : "bg-[#F8FAFC]"
        }`}
      >
        <p className={isDark ? "text-white/70" : "text-gray-600"}>
          {error ?? "비디오를 찾을 수 없습니다."}
        </p>
        <Link
          href="/library"
          className={
            isDark
              ? "text-indigo-300 hover:underline"
              : "text-blue-600 hover:underline"
          }
        >
          라이브러리로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full gap-6 p-6 box-border relative items-start ${
        isDark ? "bg-[#0B1020]" : "bg-[#F8FAFC]"
      }`}
    >
      {/* 메인 영역은 페이지(전체) 스크롤을 따름 */}
      <div className="flex flex-col flex-1 gap-6 min-w-0">
        <div className="shrink-0">
          <Link
            href="/library"
            className={`inline-flex items-center gap-2 text-sm font-semibold mb-2 px-3 py-2 rounded-lg border shadow-sm ${
              isDark
                ? "text-white/80 hover:text-white bg-white/5 border-white/10 hover:bg-white/10"
                : "text-gray-700 hover:text-gray-900 bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>←</span> Back
          </Link>
        </div>
        {/* 플레이어 영역 (분리) */}
        <section className="w-full bg-black rounded-xl overflow-hidden shadow-sm aspect-video shrink-0">
          <VideoPlayer videoUrl={video.videoUrl ?? undefined} />
        </section>

        {/* 영상 정보 영역 (분리) */}
        <section
          className={`w-full rounded-xl p-6 shadow-sm border ${
            isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
          }`}
        >
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1
                className={`text-2xl font-bold ${
                  isDark ? "text-white/90" : "text-gray-900"
                }`}
              >
                {video.title}
              </h1>
              <p
                className={`text-xs font-medium mt-1 ${
                  isDark ? "text-white/60" : "text-gray-500"
                }`}
              >
                {video.date}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDownloadModalOpen(true)}
              className={`shrink-0 flex items-center gap-2 ${
                isDark
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                  : ""
              }`}
            >
              📥 Download
            </Button>
          </div>
          {video.description && (
            <p
              className={`mt-4 text-sm leading-relaxed ${
                isDark ? "text-white/70" : "text-gray-600"
              }`}
            >
              {video.description}
            </p>
          )}
        </section>

        <section
          className={`w-full rounded-xl p-6 shadow-sm border mb-6 ${
            isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <h3
              className={`text-sm font-bold ${
                isDark ? "text-white/90" : "text-gray-800"
              }`}
            >
              쇼츠 생성 구간 설정
            </h3>
            <Button
              type="button"
              onClick={handleGenerateShorts}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              size="sm"
            >
              ✨ Generate Shorts
            </Button>
          </div>
          <AnalysisChart recordingId={video.id} />
          <TrimSection
            durationSec={parseDurationToSeconds(video.duration)}
            startSec={trimStart}
            endSec={trimEnd}
            onStartChange={setTrimStart}
            onEndChange={setTrimEnd}
            compact
          />
        </section>
      </div>

      <aside
        className={`w-[360px] shrink-0 rounded-xl shadow-sm border flex flex-col overflow-hidden sticky top-6 max-h-[calc(100vh-64px-48px)] ${
          isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
        }`}
      >
        <div
          className={`p-5 border-b font-bold ${
            isDark
              ? "border-white/10 text-white/90"
              : "border-gray-100 text-gray-900"
          }`}
        >
          영상 목록
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <VideoSidebar video={video} onClipClick={handleClipClick} />
        </div>
      </aside>

      <DownloadVideoModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        video={video}
      />
      <ShortsPlaybackModal
        open={!!playbackClip}
        onClose={() => setPlaybackClip(null)}
        clip={playbackClip ?? undefined}
      />
    </div>
  );
};

function parseDurationToSeconds(duration: string): number {
  const parts = duration.trim().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
