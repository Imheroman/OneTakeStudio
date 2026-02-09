import { http, HttpResponse, passthrough } from "msw";

// MSW는 상대 경로를 가로채므로 BASE_URL은 빈 문자열로 설정
// 실제 API 요청은 apiClient의 baseURL 설정을 따름
const BASE_URL = "";

// 타입 정의 (entities에서 import하지 않고 여기서 정의 - MSW는 독립적)
type PlatformType = "youtube" | "twitch" | "facebook" | "custom_rtmp";

// MSW 메모리 기반 상태 관리 (즐겨찾기) — 스튜디오 초대 시 email 필요
interface Favorite {
  id: string;
  userId?: string;
  nickname: string;
  email?: string;
}

// 초기 즐겨찾기 데이터 (email 포함)
let favorites: Favorite[] = [
  {
    id: "admin",
    userId: "admin",
    nickname: "나는 동언",
    email: "admin@example.com",
  },
  {
    id: "editor",
    userId: "editor",
    nickname: "나는 범수",
    email: "editor@example.com",
  },
  {
    id: "collaborator",
    userId: "collaborator",
    nickname: "어드민 히로",
    email: "collaborator@example.com",
  },
  {
    id: "designer",
    userId: "designer",
    nickname: "골드 태현",
    email: "designer@example.com",
  },
];

const MAX_FAVORITES = 10;

// 녹화 상태 (MSW 메모리)
const recordingState: {
  active: { studioId: number; recordingId: string } | null;
  list: {
    recordingId: string;
    studioId: number;
    fileName: string;
    startedAt: string;
    durationSeconds: number;
  }[];
} = { active: null, list: [] };

// [추가] 쇼츠 생성 상태 변수 (핸들러 밖에서 선언해야 상태가 유지됨)
let shortsServerState = {
  isGenerating: false,
  startTime: 0,
  completedCount: 0,
  videoId: "",
};

// MSW 메모리 기반 상태 관리 (채널)
interface Channel {
  id: string;
  platform: PlatformType;
  accountName: string;
  status: "connected" | "disconnected";
  connectedAt?: string;
  disconnectedAt?: string;
}

// 초기 채널 데이터
const channels: Channel[] = [
  {
    id: "channel_1",
    platform: "youtube",
    accountName: "mystream@gmail.com",
    status: "connected",
    connectedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "channel_2",
    platform: "youtube",
    accountName: "substream@gmail.com",
    status: "connected",
    connectedAt: "2026-01-14T15:30:00Z",
  },
  {
    id: "channel_3",
    platform: "twitch",
    accountName: "streamuser123",
    status: "connected",
    connectedAt: "2026-01-13T09:20:00Z",
  },
  {
    id: "channel_4",
    platform: "custom_rtmp",
    accountName: "rtmp://custom-server.com",
    status: "disconnected",
    disconnectedAt: "2026-01-12T14:00:00Z",
  },
];

