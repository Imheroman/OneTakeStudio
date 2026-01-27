"use client";

import { useRouter } from "next/navigation";

export const VideoInfoSection = ({ videoId }: { videoId: string }) => {
  const router = useRouter();

  const handleGenerateShorts = () => {
    // 쇼츠 생성 설정 페이지로 이동
    router.push(`/library/${videoId}/shorts`);
    // router.push(`/library/${videoId}/shorts-create`);
  };

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Weekly Podcast Episode #45
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Jan 15, 2026, 03:16 PM
        </p>
        <p className="mt-4 text-gray-600 text-sm leading-relaxed max-w-2xl">
          Weekly podcast discussing the latest industry trends and insights.
          This description area can be expanded to show more details about the
          video.
        </p>
      </div>

      <div className="flex gap-3 shrink-0">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          📥 Download
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Save
        </button>
        <button
          onClick={handleGenerateShorts}
          className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-sm flex items-center gap-2 transition-colors"
        >
          ✨ Generate Shorts
        </button>
      </div>
    </div>
  );
};
