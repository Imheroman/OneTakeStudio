"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import {
  getHttpErrorStatus,
  getHttpErrorMessage,
} from "@/shared/lib/error-utils";
import { useState } from "react";
import { AuthResponseSchema } from "@/entities/user/model";

import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Loader2 } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { cn } from "@/shared/lib/utils";

const formSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식을 입력해주세요." }),
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
});

// OAuth 제공자 설정
const OAUTH_PROVIDERS = {
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid email profile",
  },
  kakao: {
    clientId: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
    authUrl: "https://kauth.kakao.com/oauth/authorize",
    scope: "profile_nickname profile_image account_email",
  },
  naver: {
    clientId: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
    authUrl: "https://nid.naver.com/oauth2.0/authorize",
    scope: "",
  },
};

interface LoginFormProps {
  /** 모달 모드: 회원가입 링크 대신 클릭 핸들러 사용 */
  onSwitchToSignup?: () => void;
  /** 랜딩 모달용: 테마 색상 적용 */
  variant?: "default" | "landing";
  isDark?: boolean;
}

export function LoginForm({
  onSwitchToSignup,
  variant = "default",
  isDark = false,
}: LoginFormProps = {}) {
  const isLanding = variant === "landing";
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setErrorMsg("");
      setIsSubmitting(true);

      const response = await apiClient.post(
        "/api/auth/login",
        AuthResponseSchema,
        values
      );

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // refreshToken은 localStorage에 별도 저장
        localStorage.setItem("refreshToken", refreshToken);

        // user 객체를 프론트엔드 형식에 맞게 변환
        const userData = {
          userId: user.userId,
          email: user.email,
          nickname: user.nickname,
          profileImageUrl: user.profileImageUrl,
        };

        login(userData, accessToken);
        if (user?.userId) {
          const redirect = searchParams.get("redirect");
          const targetPath = redirect?.startsWith("/")
            ? redirect
            : `/workspace/${user.userId}`;
          router.push(targetPath);
        }
      }
    } catch (error: unknown) {
      console.error("로그인 에러:", error);
      const status = getHttpErrorStatus(error);

      if (status === 503) {
        setErrorMsg(
          "서비스를 사용할 수 없습니다 (503).\n" +
            "- Eureka에 core-service가 등록(UP)인지 확인\n" +
            "- 실행 순서: Eureka → core-service → api-gateway\n" +
            "- 모킹으로 우회하려면 NEXT_PUBLIC_API_MOCKING=enabled 후 프론트 dev 서버 재시작"
        );
        return;
      }

      if (status === 500) {
        setErrorMsg(
          "서버 오류가 발생했습니다 (500).\n" + "백엔드 로그를 확인해주세요."
        );
        return;
      }

      setErrorMsg(
        getHttpErrorMessage(error, "이메일 또는 비밀번호를 확인해주세요.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // OAuth 로그인 핸들러
  const handleOAuthLogin = (provider: "google" | "kakao" | "naver") => {
    const config = OAUTH_PROVIDERS[provider];
    const redirectUri = `${window.location.origin}/oauth/callback`;
    // state는 plain text로 전달 (Naver가 JSON state를 HTML entity로 변환하는 문제 방지)
    const state = provider;

    let authUrl = `${config.authUrl}?client_id=${
      config.clientId
    }&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&state=${state}`;

    if (config.scope) {
      authUrl += `&scope=${encodeURIComponent(config.scope)}`;
    }

    window.location.href = authUrl;
  };

  return (
    <Card
      className={cn(
        "w-full max-w-md border-0 shadow-xl rounded-2xl",
        isLanding && "bg-transparent shadow-none",
        !isLanding && isDark && "bg-gray-800/80 border-gray-700"
      )}
    >
      <div className="flex justify-center pt-1 pb-1">
        <Logo href="/" size="lg" dark={isDark} />
      </div>
      <CardHeader className="space-y-1 text-center pb-6">
        <CardTitle
          className={cn(
            "text-xl font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          로그인
        </CardTitle>
        <CardDescription
          className={cn(isDark ? "text-gray-400" : "text-gray-500")}
        >
          서비스 이용을 위해 이메일과 비밀번호를 입력해주세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={cn(
                      "font-medium",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    이메일
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="이메일을 입력하세요"
                      className={cn(
                        "h-11 transition-all",
                        isDark
                          ? "bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-violet-400"
                          : isLanding
                          ? "bg-white/60 border-gray-200 text-gray-900 focus:bg-white"
                          : "bg-gray-50 border-gray-200 focus:bg-white"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    className={cn(
                      "font-medium",
                      isDark ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    비밀번호
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      className={cn(
                        "h-11 transition-all",
                        isDark
                          ? "bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-violet-400"
                          : isLanding
                          ? "bg-white/60 border-gray-200 text-gray-900 focus:bg-white"
                          : "bg-gray-50 border-gray-200 focus:bg-white"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {errorMsg && (
              <div
                className={cn(
                  "text-sm p-3 rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-1",
                  isDark
                    ? "bg-red-500/20 text-red-300"
                    : "bg-red-50 text-red-600"
                )}
              >
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-11 font-bold rounded-lg transition-all",
                isLanding
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-md hover:shadow-lg"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "로그인하기"
              )}
            </Button>
          </form>
        </Form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span
              className={cn(
                "w-full border-t",
                isDark ? "border-white/20" : "border-gray-200"
              )}
            />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className={cn(
                "px-2 font-medium",
                isDark
                  ? "bg-gray-800/80 text-gray-400"
                  : isLanding
                  ? "bg-[#F5F5F8] text-gray-500"
                  : "bg-white text-gray-400"
              )}
            >
              또는 다음으로 로그인하기
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin("google")}
            className={cn(
              "google-oauth-hover h-11 font-medium transition-colors",
              isDark
                ? "border-white/20 text-black hover:bg-white hover:text-black hover:!bg-white"
                : "text-gray-600 border-gray-200"
            )}
          >
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin("kakao")}
            className="h-11 font-medium text-gray-600 hover:bg-[#FEE500] hover:text-black hover:border-[#FEE500] border-gray-200"
          >
            Kakao
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthLogin("naver")}
            className="h-11 font-medium text-gray-600 hover:bg-[#03C75A] hover:text-white hover:border-[#03C75A] border-gray-200"
          >
            Naver
          </Button>
        </div>
      </CardContent>

      <CardFooter
        className={cn(
          "flex justify-center text-sm pb-8",
          isDark ? "text-gray-400" : "text-gray-500"
        )}
      >
        계정이 없으신가요?&nbsp;
        {onSwitchToSignup ? (
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-violet-400 hover:text-violet-300 font-bold hover:underline transition-colors"
          >
            회원가입
          </button>
        ) : (
          <Link
            href="/?auth=signup"
            className={cn(
              "font-bold hover:underline transition-colors",
              isDark
                ? "text-indigo-400 hover:text-indigo-300"
                : "text-indigo-600 hover:text-indigo-700"
            )}
          >
            회원가입
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
