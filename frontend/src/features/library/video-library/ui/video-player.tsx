"use client";

interface VideoPlayerProps {
  videoUrl?: string;
}

export const VideoPlayer = ({ videoUrl }: VideoPlayerProps) => {
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/80">
        <p className="text-sm">영상 URL이 없습니다.</p>
      </div>
    );
  }
  return (
    <video
      className="w-full h-full object-contain"
      src={videoUrl}
      controls
      controlsList="nodownload"
      playsInline
      preload="metadata"
    >
      브라우저가 비디오 재생을 지원하지 않습니다.
    </video>
  );
};
