"use client";

// Feature 컴포넌트들 (아직 없다면 3번 단계에서 생성합니다)
import { VideoPlayer } from "@/features/library/video-library/ui/video-player";
import { VideoSidebar } from "@/features/library/video-library/ui/video-sidebar";
import { AnalysisChart } from "@/features/library/video-library/ui/analysis-chart";
import { VideoInfoSection } from "@/features/library/video-library/ui/video-info-section";

interface VideoDetailViewerProps {
  videoId: string;
}

export const VideoDetailViewer = ({ videoId }: VideoDetailViewerProps) => {
  return (
    // 전체 페이지 컨테이너 (네브바 높이 제외, 스크롤 방지)
    <div className="flex h-[calc(100vh-64px)] w-full gap-6 p-6 bg-[#F8FAFC] box-border">
      {/* [왼쪽 영역] 플레이어 + 차트 + 정보 (스크롤 가능) */}
      <div className="flex flex-col flex-1 gap-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* 1. 영상 플레이어 (검은색 영역) */}
        <section className="w-full bg-black rounded-xl overflow-hidden shadow-sm aspect-video shrink-0">
          <VideoPlayer videoId={videoId} />
        </section>

        {/* 2. 타임라인 & 분석 차트 */}
        <section className="w-full bg-white rounded-xl p-6 shadow-sm min-h-[200px] border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">
            타임라인 - 시간별 댓글 분석
          </h3>
          <AnalysisChart />
        </section>

        {/* 3. 영상 정보 & 버튼들 (다운로드, 쇼츠 생성 등) */}
        <section className="w-full bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <VideoInfoSection videoId={videoId} />
        </section>
      </div>

      {/* [오른쪽 영역] 사이드바 (영상 목록, 고정 크기) */}
      <aside className="w-[360px] shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 font-bold text-gray-900">
          영상 목록
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <VideoSidebar videoId={videoId} />
        </div>
      </aside>
    </div>
  );
};
