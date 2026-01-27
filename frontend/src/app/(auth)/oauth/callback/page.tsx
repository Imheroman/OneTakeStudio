"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/shared/api/client";
import { AuthResponseSchema } from "@/entities/user/model";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";

export default function OAuthLoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
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
        const state = JSON.parse(decodeURIComponent(stateParam));
        const provider = state.provider as "google" | "kakao" | "naver";

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

          // 잠시 후 리다이렉트
          setTimeout(() => {
            router.push(`/workspace/${user.userId}`);
          }, 1000);
        }
      } catch (error: any) {
        console.error("OAuth 콜백 처리 실패:", error);
        setStatus("error");
        setMessage(error.message || "로그인 중 오류가 발생했습니다.");
      }
    };

    handleOAuthCallback();
  }, [searchParams, login, router]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">OAuth 로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
              <p className="text-gray-600">로그인 처리 중...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">로그인 성공!</p>
              <p className="text-sm text-gray-600 text-center">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">로그인 실패</p>
              <p className="text-sm text-gray-600 text-center mb-4">{message}</p>
              <Button onClick={() => router.push("/login")} className="w-full">
                로그인 페이지로 돌아가기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
