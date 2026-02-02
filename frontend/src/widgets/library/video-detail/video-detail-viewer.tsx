"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  VideoPlayer,
  VideoSidebar,
  AnalysisChart,
  VideoInfoSection,
  TrimSection,
} from "@/features/library/video-library";
import { DownloadVideoModal } from "@/widgets/library/download-video-modal";
import { ShortsPlaybackModal } from "@/widgets/library/shorts-playback-modal";
import { getRecordingDetail } from "@/shared/api/library";
import { apiClient } from "@/shared/api/client";
import {
  CreateClipApiResponseSchema,
  type VideoDetail,
  type Clip,
} from "@/entities/video/model";

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

  const handleSaveTrim = useCallback(async () => {
    if (!video) return;
    try {
      await apiClient.post("/api/library/clips", CreateClipApiResponseSchema, {
        recordingId: video.id,
        title: `${video.title} (편집)`,
        startTimeSec: trimStart,
        endTimeSec: trimEnd,
      });
      const data = await getRecordingDetail(videoId);
      setVideo(data as VideoDetail);
    } catch (err) {
      console.error("클립 생성 실패:", err);
    }
  }, [video, videoId, trimStart, trimEnd]);

  const handleClipClick = useCallback((clip: Clip) => {
    setPlaybackClip(clip);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#F8FAFC]">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }
  if (error || !video) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
        <p className="text-gray-600">{error ?? "비디오를 찾을 수 없습니다."}</p>
        <Link href="/library" className="text-blue-600 hover:underline">
          라이브러리로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full gap-6 p-6 bg-[#F8FAFC] box-border relative">
      <div className="flex flex-col flex-1 gap-6 overflow-y-auto pr-2 custom-scrollbar min-w-0">
        <div className="shrink-0">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-2"
          >
            <span>←</span> Back
          </Link>
        </div>
        <section className="w-full bg-black rounded-xl overflow-hidden shadow-sm aspect-video shrink-0">
          <VideoPlayer videoUrl={video.videoUrl ?? undefined} />
        </section>

        <section className="w-full bg-white rounded-xl p-6 shadow-sm min-h-[200px] border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">
            타임라인 - 시간별 댓글 분석
          </h3>
          <AnalysisChart />
        </section>

        <section className="w-full bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <TrimSection
            durationSec={parseDurationToSeconds(video.duration)}
            startSec={trimStart}
            endSec={trimEnd}
            onStartChange={setTrimStart}
            onEndChange={setTrimEnd}
          />
        </section>

        <section className="w-full bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <VideoInfoSection
            video={video}
            onDownload={() => setDownloadModalOpen(true)}
            onSaveTrim={handleSaveTrim}
          />
        </section>
      </div>

      <aside className="w-[360px] shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 font-bold text-gray-900">
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
