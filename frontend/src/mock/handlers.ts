// src/mock/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // 로그인 모의 API (POST /api/login 요청을 가로챔)
  http.post("/api/login", async ({ request }) => {
    const body = (await request.json()) as any;
    const { username, password } = body;

    console.log(`[MSW] 로그인 요청 받음: ${username} / ${password}`);

    // 가짜 로그인 검증 로직
    if (username === "testuser" && password === "12345678") {
      return HttpResponse.json({
        user: {
          id: "testuser",
          name: "홍길동", // 가짜 유저 정보
          token: "fake-jwt-token",
        },
        message: "로그인 성공!",
      });
    }

    // 실패 시 401 에러 반환
    return HttpResponse.json(
      { message: "아이디 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }),
];
