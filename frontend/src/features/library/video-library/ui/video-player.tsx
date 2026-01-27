export const VideoPlayer = ({ videoId }: { videoId: string }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white relative group">
      <div className="text-2xl font-medium mb-2">Video Preview</div>
      <p className="text-gray-400 text-sm">ID: {videoId}</p>

      {/* 플레이어 컨트롤 바 (예시) */}
      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent flex items-center px-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs">0:00 / 4:23</span>
      </div>
    </div>
  );
};
