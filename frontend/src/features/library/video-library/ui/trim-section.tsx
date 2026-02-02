"use client";

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TrimSectionProps {
  durationSec: number;
  startSec: number;
  endSec: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
}

export function TrimSection({
  durationSec,
  startSec,
  endSec,
  onStartChange,
  onEndChange,
}: TrimSectionProps) {
  const safeDuration = Math.max(1, durationSec);
  const start = Math.min(startSec, safeDuration - 1);
  const end = Math.min(Math.max(endSec, start + 1), safeDuration);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-800">영상 길이 조절</h3>
      <p className="text-xs text-gray-500">
        구간을 선택한 뒤 Save 버튼으로 클립을 생성할 수 있습니다.
      </p>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>시작: {formatSec(start)}</span>
            <span>종료: {formatSec(end)}</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min={0}
              max={safeDuration}
              value={start}
              onChange={(e) => onStartChange(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-blue-600"
            />
            <input
              type="range"
              min={0}
              max={safeDuration}
              value={end}
              onChange={(e) => onEndChange(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-blue-600"
            />
          </div>
          <p className="text-xs text-gray-500">
            구간 길이: {formatSec(end - start)}
          </p>
        </div>
      </div>
    </div>
  );
}
