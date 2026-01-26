import { http, HttpResponse } from "msw";

// 환경 변수에서 베이스 URL을 가져옵니다.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// 타입 정의 (entities에서 import하지 않고 여기서 정의 - MSW는 독립적)
type PlatformType = "youtube" | "twitch" | "facebook" | "custom_rtmp";

// MSW 메모리 기반 상태 관리 (즐겨찾기)
interface Favorite {
  id: string;
  nickname: string;
  email?: string;
}

// 초기 즐겨찾기 데이터
let favorites: Favorite[] = [
  { id: "admin", nickname: "나는 동언" },
  { id: "editor", nickname: "나는 범수" },
  { id: "collaborator", nickname: "어드민 히로" },
  { id: "designer", nickname: "골드 태현" },
];

const MAX_FAVORITES = 10;

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
let channels: Channel[] = [
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
  // 주소 앞에 BASE_URL을 붙여서 MSW가 8080 포트 요청도 가로채게 만듭니다.
  http.post(`${BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { email, password } = body;

    console.log(`[MSW] 로그인 요청: ${email}`);

    // 테스트용 이메일/비밀번호
    if (email === "test@example.com" && password === "12345678") {
      // 서버에서 생성된 고유 ID (실제로는 UUID 등 사용)
      const userId = "user_" + Math.random().toString(36).substring(2, 11);
      return HttpResponse.json(
        {
          user: { 
            id: userId, 
            email: email,
            name: "홍길동" 
          },
          accessToken: "fake-jwt-token-one-take",
          message: "로그인 성공!",
        },
        { status: 200 },
      );
    }

    return HttpResponse.json(
      { message: "이메일 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }),
  // src/mock/handlers.ts 안에 추가

  // 회원가입 모의 API
  http.post("/api/v1/auth/signup", async ({ request }) => {
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
  http.get(`${BASE_URL}/api/v1/workspace/:userId/studios/recent`, async () => {
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

  // 스토리지 정보 조회
  http.get(`${BASE_URL}/api/v1/storage`, async () => {
    console.log("[MSW] 스토리지 정보 요청");
    return HttpResponse.json({
      used: 40.09,
      total: 50.0,
      videoUsage: 40.2,
      assetUsage: 4.89,
    });
  }),

  // 스토리지 파일 목록 조회
  http.get(`${BASE_URL}/api/v1/storage/files`, async () => {
    console.log("[MSW] 스토리지 파일 목록 요청");
    return HttpResponse.json({
      files: [
        {
          id: 1,
          title: "Weekly Podcast Episode #4",
          date: "Jan 4, 2026",
          size: "4.2 GB",
          type: "Video",
          status: "Uploaded",
        },
        {
          id: 2,
          title: "Product Demo - Q1 Launch",
          date: "Jan 12, 2026",
          size: "1.2 GB",
          type: "Video",
          status: "Processing",
        },
        {
          id: 3,
          title: "Team Meeting Recording",
          date: "Jan 8, 2026",
          size: "800 MB",
          type: "Shorts",
          status: "Saved",
        },
        {
          id: 4,
          title: "Gaming Stream Highlight",
          date: "Jan 2, 2026",
          size: "2.5 GB",
          type: "Video",
          status: "Uploaded",
        },
      ],
    });
  }),

  // 비디오 라이브러리 목록 조회
  http.get(`${BASE_URL}/api/v1/library/videos`, async ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    console.log("[MSW] 비디오 라이브러리 목록 요청", type ? `(type: ${type})` : "");

    const allVideos = [
      {
        id: 1,
        title: "Weekly Podcast Episode #45",
        date: "Jan 15, 2026",
        duration: "42:18",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: 2,
        title: "Product Demo - Q1 Launch",
        date: "Jan 14, 2026",
        duration: "15:32",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: 3,
        title: "Tutorial: Getting Started",
        date: "Jan 12, 2026",
        duration: "28:14",
        type: "original" as const,
        status: "Saved" as const,
      },
      {
        id: 4,
        title: "Live Stream Highlight Reel",
        date: "Jan 10, 2026",
        duration: "8:52",
        type: "shorts" as const,
        status: "Uploaded" as const,
      },
      {
        id: 5,
        title: "Summer Vlog Highlights",
        date: "Jan 8, 2026",
        duration: "5:23",
        type: "shorts" as const,
        status: "Saved" as const,
      },
      {
        id: 6,
        title: "Team Meeting Recording",
        date: "Jan 6, 2026",
        duration: "1:12:45",
        type: "original" as const,
        status: "Uploaded" as const,
      },
      {
        id: 7,
        title: "Quick Tips - Editing Basics",
        date: "Jan 4, 2026",
        duration: "3:45",
        type: "shorts" as const,
        status: "Uploaded" as const,
      },
      {
        id: 8,
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
      videos: filteredVideos,
      total: filteredVideos.length,
    });
  }),

  // 알림 목록 조회
  http.get(`${BASE_URL}/api/v1/notifications`, async () => {
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

  // 즐겨찾기 목록 조회
  http.get(`${BASE_URL}/api/v1/favorites`, async () => {
    console.log("[MSW] 즐겨찾기 목록 요청", favorites);
    return HttpResponse.json({
      favorites,
      total: favorites.length,
      maxCount: MAX_FAVORITES,
    });
  }),

  // 즐겨찾기 추가
  http.post(`${BASE_URL}/api/v1/favorites`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { userId } = body;

    console.log(`[MSW] 즐겨찾기 추가 요청: ${userId}`);

    // 최대 개수 체크
    if (favorites.length >= MAX_FAVORITES) {
      return HttpResponse.json(
        { message: `최대 ${MAX_FAVORITES}명까지 등록 가능합니다.` },
        { status: 400 },
      );
    }

    // 중복 체크
    if (favorites.some((f) => f.id === userId)) {
      return HttpResponse.json(
        { message: "이미 등록된 사용자입니다." },
        { status: 409 },
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
      { status: 201 },
    );
  }),

  // 즐겨찾기 삭제
  http.delete(`${BASE_URL}/api/v1/favorites/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 즐겨찾기 삭제 요청: ${id}`, "삭제 전:", favorites);

    // 즐겨찾기에서 제거
    const index = favorites.findIndex((f) => f.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: "즐겨찾기에 존재하지 않는 사용자입니다." },
        { status: 404 },
      );
    }

    favorites = favorites.filter((f) => f.id !== id);
    console.log(`[MSW] 즐겨찾기 삭제 완료:`, favorites);

    return HttpResponse.json(
      { message: "즐겨찾기에서 제거되었습니다." },
      { status: 200 },
    );
  }),

  // 사용자 검색 (이메일 또는 닉네임)
  http.get(`${BASE_URL}/api/v1/favorites/search`, async ({ request }) => {
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
        user.nickname.toLowerCase().includes(query.toLowerCase()),
    );

    return HttpResponse.json({ users: filtered });
  }),

  // 채널 목록 조회
  http.get(`${BASE_URL}/api/v1/channels`, async () => {
    console.log("[MSW] 채널 목록 요청", channels);
    return HttpResponse.json({
      channels,
      total: channels.length,
    });
  }),

  // 채널 연결 시작 (백엔드에서 OAuth URL 생성)
  // MSW는 실제 OAuth URL만 반환 (실제 OAuth Provider로 리다이렉트)
  http.post(`${BASE_URL}/api/v1/channels/connect`, async ({ request }) => {
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
        { status: 201 },
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
    console.log(`[MSW] 참고: 실제 프로덕션에서는 백엔드가 Client Secret을 사용하여 OAuth URL을 생성합니다.`);

    return HttpResponse.json(
      {
        authUrl,
        message: `${platform} 채널 연결을 시작합니다.`,
      },
      { status: 200 },
    );
  }),

  // OAuth 콜백은 실제 백엔드에서 처리
  // MSW에서는 모킹하지 않음 (실제 OAuth Provider와 통신 필요)

  // 채널 연결 해제
  http.delete(`${BASE_URL}/api/v1/channels/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 채널 연결 해제 요청: ${id}`, "해제 전:", channels);

    const index = channels.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json(
        { message: "채널을 찾을 수 없습니다." },
        { status: 404 },
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
      { status: 200 },
    );
  }),

  // 스튜디오 생성
  http.post(`${BASE_URL}/api/v1/studios`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { title, description, transmissionType, storageLocation, platforms } = body;

    console.log(`[MSW] 스튜디오 생성 요청:`, body);

    // 스튜디오 ID 생성
    const studioId = `studio_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newStudio = {
      id: studioId,
      title,
      description: description || "",
      transmissionType,
      storageLocation,
      platforms: platforms || [],
      createdAt: new Date().toISOString(),
    };

    console.log(`[MSW] 스튜디오 생성 완료:`, newStudio);

    return HttpResponse.json(
      {
        studio: newStudio,
        message: "스튜디오가 성공적으로 생성되었습니다.",
      },
      { status: 201 },
    );
  }),

  // 스튜디오 조회
  http.get(`${BASE_URL}/api/v1/studios/:id`, async ({ params }) => {
    const { id } = params;
    console.log(`[MSW] 스튜디오 조회 요청: ${id}`);

    // 모의 스튜디오 데이터
    const studioDetail = {
      id: id as string,
      title: "StudioTitle",
      description: "스트리밍 스튜디오",
      transmissionType: "live" as const,
      storageLocation: "local" as const,
      platforms: ["youtube", "twitch"] as const,
      createdAt: new Date().toISOString(),
      currentLayout: "full" as const,
      isLive: false,
      scenes: [
        { id: "scene_1", name: "Scene 1 - Intro", isActive: true },
        { id: "scene_2", name: "Scene 2 - Main Camera", isActive: false },
      ],
      sources: [
        { id: "source_1", type: "video" as const, name: "Video Capture Device", isVisible: true },
        { id: "source_2", type: "audio" as const, name: "Audio Input Capture", isVisible: true },
      ],
    };

    return HttpResponse.json(studioDetail);
  }),
];