export const handlers = [
  http.all("/_next/*", () => passthrough()),
  http.post("/__nextjs_original-stack-frames", () => passthrough()),
  // 주소 앞에 BASE_URL을 붙여서 MSW가 8080 포트 요청도 가로채게 만듭니다.
  http.post(`${BASE_URL}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { email, password } = body;

    console.log(`[MSW] 로그인 요청: ${email}`);

    // 테스트용 이메일/비밀번호
    if (email === "test@example.com" && password === "12345678") {
      // 서버에서 생성된 고유 ID (실제로는 UUID 등 사용)
      const userId = "user_" + Math.random().toString(36).substring(2, 11);
      // 유효한 JWT 형식 (header.payload.signature) - exp가 없으면 isTokenExpired가 만료로 처리됨
      const mockJwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.c2ln";
      // 실제 API 응답 형식에 맞춤
      return HttpResponse.json(
        {
          success: true,
          message: "로그인 성공",
          data: {
            accessToken: mockJwt,
            refreshToken: "fake-refresh-token-one-take",
            user: {
              userId: userId,
              email: email,
              nickname: "테스트 사용자",
              profileImageUrl: null,
            },
          },
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      {
        success: false,
        message: "이메일 또는 비밀번호가 일치하지 않습니다.",
      },
      { status: 401 }
    );
  }),

  // 회원가입 모의 API
  http.post("/api/auth/signup", async ({ request }) => {
    const body = (await request.json()) as any;
    const { email, name } = body;

    console.log(`[MSW] 회원가입 요청: ${email} (${name})`);

    // 이미 존재하는 이메일이라고 가정하고 에러 띄우기 테스트 (필요시 주석 해제)
    // if (email === 'duplicate@example.com') {
    //   return HttpResponse.json({ message: "이미 사용 중인 이메일입니다." }, { status: 409 });
    // }

    // 서버에서 생성된 고유 ID (실제로는 UUID 등 사용)
    const userId = "user_" + Math.random().toString(36).substring(2, 11);

    // 성공 시: 자동 로그인을 위한 토큰과 유저 정보를 함께 반환
    return HttpResponse.json({
      message: "회원가입이 완료되었습니다.",
      accessToken: "fake-jwt-token-new-user",
      user: {
        id: userId, // 서버에서 생성된 고유 ID
        email: email,
        name: name,
      },
    });
  }),

  // 워크스페이스 최근 스튜디오 목록
  http.get(`${BASE_URL}/api/workspace/:userId/studios/recent`, async () => {
    console.log("[MSW] 최근 스튜디오 목록 요청");
    return HttpResponse.json({
      studios: [
        { id: 1, title: "Weekly Podcast Studio", date: "Jan 15, 2026" },
        { id: 2, title: "Product Demo Setup", date: "Jan 14, 2026" },
        { id: 3, title: "Team Meeting Room", date: "Jan 12, 2026" },
        { id: 4, title: "Gaming Stream Studio", date: "Jan 10, 2026" },
        { id: 5, title: "Tutorial Recording Space", date: "Jan 8, 2026" },
      ],
    });
  }),

  // 스토리지 정보 조회 — GET /api/storage (StorageController 형식)
  http.get(`${BASE_URL}/api/storage`, async () => {
    console.log("[MSW] 스토리지 정보 요청");
    return HttpResponse.json({
      total: 50.0,
      used: 40.09,
      available: 9.91,
      videoUsage: 40.2,
      assetUsage: 4.89,
      usedBytes: 43048912896,
      limitBytes: 53687091200,
      usedPercentage: 80.18,
      usedFormatted: "40.09 GB",
      limitFormatted: "50.00 GB",
    });
  }),

  // 스토리지 파일 목록 조회 — GET /api/storage/files (StorageController 형식)
  http.get(`${BASE_URL}/api/storage/files`, async ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 50);
    console.log("[MSW] 스토리지 파일 목록 요청", `page=${page} size=${size}`);

    const allFiles = [
      {
        id: "rec-1",
        title: "Weekly Podcast Episode #45",
        name: "Weekly Podcast Episode #45",
        date: "2026-01-15 15:16",
        uploadedAt: "2026-01-15T15:16:00.000Z",
        size: "4.20 GB",
        sizeBytes: 4509715660,
        type: "Recording",
        status: "Uploaded",
        thumbnailUrl: null,
      },
      {
        id: "rec-2",
        title: "Product Demo - Q1 Launch",
        name: "Product Demo - Q1 Launch",
        date: "2026-01-14 10:30",
        uploadedAt: "2026-01-14T10:30:00.000Z",
        size: "1.20 GB",
        sizeBytes: 1288490188,
        type: "Recording",
        status: "Uploaded",
        thumbnailUrl: null,
      },
      {
        id: "rec-3",
        title: "Tutorial: Getting Started",
        name: "Tutorial: Getting Started",
        date: "2026-01-12 09:15",
        uploadedAt: "2026-01-12T09:15:00.000Z",
        size: "2.80 GB",
        sizeBytes: 3006477107,
        type: "Recording",
        status: "Uploaded",
        thumbnailUrl: null,
      },
      {
        id: "rec-4",
        title: "Live Stream Highlight Reel",
        name: "Live Stream Highlight Reel",
        date: "2026-01-10 16:00",
        uploadedAt: "2026-01-10T16:00:00.000Z",
        size: "800.00 MB",
        sizeBytes: 858993459,
        type: "Recording",
        status: "Uploaded",
        thumbnailUrl: null,
      },
    ];

    const start = page * size;
    const paginatedFiles = allFiles.slice(start, start + size);
    const totalElements = allFiles.length;

    return HttpResponse.json({
      files: paginatedFiles,
      totalPages: Math.ceil(totalElements / size) || 1,
      totalElements,
      currentPage: page,
    });
  }),

  // --- 라이브러리(녹화) API (실제 사용: /api/library/recordings) ---
  // 녹화 목록 조회
  http.get(`${BASE_URL}/api/library/recordings`, async ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 20);
    const studioId = url.searchParams.get("studioId");

    console.log(
      "[MSW] 녹화 목록 요청",
      studioId ? `(studioId: ${studioId})` : "",
      `page=${page}, size=${size}`
    );

    const allRecordings = [
      {
        recordingId: "rec-1",
        studioId: 1,
        userId: "user-1",
        title: "Weekly Podcast Episode #45",
        description: "Weekly podcast discussing the latest trends.",
        thumbnailUrl: null as string | null,
        fileUrl: "https://example.com/video1.mp4",
        fileSize: 512000000,
        durationSeconds: 2538,
        status: "READY" as const,
        createdAt: "2026-01-15T15:16:00Z",
        updatedAt: "2026-01-15T15:16:00Z",
      },
      {
        recordingId: "rec-2",
        studioId: 1,
        userId: "user-1",
        title: "Product Demo - Q1 Launch",
        description: null,
        thumbnailUrl: null,
        fileUrl: null,
        fileSize: null,
        durationSeconds: 932,
        status: "READY" as const,
        createdAt: "2026-01-14T10:30:00Z",
        updatedAt: "2026-01-14T10:30:00Z",
      },
      {
        recordingId: "rec-3",
        studioId: 2,
        userId: "user-1",
        title: "Tutorial: Getting Started",
        description: null,
        thumbnailUrl: null,
        fileUrl: null,
        fileSize: null,
        durationSeconds: 1694,
        status: "PROCESSING" as const,
        createdAt: "2026-01-12T09:00:00Z",
        updatedAt: "2026-01-12T09:00:00Z",
      },
      {
        recordingId: "rec-4",
        studioId: 1,
        userId: "user-1",
        title: "Live Stream Highlight Reel",
        description: null,
        thumbnailUrl: null,
        fileUrl: null,
        fileSize: null,
        durationSeconds: 532,
        status: "READY" as const,
        createdAt: "2026-01-10T14:20:00Z",
        updatedAt: "2026-01-10T14:20:00Z",
      },
      {
        recordingId: "rec-5",
        studioId: 1,
        userId: "user-1",
        title: "Summer Vlog Highlights",
        description: null,
        thumbnailUrl: null,
        fileUrl: null,
        fileSize: null,
        durationSeconds: 323,
        status: "READY" as const,
        createdAt: "2026-01-08T11:45:00Z",
        updatedAt: "2026-01-08T11:45:00Z",
      },
    ];

    const filtered =
      studioId != null
        ? allRecordings.filter((r) => String(r.studioId) === studioId)
        : allRecordings;

    const start = page * size;
    const recordings = filtered.slice(start, start + size);

    return HttpResponse.json({
      success: true,
      data: {
        recordings,
        pagination: {
          page,
          size,
          totalElements: filtered.length,
          totalPages: Math.ceil(filtered.length / size) || 1,
          hasNext: start + size < filtered.length,
          hasPrevious: page > 0,
        },
      },
    });
  }),

  // 녹화 상세 조회
  http.get(
    `${BASE_URL}/api/library/recordings/:recordingId`,
    async ({ params }) => {
      const recordingId = Array.isArray(params.recordingId)
        ? params.recordingId[0]
        : params.recordingId;
      console.log("[MSW] 녹화 상세 요청:", recordingId);

      const details: Record<string, object> = {
        "rec-1": {
          recordingId: "rec-1",
          studioId: 1,
          userId: "user-1",
          title: "Weekly Podcast Episode #45",
          description:
            "Weekly podcast discussing the latest industry trends and insights.",
          thumbnailUrl: null,
          fileUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          fileSize: 512000000,
          durationSeconds: 2538,
          status: "READY",
          createdAt: "2026-01-15T15:16:00Z",
          updatedAt: "2026-01-15T15:16:00Z",
        },
        "rec-2": {
          recordingId: "rec-2",
          studioId: 1,
          userId: "user-1",
          title: "Product Demo - Q1 Launch",
          description: null,
          thumbnailUrl: null,
          fileUrl: null,
          fileSize: null,
          durationSeconds: 932,
          status: "READY",
          createdAt: "2026-01-14T10:30:00Z",
          updatedAt: "2026-01-14T10:30:00Z",
        },
        "rec-3": {
          recordingId: "rec-3",
          studioId: 2,
          userId: "user-1",
          title: "Tutorial: Getting Started",
          description: null,
          thumbnailUrl: null,
          fileUrl: null,
          fileSize: null,
          durationSeconds: 1694,
          status: "PROCESSING",
          createdAt: "2026-01-12T09:00:00Z",
          updatedAt: "2026-01-12T09:00:00Z",
        },
        "rec-4": {
          recordingId: "rec-4",
          studioId: 1,
          userId: "user-1",
          title: "Live Stream Highlight Reel",
          description: null,
          thumbnailUrl: null,
          fileUrl: null,
          fileSize: null,
          durationSeconds: 532,
          status: "READY",
          createdAt: "2026-01-10T14:20:00Z",
          updatedAt: "2026-01-10T14:20:00Z",
        },
        "rec-5": {
          recordingId: "rec-5",
          studioId: 1,
          userId: "user-1",
          title: "Summer Vlog Highlights",
          description: null,
          thumbnailUrl: null,
          fileUrl: null,
          fileSize: null,
          durationSeconds: 323,
          status: "READY",
          createdAt: "2026-01-08T11:45:00Z",
          updatedAt: "2026-01-08T11:45:00Z",
        },
      };

      const r = details[recordingId ?? ""];
      if (!r) {
        return HttpResponse.json(
          { success: false, message: "Not found" },
          { status: 404 }
        );
      }

      return HttpResponse.json({
        success: true,
        data: r,
      });
    }
  ),

  // 녹화 다운로드 URL 조회
  http.get(
    `${BASE_URL}/api/library/recordings/:recordingId/download`,
    async ({ params }) => {
      const recordingId = Array.isArray(params.recordingId)
        ? params.recordingId[0]
        : params.recordingId;
      console.log("[MSW] 녹화 다운로드 URL 요청:", recordingId);
      return HttpResponse.json({
        success: true,
        data: {
          downloadUrl: `https://example.com/download/${recordingId}.mp4?token=mock-token`,
          expiresIn: 3600,
        },
      });
    }
  ),

  // 시간대별 댓글 개수 분석 (A방식: on-the-fly 집계 시뮬레이션)
  http.get(
    `${BASE_URL}/api/library/recordings/:recordingId/comment-analysis`,
    async ({ params }) => {
      const recordingId = Array.isArray(params.recordingId)
        ? params.recordingId[0]
        : params.recordingId;
      console.log("[MSW] 시간대별 댓글 분석 요청:", recordingId);

      // 녹화별 durationSeconds에 맞춰 60초 단위 버킷 생성 (목업)
      const durationByRecording: Record<string, number> = {
        "rec-1": 2538,
        "rec-2": 932,
        "rec-3": 1694,
        "rec-4": 532,
        "rec-5": 323,
      };
      const durationSeconds = durationByRecording[recordingId ?? ""] ?? 600;

      const bucketSize = 60;
      const bucketCount = Math.ceil(durationSeconds / bucketSize);
      const buckets = Array.from({ length: bucketCount }, (_, i) => {
        const timeSec = i * bucketSize;
        // 시드 기반으로 댓글 수 변동 (피크 구간 시뮬레이션)
        const seed = (i * 7 + (recordingId?.length ?? 0)) % 10;
        const base = 3 + (seed % 8);
        const peak =
          i === Math.floor(bucketCount * 0.3) ||
          i === Math.floor(bucketCount * 0.65)
            ? 1.8
            : 1;
        const count = Math.max(0, Math.round(base * peak + (i % 5)));
        return { timeSec, count };
      });

      return HttpResponse.json({
        success: true,
        data: {
          recordingId: recordingId ?? "",
          durationSeconds,
          buckets,
        },
      });
    }
  ),

  // 녹화별 북마크(마커) 목록
  http.get(
    `${BASE_URL}/api/library/recordings/:recordingId/markers`,
    async ({ params }) => {
      const recordingId = Array.isArray(params.recordingId)
        ? params.recordingId[0]
        : params.recordingId;
      console.log("[MSW] 북마크 목록 요청:", recordingId);

      const markersByRecording: Record<
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

      const items = markersByRecording[recordingId ?? ""] ?? [];
      const markers = items.map((item, i) => ({
        markerId: `m-${recordingId}-${i}`,
        recordingId: recordingId ?? "",
        timestampSec: item.timestampSec,
        label: item.label,
      }));

      return HttpResponse.json({
        success: true,
        data: { markers },
      });
    }
  ),

  // 라이브러리 스토리지 용량 조회
  http.get(`${BASE_URL}/api/library/storage`, async () => {
    console.log("[MSW] 라이브러리 스토리지 요청");
    const gb = 1024 ** 3;
    return HttpResponse.json({
      success: true,
      data: {
        usedBytes: 42 * gb,
        limitBytes: 50 * gb,
        usedPercentage: 84,
        usedFormatted: "42 GB",
        limitFormatted: "50 GB",
        videoCount: 8,
        videoLimit: 50,
      },
    });
  }),

  // 라이브러리 스토리지 파일 목록 조회
  http.get(`${BASE_URL}/api/library/storage/files`, async () => {
    console.log("[MSW] 라이브러리 스토리지 파일 목록 요청");
    return HttpResponse.json({
      success: true,
      data: {
        files: [
          {
            id: "rec-1",
            title: "Weekly Podcast Episode #45",
            date: "Jan 15, 2026",
            createdAt: "2026-01-15T10:00:00Z",
            size: "4.2 GB",
            sizeBytes: 4509715660,
            type: "Video",
            status: "Uploaded",
            daysUntilDeletion: 30,
          },
          {
            id: "rec-2",
            title: "Product Demo - Q1 Launch",
            date: "Jan 14, 2026",
            createdAt: "2026-01-14T14:30:00Z",
            size: "1.2 GB",
            sizeBytes: 1288490188,
            type: "Video",
            status: "Processing",
            daysUntilDeletion: 29,
          },
          {
            id: "rec-3",
            title: "Tutorial: Getting Started",
            date: "Jan 12, 2026",
            createdAt: "2026-01-12T09:15:00Z",
            size: "2.8 GB",
            sizeBytes: 3006477107,
            type: "Video",
            status: "Saved",
            daysUntilDeletion: 27,
          },
          {
            id: "clip-4",
            title: "Live Stream Highlight Reel",
            date: "Jan 10, 2026",
            createdAt: "2026-01-10T16:00:00Z",
            size: "800 MB",
            sizeBytes: 858993459,
            type: "Shorts",
            status: "Uploaded",
            daysUntilDeletion: 25,
          },
          {
            id: "clip-5",
            title: "Summer Vlog Highlights",
            date: "Jan 8, 2026",
            createdAt: "2026-01-08T11:20:00Z",
            size: "520 MB",
            sizeBytes: 545259520,
            type: "Shorts",
            status: "Saved",
            daysUntilDeletion: 23,
          },
          {
            id: "rec-6",
            title: "Team Meeting Recording",
            date: "Jan 5, 2026",
            createdAt: "2026-01-05T08:45:00Z",
            size: "3.1 GB",
            sizeBytes: 3328599654,
            type: "Video",
            status: "Uploaded",
            daysUntilDeletion: 20,
          },
          {
            id: "rec-7",
            title: "Morning Briefing Ep.12",
            date: "Dec 28, 2025",
            createdAt: "2025-12-28T07:00:00Z",
            size: "1.5 GB",
            sizeBytes: 1610612736,
            type: "Video",
            status: "Uploaded",
            daysUntilDeletion: 5,
          },
          {
            id: "clip-8",
            title: "Year End Special Cut",
            date: "Dec 25, 2025",
            createdAt: "2025-12-25T20:00:00Z",
            size: "650 MB",
            sizeBytes: 681574400,
            type: "Shorts",
            status: "Uploaded",
            daysUntilDeletion: 2,
          },
        ],
      },
    });
  }),

  // 비디오 라이브러리 목록 조회 (레거시: /api/library/videos)
  http.get(`${BASE_URL}/api/library/videos`, async ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const studioId = url.searchParams.get("studioId");

    console.log(
      "[MSW] 비디오 라이브러리 목록 요청",
      type ? `(type: ${type})` : "",
      studioId ? `(studioId: ${studioId})` : ""
    );

    const allVideos = [
      {
        id: "rec-1",
        title: "Weekly Podcast Episode #45",
        date: "Jan 15, 2026",
        duration: "42:18",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: "rec-2",
        title: "Product Demo - Q1 Launch",
        date: "Jan 14, 2026",
        duration: "15:32",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: "rec-3",
        title: "Tutorial: Getting Started",
        date: "Jan 12, 2026",
        duration: "28:14",
        type: "original" as const,
        status: "Saved" as const,
      },
      {
        id: "clip-4",
        title: "Live Stream Highlight Reel",
        date: "Jan 10, 2026",
        duration: "8:52",
        type: "shorts" as const,
        status: "Uploaded" as const,
      },
      {
        id: "clip-5",
        title: "Summer Vlog Highlights",
        date: "Jan 8, 2026",
        duration: "5:23",
        type: "shorts" as const,
        status: "Saved" as const,
      },
      {
        id: "rec-6",
        title: "Team Meeting Recording",
        date: "Jan 6, 2026",
        duration: "1:12:45",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: "clip-7",
        title: "Quick Tips - Editing Basics",
        date: "Jan 4, 2026",
        duration: "3:45",
        type: "shorts" as const,
        status: "Uploaded" as const,
      },
      {
        id: "clip-8",
        title: "Gaming Stream Highlights",
        date: "Jan 2, 2026",
        duration: "12:30",
        type: "shorts" as const,
        status: "Saved" as const,
      },
    ];

    const filteredVideos =
      type && type !== "all"
        ? allVideos.filter((video) => video.type === type)
        : allVideos;

    return HttpResponse.json({
      success: true,
      data: { videos: filteredVideos, total: filteredVideos.length },
    });
  }),

  // 비디오 상세 조회 (백엔드 형식: { success, data })
  http.get(`${BASE_URL}/api/library/videos/:videoId`, async ({ params }) => {
    const videoId = Array.isArray(params.videoId)
      ? params.videoId[0]
      : params.videoId;
    console.log("[MSW] 비디오 상세 요청:", videoId);
    const detail = {
      id: videoId,
      title: "Weekly Podcast Episode #45",
      date: "Jan 15, 2026, 03:16 PM",
      duration: "42:18",
      description:
        "Weekly podcast discussing the latest industry trends and insights.",
      videoUrl: null as string | null,
      thumbnailUrl: null as string | null,
      clips: [] as {
        id: string;
        title: string;
        duration?: string;
        url?: string | null;
        thumbnailUrl?: string | null;
        status?: string;
      }[],
    };
    if (typeof videoId === "string" && videoId.startsWith("rec-")) {
      detail.clips = [
        {
          id: "clip-a",
          title: "Shorts 1",
          duration: "0:45",
          url: null,
          thumbnailUrl: null,
          status: "READY",
        },
        {
          id: "clip-b",
          title: "Shorts 2",
          duration: "0:52",
          url: null,
          thumbnailUrl: null,
          status: "READY",
        },
      ];
    }
    return HttpResponse.json({ success: true, data: detail });
  }),

  // 클립 생성 (트림 저장)
  http.post(`${BASE_URL}/api/library/clips`, async ({ request }) => {
    const body = (await request.json()) as {
      recordingId: string;
      title: string;
      startTimeSec: number;
      endTimeSec: number;
    };
    console.log("[MSW] 클립 생성:", body);
    return HttpResponse.json({
      success: true,
      data: {
        clipId: "clip-new",
        title: body.title,
        duration: body.endTimeSec - body.startTimeSec,
        status: "PROCESSING",
      },
    });
  }),

  // 알림 목록 조회
  http.get(`${BASE_URL}/api/notifications`, async () => {
    console.log("[MSW] 알림 목록 요청");
    return HttpResponse.json({
      notifications: [
        {
          id: "1",
          type: "friend_request",
          title: "새로운 친구 요청",
          message: "김민수님이 친구 요청을 보냈습니다.",
          time: "방금 전",
        },
        {
          id: "2",
          type: "studio_invite",
          title: "스튜디오 멤버 초대",
          message: "Weekly Podcast Studio에 멤버로 초대되었습니다.",
          time: "5분 전",
        },
        {
          id: "3",
          type: "ai_shorts",
          title: "AI쇼츠 생성 완료",
          message: "'여름 브이로그' AI쇼츠가 생성되었습니다.",
          time: "30분 전",
        },
        {
          id: "4",
          type: "file_deletion",
          title: "파일 삭제 예고",
          message:
            "저장공간의 '프로젝트_최종본.mp4' 파일이 내일 자동으로 삭제됩니다.",
          time: "1시간 전",
        },
      ],
    });
  }),

  // 즐겨찾기 목록 조회 (래퍼 없음: { favorites, total, maxCount })
  http.get(`${BASE_URL}/api/favorites`, async () => {
    console.log("[MSW] 즐겨찾기 목록 요청", favorites);
    const list = favorites.map((f) => ({
      favoriteId: f.id,
      userId: f.userId ?? f.id,
      nickname: f.nickname,
      email: f.email ?? `${f.id}@example.com`,
    }));
    return HttpResponse.json({
      favorites: list,
      total: list.length,
      maxCount: MAX_FAVORITES,
    });
  }),

  // 즐겨찾기 추가
  http.post(`${BASE_URL}/api/favorites`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { userId } = body;

    console.log(`[MSW] 즐겨찾기 추가 요청: ${userId}`);

    // 최대 개수 체크
    if (favorites.length >= MAX_FAVORITES) {
      return HttpResponse.json(
        { message: `최대 ${MAX_FAVORITES}명까지 등록 가능합니다.` },
        { status: 400 }
      );
    }

    // 중복 체크
    if (favorites.some((f) => f.id === userId)) {
      return HttpResponse.json(
        { message: "이미 등록된 사용자입니다." },
        { status: 409 }
      );
    }

    // 사용자 검색 결과에서 닉네임 찾기 (모의 데이터)
    const mockUsers: Record<string, { nickname: string; email: string }> = {
      user1: { nickname: "김철수", email: "kim@example.com" },
      user2: { nickname: "이영희", email: "lee@example.com" },
      user3: { nickname: "박민수", email: "park@example.com" },
      user4: { nickname: "최지영", email: "choi@example.com" },
      user5: { nickname: "정수진", email: "jung@example.com" },
    };

    const userInfo = mockUsers[userId] || {
      nickname: `사용자 ${userId}`,
      email: `${userId}@example.com`,
    };

    // 즐겨찾기에 추가
    const newFavorite: Favorite = {
      id: userId,
      nickname: userInfo.nickname,
      email: userInfo.email,
    };
    favorites.push(newFavorite);

    console.log(`[MSW] 즐겨찾기 추가 완료:`, favorites);

    return HttpResponse.json(
      {
        message: "즐겨찾기에 추가되었습니다.",
        favorite: newFavorite,
      },
      { status: 201 }
    );
  }),

  // 즐겨찾기 삭제
  http.delete(`${BASE_URL}/api/favorites/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 즐겨찾기 삭제 요청: ${id}`, "삭제 전:", favorites);

    // 즐겨찾기에서 제거
    const index = favorites.findIndex((f) => f.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: "즐겨찾기에 존재하지 않는 사용자입니다." },
        { status: 404 }
      );
    }

    favorites = favorites.filter((f) => f.id !== id);
    console.log(`[MSW] 즐겨찾기 삭제 완료:`, favorites);

    return HttpResponse.json(
      { message: "즐겨찾기에서 제거되었습니다." },
      { status: 200 }
    );
  }),

  // 사용자 검색 (이메일 또는 닉네임)
  http.get(`${BASE_URL}/api/favorites/search`, async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    console.log(`[MSW] 사용자 검색 요청: ${query}`);

    // 모의 사용자 데이터
    const mockUsers = [
      { id: "user1", nickname: "김철수", email: "kim@example.com" },
      { id: "user2", nickname: "이영희", email: "lee@example.com" },
      { id: "user3", nickname: "박민수", email: "park@example.com" },
      { id: "user4", nickname: "최지영", email: "choi@example.com" },
      { id: "user5", nickname: "정수진", email: "jung@example.com" },
      { id: "admin", nickname: "나는 동언", email: "admin@example.com" },
      { id: "editor", nickname: "나는 범수", email: "editor@example.com" },
      {
        id: "collaborator",
        nickname: "어드민 히로",
        email: "collaborator@example.com",
      },
      {
        id: "designer",
        nickname: "골드 태현",
        email: "designer@example.com",
      },
    ];

    if (!query) {
      return HttpResponse.json({ users: [] });
    }

    // 이메일 또는 닉네임으로 검색
    const filtered = mockUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.nickname.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json({ users: filtered });
  }),

  // 채널 목록 조회
  http.get(`${BASE_URL}/api/channels`, async () => {
    console.log("[MSW] 채널 목록 요청", channels);
    return HttpResponse.json({
      channels,
      total: channels.length,
    });
  }),

  // 채널 연결 시작 (백엔드에서 OAuth URL 생성)
  // MSW는 실제 OAuth URL만 반환 (실제 OAuth Provider로 리다이렉트)
  http.post(`${BASE_URL}/api/channels/connect`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { platform } = body;

    console.log(`[MSW] 채널 연결 시작: ${platform}`);

    // Custom RTMP는 OAuth 불필요, 직접 추가 가능
    if (platform === "custom_rtmp") {
      // RTMP 채널 추가 (실제로는 사용자 입력 필요)
      const newChannel: Channel = {
        id: `channel_${Date.now()}`,
        platform: "custom_rtmp",
        accountName: "rtmp://new-server.com",
        status: "connected",
        connectedAt: new Date().toISOString(),
      };
      channels.push(newChannel);
      console.log(`[MSW] RTMP 채널 추가 완료:`, channels);

      return HttpResponse.json(
        {
          message: "RTMP 채널이 추가되었습니다.",
          channel: newChannel,
        },
        { status: 201 }
      );
    }

    // 백엔드에서 OAuth URL 생성 (Client Secret 사용)
    // MSW에서는 실제 OAuth Provider URL만 반환
    // 실제 백엔드에서는 Client Secret을 사용하여 안전하게 OAuth URL 생성
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    const redirectUri = `${origin}/channels/oauth/callback`;

    const oauthBaseUrls: Record<string, string> = {
      youtube: "https://accounts.google.com/o/oauth2/v2/auth",
      twitch: "https://id.twitch.tv/oauth2/authorize",
      facebook: "https://www.facebook.com/v18.0/dialog/oauth",
    };

    const scopes: Record<string, string> = {
      youtube: "https://www.googleapis.com/auth/youtube.force-ssl",
      twitch: "channel:read:stream_key",
      facebook: "pages_manage_posts",
    };

    // 실제 백엔드에서는 Client Secret을 사용하여 OAuth URL 생성
    // MSW에서는 예시 URL만 반환 (실제 프로덕션에서는 백엔드가 처리)
    const authUrl =
      `${oauthBaseUrls[platform]}?` +
      `client_id=YOUR_CLIENT_ID&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes[platform] || "")}&` +
      `state=STATE_PARAMETER&` +
      `access_type=offline`; // refresh token 받기 위해

    console.log(`[MSW] OAuth URL 반환: ${platform}`);
    console.log(
      `[MSW] 참고: 실제 프로덕션에서는 백엔드가 Client Secret을 사용하여 OAuth URL을 생성합니다.`
    );

    return HttpResponse.json(
      {
        authUrl,
        message: `${platform} 채널 연결을 시작합니다.`,
      },
      { status: 200 }
    );
  }),

  // OAuth 콜백은 실제 백엔드에서 처리
  // MSW에서는 모킹하지 않음 (실제 OAuth Provider와 통신 필요)

  // 채널 연결 해제
  http.delete(`${BASE_URL}/api/channels/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 채널 연결 해제 요청: ${id}`, "해제 전:", channels);

    const index = channels.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: "채널을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 채널 상태를 disconnected로 변경
    channels[index] = {
      ...channels[index],
      status: "disconnected",
      disconnectedAt: new Date().toISOString(),
    };

    console.log(`[MSW] 채널 연결 해제 완료:`, channels);

    return HttpResponse.json(
      { message: "채널 연결이 해제되었습니다." },
      { status: 200 }
    );
  }),

  // 스튜디오 생성 (백엔드 ApiResponse<StudioDetailResponse> 형식)
  http.post(`${BASE_URL}/api/studios`, async ({ request }) => {
    const body = (await request.json()) as any;

    const { name, template } = body;

    console.log(`[MSW] 스튜디오 생성 요청:`, body);

    // 스튜디오 ID 생성 (number 타입)
    const studioId = Date.now();

    // 백엔드 StudioDetailResponse 형식에 맞춘 응답
    const studioDetailResponse = {
      studioId: studioId,
      name: name || "새 스튜디오",
      description: null,
      thumbnail: null,
      template: template || null,
      status: "idle",
      joinUrl: `https://onetake.app/studio/${studioId}/join`,
      members: [],
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[MSW] 스튜디오 생성 완료:`, studioDetailResponse);

    // 백엔드 ApiResponse 형식으로 반환
    return HttpResponse.json(
      {
        success: true,
        message: "스튜디오 생성 성공",
        data: studioDetailResponse,
      },
      { status: 201 }
    );
  }),

  // 스튜디오 조회 (백엔드 ApiResponse<StudioDetailResponse> 형식)
  http.get(`${BASE_URL}/api/studios/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 스튜디오 조회 요청: ${id}`);

    // 백엔드 StudioDetailResponse 형식에 맞춘 응답
    const studioId =
      typeof id === "string" ? parseInt(id) || Date.now() : Date.now();
    const studioDetailResponse = {
      studioId: studioId,
      name: "새 스튜디오",
      description: null,
      thumbnail: null,
      template: "live",
      status: "idle",
      joinUrl: `https://onetake.app/studio/${studioId}/join`,
      members: [],
      scenes: [
        {
          sceneId: 1,
          name: "Scene 1 - Intro",
          isActive: true,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
        },
        {
          sceneId: 2,
          name: "Scene 2 - Main Camera",
          isActive: false,
          sortOrder: 2,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 백엔드 ApiResponse 형식으로 반환
    return HttpResponse.json({
      success: true,
      message: "스튜디오 상세 조회 성공",
      data: studioDetailResponse,
    });
  }),

  // --- 스튜디오 멤버 (Core) ---
  http.get(`${BASE_URL}/api/studios/:id/members`, async ({ params }) => {
    const { id } = params;
    console.log("[MSW] 스튜디오 멤버 목록:", id);
    const members = [
      {
        memberId: 1,
        userId: 100,
        nickname: "오너",
        email: "owner@example.com",
        role: "owner",
        joinedAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json({ success: true, data: members });
  }),
  http.post(
    `${BASE_URL}/api/studios/:id/members/invite`,
    async ({ params, request }) => {
      const { id } = params;
      const body = (await request.json()) as { email: string; role: string };
      console.log("[MSW] 스튜디오 멤버 초대:", id, body);
      return HttpResponse.json({
        success: true,
        data: {
          inviteId: "inv_" + Date.now(),
          studioId: Number(id),
          email: body.email,
          role: body.role ?? "MANAGER",
          status: "PENDING",
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      });
    }
  ),

  // --- 채팅 (Media, 경로: /api/media/chat — V1 제외) ---
  http.get(`${BASE_URL}/api/media/chat/:studioId`, async ({ params }) => {
    const { studioId } = params;
    console.log("[MSW] 채팅 히스토리:", studioId);
    const data = [
      {
        messageId: "msg_1",
        studioId: Number(studioId),
        platform: "INTERNAL",
        messageType: "NORMAL",
        senderName: "진행자",
        content: "채팅 히스토리 목업입니다.",
        createdAt: new Date().toISOString(),
      },
    ];
    return HttpResponse.json({ success: true, data });
  }),
  http.post(`${BASE_URL}/api/media/chat`, async ({ request }) => {
    const body = (await request.json()) as {
      studioId: number;
      content: string;
      platform?: string;
    };
    console.log("[MSW] 채팅 전송:", body);
    const msg = {
      messageId: "msg_" + Date.now(),
      studioId: body.studioId,
      platform: body.platform ?? "INTERNAL",
      messageType: "NORMAL",
      senderName: "나",
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, data: msg });
  }),

  // --- 녹화 (Gateway: /api/recordings) ---
  http.post(`${BASE_URL}/api/recordings/start`, async ({ request }) => {
    const body = (await request.json()) as { studioId: number };
    const recordingId = "rec_" + Date.now();
    recordingState.active = { studioId: body.studioId, recordingId };
    recordingState.list.push({
      recordingId,
      studioId: body.studioId,
      fileName: `recording_${recordingId}.mp4`,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
    });
    console.log("[MSW] 녹화 시작:", body);
    return HttpResponse.json({
      success: true,
      data: {
        recordingId,
        studioId: body.studioId,
        status: "RECORDING",
        fileName: `recording_${recordingId}.mp4`,
        startedAt: new Date().toISOString(),
      },
    });
  }),
  http.post(`${BASE_URL}/api/recordings/:studioId/stop`, async ({ params }) => {
    const studioId = Number(params.studioId);
    const active =
      recordingState.active?.studioId === studioId
        ? recordingState.active
        : null;
    if (active) {
      const idx = recordingState.list.findIndex(
        (r) => r.recordingId === active.recordingId
      );
      if (idx >= 0)
        recordingState.list[idx] = {
          ...recordingState.list[idx],
          durationSeconds: 60,
        };
      recordingState.active = null;
    }
    console.log("[MSW] 녹화 중지:", studioId);
    return HttpResponse.json({
      success: true,
      data: {
        recordingId: active?.recordingId ?? "rec_0",
        studioId,
        status: "COMPLETED",
        fileName: "recording.mp4",
        durationSeconds: 60,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      },
    });
  }),
  http.get(
    `${BASE_URL}/api/recordings/studio/:studioId`,
    async ({ params }) => {
      const studioId = Number(params.studioId);
      const list = recordingState.list
        .filter((r) => r.studioId === studioId)
        .map((r) => ({
          recordingId: r.recordingId,
          studioId: r.studioId,
          status: "COMPLETED" as const,
          fileName: r.fileName,
          startedAt: r.startedAt,
          durationSeconds: r.durationSeconds,
        }));
      return HttpResponse.json({ success: true, data: list });
    }
  ),
  http.get(
    `${BASE_URL}/api/recordings/studio/:studioId/active`,
    async ({ params }) => {
      const studioId = Number(params.studioId);
      const active =
        recordingState.active?.studioId === studioId
          ? recordingState.active
          : null;
      if (!active) return HttpResponse.json({ success: true, data: null });
      const r = recordingState.list.find(
        (x) => x.recordingId === active.recordingId
      );
      return HttpResponse.json({
        success: true,
        data: r
          ? {
              recordingId: r.recordingId,
              studioId: r.studioId,
              status: "RECORDING" as const,
              fileName: r.fileName,
              startedAt: r.startedAt,
              durationSeconds: r.durationSeconds,
            }
          : null,
      });
    }
  ),

  // --- 쇼츠 생성 및 상태 폴링 핸들러 ---
  // 1. 쇼츠 생성 요청 (POST)
  http.post(`${BASE_URL}/api/v1/shorts/generate`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { videoId, bgColor, useSubtitles, language } = body;

    console.log(`[MSW] 쇼츠 생성 요청 시작: Video(${videoId})`, {
      bgColor,
      useSubtitles,
      language,
    });

    // 상태 변수 업데이트 (시작 시간 기록)
    shortsServerState = {
      isGenerating: true,
      startTime: Date.now(),
      completedCount: 0,
      videoId: videoId,
    };

    return HttpResponse.json(
      { message: "쇼츠 생성이 시작되었습니다." },
      { status: 200 }
    );
  }),

  // 2. 쇼츠 생성 상태 조회 (Polling용 GET)
  http.get(`${BASE_URL}/api/v1/shorts/status`, async () => {
    // 생성 중이 아니면 idle 반환
    if (!shortsServerState.isGenerating) {
      return HttpResponse.json({ status: "idle", completedCount: 0 });
    }

    const elapsed = Date.now() - shortsServerState.startTime;

    // 시간 경과에 따른 상태 변화 시뮬레이션
    // 3초, 6초, 9초마다 하나씩 완료됨
    let currentCount = 0;
    let currentStatus = "processing";

    if (elapsed > 9000) {
      currentCount = 3;
      currentStatus = "completed";
      // 3개가 다 만들어지면 생성 상태 종료 (선택사항)
      // shortsServerState.isGenerating = false;
    } else if (elapsed > 6000) {
      currentCount = 2;
    } else if (elapsed > 3000) {
      currentCount = 1;
    }

    // 상태가 변경되었을 때만 로그 출력 (도배 방지)
    if (currentCount > shortsServerState.completedCount) {
      console.log(
        `[MSW] 쇼츠 생성 진행중: ${currentCount}개 완료 (Video: ${shortsServerState.videoId})`
      );
      shortsServerState.completedCount = currentCount;
    }

    return HttpResponse.json({
      status: currentStatus,
      completedCount: currentCount,
      videoId: shortsServerState.videoId,
    });
  }),
];
