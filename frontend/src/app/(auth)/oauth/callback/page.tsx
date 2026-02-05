"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/shared/api/client";
import { AuthResponseSchema } from "@/entities/user/model";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const isDark = useResolvedTheme() === "dark";
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get("code");
        const stateParam = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`인증 실패: ${error}`);
          return;
        }

        if (!code || !stateParam) {
          setStatus("error");
          setMessage("인증 정보가 올바르지 않습니다.");
          return;
        }

        // state에서 provider 정보 추출
        // state는 plain text provider 이름 (예: "google", "kakao", "naver")
        let provider: "google" | "kakao" | "naver";
        const validProviders = ["google", "kakao", "naver"];

        if (validProviders.includes(stateParam)) {
          // plain text state (권장 형식)
          provider = stateParam as "google" | "kakao" | "naver";
        } else {
          // 레거시: JSON 형식 state 지원
          try {
            const state = JSON.parse(decodeURIComponent(stateParam));
            provider = state.provider;
          } catch {
            try {
              const state = JSON.parse(stateParam);
              provider = state.provider;
            } catch {
              provider = stateParam as "google" | "kakao" | "naver";
            }
          }
        }

        if (!["google", "kakao", "naver"].includes(provider)) {
          setStatus("error");
          setMessage("알 수 없는 OAuth 제공자입니다.");
          return;
        }

        // 백엔드에 authorization code 전송
        const redirectUri = `${window.location.origin}/oauth/callback`;

        const response = await apiClient.post(
          `/api/auth/oauth/${provider}/callback`,
          AuthResponseSchema,
          { code, redirectUri }
        );

        if (response.success && response.data) {
          const { user, accessToken, refreshToken } = response.data;

          // refreshToken은 localStorage에 별도 저장
          localStorage.setItem("refreshToken", refreshToken);

          // 로그인 처리
          const userData = {
            userId: user.userId,
            email: user.email,
            nickname: user.nickname,
            profileImageUrl: user.profileImageUrl,
          };

          login(userData, accessToken);

          setStatus("success");
          setMessage("로그인 성공! 워크스페이스로 이동합니다.");

          const userId = user?.userId;
          if (!userId) {
            setStatus("error");
            setMessage("사용자 정보를 불러올 수 없습니다.");
            return;
          }
          // 잠시 후 리다이렉트 (userId 확정 후에만 이동)
          setTimeout(() => {
            router.push(`/workspace/${userId}`);
          }, 1000);
        }
      } catch (error: unknown) {
        console.error("OAuth 콜백 처리 실패:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "로그인 중 오류가 발생했습니다."
        );
      }
    };

    handleOAuthCallback();
  }, [searchParams, login, router]);

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-screen p-4",
        isDark ? "bg-[#0c0c0f]" : "bg-gray-50"
      )}
    >
      <Card
        className={cn(
          "w-full max-w-md",
          isDark && "bg-gray-800/80 border-gray-700"
        )}
      >
        <CardHeader>
          <CardTitle className={cn("text-center", isDark && "text-white")}>
            OAuth 로그인
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2
                className={cn(
                  "h-12 w-12 animate-spin mb-4",
                  isDark ? "text-indigo-400" : "text-indigo-600"
                )}
              />
              <p className={cn(isDark ? "text-gray-400" : "text-gray-600")}>
                로그인 처리 중...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p
                className={cn(
                  "font-medium mb-2",
                  isDark ? "text-white" : "text-gray-900"
                )}
              >
                로그인 성공!
              </p>
              <p
                className={cn(
                  "text-sm text-center",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}
              >
                {message}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p
                className={cn(
                  "font-medium mb-2",
                  isDark ? "text-white" : "text-gray-900"
                )}
              >
                로그인 실패
              </p>
              <p
                className={cn(
                  "text-sm text-center mb-4",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}
              >
                {message}
              </p>
              <Button
                onClick={() => router.push("/?auth=login")}
                className="w-full"
              >
                로그인 페이지로 돌아가기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OAuthLoginCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackLoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackLoadingFallback() {
  const isDark = useResolvedTheme() === "dark";

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-screen p-4",
        isDark ? "bg-[#0c0c0f]" : "bg-gray-50"
      )}
    >
      <Card
        className={cn(
          "w-full max-w-md",
          isDark && "bg-gray-800/80 border-gray-700"
        )}
      >
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2
              className={cn(
                "h-12 w-12 animate-spin mb-4",
                isDark ? "text-indigo-400" : "text-indigo-600"
              )}
            />
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              로그인 처리 중...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
