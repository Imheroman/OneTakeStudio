import { http, HttpResponse } from "msw";

// 환경 변수에서 베이스 URL을 가져옵니다.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
];
