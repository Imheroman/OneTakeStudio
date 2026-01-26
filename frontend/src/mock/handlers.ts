import { http, HttpResponse } from "msw";

// 환경 변수에서 베이스 URL을 가져옵니다.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const handlers = [
  // 주소 앞에 BASE_URL을 붙여서 MSW가 8080 포트 요청도 가로채게 만듭니다.
  http.post(`${BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;
    const { username, password } = body;

    console.log(`[MSW] 8080 포트 요청 가로채기 성공: ${username}`);

    if (username === "testuser" && password === "12345678") {
      return HttpResponse.json(
        {
          user: { id: "testuser", name: "홍길동" },
          accessToken: "fake-jwt-token-one-take",
          message: "로그인 성공!",
        },
        { status: 200 },
      );
    }

    return HttpResponse.json(
      { message: "아이디 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }),
  // src/mock/handlers.ts 안에 추가

  // 회원가입 모의 API
  http.post("/api/v1/auth/signup", async ({ request }) => {
    const body = (await request.json()) as any;
    const { username, name } = body;

    console.log(`[MSW] 회원가입 요청: ${username} (${name})`);

    // 이미 존재하는 아이디라고 가정하고 에러 띄우기 테스트 (필요시 주석 해제)
    // if (username === 'duplicate') {
    //   return HttpResponse.json({ message: "이미 사용 중인 아이디입니다." }, { status: 409 });
    // }

    // 성공 시: 자동 로그인을 위한 토큰과 유저 정보를 함께 반환
    return HttpResponse.json({
      message: "회원가입이 완료되었습니다.",
      accessToken: "fake-jwt-token-new-user",
      user: {
        id: username, // 가입한 아이디를 그대로 식별자로 사용
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
      used: 45.09,
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
];
