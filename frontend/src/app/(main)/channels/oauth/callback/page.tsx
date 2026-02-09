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
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    // 하이드레이션 완료 전에는 아무것도 하지 않음
    if (!hasHydrated) return;

    if (!isLoggedIn) {
      router.replace(
        `/?auth=login&redirect=${encodeURIComponent("/channels")}`
      );
      return;
    }

    const callbackStatus = searchParams.get("status");
    const callbackMessage = searchParams.get("message");
    const error = searchParams.get("error");

    if (error || callbackStatus === "error") {
      setStatus("error");
      setMessage(callbackMessage || error || "인증에 실패했습니다.");
      return;
    }

    if (callbackStatus === "success") {
      setStatus("success");
      setMessage("YouTube 계정이 연동되었습니다. 라이브 시 채팅을 자동으로 가져옵니다.");
      setTimeout(() => {
        router.push("/channels");
      }, 2000);
      return;
    }

    // 알 수 없는 상태
    setStatus("error");
    setMessage("인증 정보가 올바르지 않습니다.");
  }, [hasHydrated, isLoggedIn, router, searchParams]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">YouTube 채팅 연동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
              <p className="text-gray-600">연동하는 중...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">연동 성공!</p>
              <p className="text-sm text-gray-600 text-center">{message}</p>
              <p className="text-xs text-gray-500 mt-4">
                잠시 후 채널 페이지로 이동합니다...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-900 font-medium mb-2">연동 실패</p>
              <p className="text-sm text-gray-600 text-center mb-4">
                {message}
              </p>
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
                <p className="text-gray-600">연동하는 중...</p>
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
