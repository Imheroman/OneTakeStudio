"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/shared/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) {
      router.replace("/login");
      return;
    }

    const handleCallback = async () => {
      try {
        // URL에서 쿼리 파라미터 추출
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`인증 실패: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setMessage("인증 정보가 올바르지 않습니다.");
          return;
        }

        // 백엔드에서 OAuth 콜백 처리
        // 백엔드는 인증 코드를 토큰으로 교환하고 채널 정보를 저장
        const response = await apiClient.get(
          `/api/v1/channels/oauth/callback?code=${code}&state=${state}`,
          OAuthCallbackResponseSchema,
        );

        setStatus("success");
        setMessage(response.message || "채널이 성공적으로 연결되었습니다.");

        // 2초 후 채널 페이지로 리다이렉트
        setTimeout(() => {
          router.push("/channels");
        }, 2000);
      } catch (error: any) {
        console.error("OAuth 콜백 처리 실패:", error);
        setStatus("error");
        setMessage(
          error.response?.data?.message || "채널 연결 중 오류가 발생했습니다.",
        );
      }
    };

    handleCallback();
  }, [hasHydrated, isLoggedIn, router, searchParams]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">채널 연결</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
              <p className="text-gray-600">채널을 연결하는 중...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">연결 성공!</p>
              <p className="text-sm text-gray-600 text-center">{message}</p>
              <p className="text-xs text-gray-500 mt-4">
                잠시 후 채널 페이지로 이동합니다...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">연결 실패</p>
              <p className="text-sm text-gray-600 text-center mb-4">{message}</p>
              <Button
                onClick={() => router.push("/channels")}
                className="w-full"
              >
                채널 페이지로 돌아가기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
