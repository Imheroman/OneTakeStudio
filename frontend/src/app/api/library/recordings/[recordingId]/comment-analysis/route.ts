import { NextResponse } from "next/server";

/**
 * 시간대별 댓글 개수 분석 API (목업)
 * MSW가 가로채지 못할 때 Next.js API 라우트로 응답.
 * 백엔드 A방식 구현 시 이 라우트 제거하고 프록시로 백엔드 연결.
 */
const DURATION_BY_RECORDING: Record<string, number> = {
  "rec-1": 2538,
  "rec-2": 932,
  "rec-3": 1694,
  "rec-4": 532,
  "rec-5": 323,
};

function generateMockBuckets(
  recordingId: string,
  durationSeconds: number
): { timeSec: number; count: number }[] {
  const bucketSize = 60;
  const bucketCount = Math.ceil(durationSeconds / bucketSize);
  return Array.from({ length: bucketCount }, (_, i) => {
    const timeSec = i * bucketSize;
    const seed = (i * 7 + recordingId.length) % 10;
    const base = 3 + (seed % 8);
    const peak =
      i === Math.floor(bucketCount * 0.3) ||
      i === Math.floor(bucketCount * 0.65)
        ? 1.8
        : 1;
    const count = Math.max(0, Math.round(base * peak + (i % 5)));
    return { timeSec, count };
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  const { recordingId } = await params;
  const durationSeconds = DURATION_BY_RECORDING[recordingId] ?? 600;
  const buckets = generateMockBuckets(recordingId, durationSeconds);

  return NextResponse.json({
    success: true,
    data: {
      recordingId,
      durationSeconds,
      buckets,
    },
  });
}
