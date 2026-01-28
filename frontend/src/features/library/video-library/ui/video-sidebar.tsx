export const VideoSidebar = ({ videoId }: { videoId: string }) => {
  return (
    <div className="space-y-6">
      {/* 1. 원본 영상 카드 (Highligt) */}
      <div>
        <div className="text-xs font-semibold text-blue-600 mb-2 px-1">
          원본
        </div>
        <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50/30">
          <div className="bg-slate-800 aspect-video rounded-lg flex items-center justify-center text-white text-xs mb-3">
            Thumbnail
          </div>
          <div className="font-semibold text-sm text-gray-900 truncate">
            Weekly Podcast Episode #45
          </div>
          <div className="text-xs text-gray-500 mt-1">42:18</div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* 2. 쇼츠 리스트 (Shorts) */}
      <div>
        <div className="text-xs font-semibold text-gray-500 mb-3 px-1">
          Shorts
        </div>
        {/* 아직 생성된 게 없을 때 */}
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-xl">
            🎬
          </div>
          <p className="text-sm text-gray-500">아직 생성된 쇼츠가 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">
            Generate Shorts 버튼을 눌러보세요!
          </p>
        </div>
      </div>
    </div>
  );
};
