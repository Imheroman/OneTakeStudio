import { NextResponse } from "next/server";

/**
 * 녹화별 북마크(마커) 목록 API (목업)
 */
const MARKERS_BY_RECORDING: Record<
  string,
  Array<{ timestampSec: number; label: string | null }>
> = {
  "rec-1": [
    { timestampSec: 180, label: "인트로 하이라이트" },
    { timestampSec: 720, label: "주요 토론 시작" },
    { timestampSec: 1560, label: "결론 정리" },
  ],
  "rec-2": [
    { timestampSec: 120, label: "오프닝" },
    { timestampSec: 480, label: "핵심 내용" },
  ],
  "rec-3": [{ timestampSec: 300, label: "중요 포인트" }],
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  const { recordingId } = await params;
  const items = MARKERS_BY_RECORDING[recordingId] ?? [];
  const markers = items.map((item, i) => ({
    markerId: `m-${recordingId}-${i}`,
    recordingId,
    timestampSec: item.timestampSec,
    label: item.label,
  }));

  return NextResponse.json({
    success: true,
    data: { markers },
  });
}
