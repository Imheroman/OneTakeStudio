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
      return HttpResponse.json({
        user: { id: "testuser", name: "홍길동" },
        accessToken: "fake-jwt-token-one-take",
        message: "로그인 성공!",
      }, { status: 200 });
    }

    return HttpResponse.json(
      { message: "아이디 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }),
];