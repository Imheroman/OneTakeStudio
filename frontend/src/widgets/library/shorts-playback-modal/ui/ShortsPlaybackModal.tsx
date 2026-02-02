"use client";

import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
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

  if (!clip) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <DialogTitle className="text-white text-base font-medium truncate">
            {clip.title}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[9/16] max-h-[70vh] bg-black flex items-center justify-center">
          {clip.url ? (
            <>
              <video
                ref={videoRef}
                src={clip.url}
                className="w-full h-full object-contain cursor-pointer"
                playsInline
                onClick={handlePlayPause}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
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
            </>
          ) : (
            <p className="text-white/70 text-sm">클릭하여 재생</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
