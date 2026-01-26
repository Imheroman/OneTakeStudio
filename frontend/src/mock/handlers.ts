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
];
