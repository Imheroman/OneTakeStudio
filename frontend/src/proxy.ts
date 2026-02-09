import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 인증이 필요한 경로
const protectedPaths = [
  "/workspace",
  "/studio",
  "/library",
  "/channels",
  "/members",
  "/mypage",
  "/storage",
];

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ["/login", "/signup"];

/**
 * JWT 토큰 만료 확인 (서버사이드)
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!payload.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // localStorage는 서버에서 접근 불가하므로 쿠키 사용
  // 클라이언트에서 zustand persist가 localStorage를 사용하므로,
  // 여기서는 간단한 체크만 수행

  // API 경로는 proxy 스킵
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // 정적 파일 스킵
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
    return NextResponse.next();
  }

  // 보호된 경로 체크
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // 쿠키에서 인증 상태 확인 (클라이언트에서 설정해야 함)
  const authCookie = request.cookies.get("onetake-authenticated");
  const isAuthenticated = authCookie?.value === "true";

  // 보호된 경로에 비인증 사용자가 접근하면 랜딩 페이지 로그인 모달로 리다이렉트
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("auth", "login");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자가 로그인/회원가입 페이지에 접근하면 워크스페이스로 리다이렉트
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  // 비인증 사용자가 /login 또는 /signup 직접 접근 시 랜딩 페이지 모달로 리다이렉트
  if (pathname === "/login") {
    const landingUrl = new URL("/", request.url);
    landingUrl.searchParams.set("auth", "login");
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam) landingUrl.searchParams.set("redirect", redirectParam);
    return NextResponse.redirect(landingUrl);
  }
  if (pathname === "/signup") {
    const landingUrl = new URL("/", request.url);
    landingUrl.searchParams.set("auth", "signup");
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam) landingUrl.searchParams.set("redirect", redirectParam);
    return NextResponse.redirect(landingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
