"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function ChannelsOAuthCallbackContent() {
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

    const handleCallback = () => {
      // Media Service OAuth 콜백에서 리다이렉트됨 (status + message 파라미터)
      const callbackStatus = searchParams.get("status");
      const callbackMessage = searchParams.get("message");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`인증 실패: ${error}`);
        return;
      }

      if (callbackStatus === "success") {
        setStatus("success");
        const platformName = callbackMessage === "youtube" ? "YouTube" :
                             callbackMessage === "chzzk" ? "치지직" : callbackMessage;
        setMessage(`${platformName} 채팅 인증이 완료되었습니다.`);
        setTimeout(() => {
          router.push("/channels");
        }, 2000);
        return;
      }

      if (callbackStatus === "error") {
        setStatus("error");
        setMessage(callbackMessage ?? "채널 연결 중 오류가 발생했습니다.");
        return;
      }

      // 알 수 없는 파라미터
      setStatus("error");
      setMessage("인증 정보가 올바르지 않습니다.");
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

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-600">채널을 연결하는 중...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ChannelsOAuthCallbackContent />
    </Suspense>
  );
}
