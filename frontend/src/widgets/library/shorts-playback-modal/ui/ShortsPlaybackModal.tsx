"use client";

import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Play, Pause, X } from "lucide-react";
import type { Clip } from "@/entities/video/model";

interface ShortsPlaybackModalProps {
  open: boolean;
  onClose: () => void;
  clip?: Clip | null;
}

export function ShortsPlaybackModal({
  open,
  onClose,
  clip,
}: ShortsPlaybackModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    if (clip?.url) {
      videoRef.current.src = clip.url;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [open, clip?.url]);

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = v;
    setCurrentTime(v);
  };

  if (!clip) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-fit max-w-[90vw] bg-black border-white/10 p-0 overflow-hidden">
        <div className="relative">
          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 재생 화면 */}
          <div className="relative aspect-9/16 h-[92vh] max-w-[90vw] bg-black flex items-center justify-center">
            {clip.url ? (
              <video
                ref={videoRef}
                src={clip.url}
                className="w-full h-full object-contain"
                playsInline
                onLoadedMetadata={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  setDuration(Number.isFinite(v.duration) ? v.duration : 0);
                }}
                onTimeUpdate={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  setCurrentTime(v.currentTime || 0);
                }}
              />
            ) : (
              <p className="text-white/70 text-sm">
                재생할 수 없는 쇼츠입니다.
              </p>
            )}

            {/* 재생/일시정지 버튼 */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full h-14 w-14 bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={handlePlayPause}
                aria-label={isPlaying ? "일시정지" : "재생"}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 fill-white" />
                ) : (
                  <Play className="h-7 w-7 fill-white ml-0.5" />
                )}
              </Button>
            </div>

            {/* 하단 재생바 */}
            <div className="absolute left-0 right-0 bottom-0 p-3 bg-linear-to-t from-black/70 to-transparent">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0)}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1 accent-white cursor-pointer"
                aria-label="재생 위치"
                disabled={!clip.url || duration <= 0}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
