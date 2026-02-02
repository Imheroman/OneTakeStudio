"use client";

import { cn } from "@/shared/lib/utils";

interface VolumeMixerBarProps {
  /** 레벨 히스토리 [최신, ..., 과거] - 0~1 */
  levelHistory: number[];
  /** 마이크/오디오 활성 여부 */
  isActive: boolean;
  className?: string;
}

/**
 * 마이크·영상공유 오디오 레벨을 실시간 가로 막대 그래프로 표시.
 * 스튜디오 다크 테마(gray-800, indigo)에 맞춤.
 */
export function VolumeMixerBar({
  levelHistory,
  isActive,
  className,
}: VolumeMixerBarProps) {
  return (
    <div
      className={cn(
        "flex items-end gap-0.5 h-10",
        !isActive && "opacity-50",
        className
      )}
      title="음량"
    >
      {levelHistory.map((level, i) => (
        <div
          key={i}
          className="w-1.5 min-h-[2px] rounded-sm bg-gray-700 overflow-hidden flex flex-col justify-end transition-all duration-75"
          style={{ height: "100%" }}
        >
          <div
            className="w-full bg-indigo-500 rounded-sm transition-all duration-75"
            style={{
              height: `${Math.round(level * 100)}%`,
              minHeight: level > 0 ? 2 : 0,
            }}
          />
        </div>
      ))}
    </div>
  );
}
