"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// 유효성 검사 스키마 (기존 유지)
const formSchema = z.object({
  username: z.string().min(4, { message: "아이디는 4자 이상 입력해주세요." }),
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // ★ 기존 로직 100% 유지
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setErrorMsg("");
      setIsSubmitting(true);

      const response: any = await apiClient.post("/api/v1/auth/login", values);

      login(
        { id: response.user.id, name: response.user.name },
        response.accessToken,
      );

      // 동적 라우팅으로 이동
      router.push(`/workspace/${response.user.id}`);
    } catch (error: any) {
      console.error("로그인 에러:", error);
      setErrorMsg(
        error.response?.data?.message || "아이디 또는 비밀번호를 확인해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ★ UI 부분만 와이어프레임 디자인 반영
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white rounded-2xl">
        <CardHeader className="space-y-1 text-center pb-6">
          <h1 className="text-3xl font-black text-indigo-600 tracking-tighter mb-2">
            OneTake
          </h1>
          <CardTitle className="text-xl font-bold text-gray-900">
            로그인
          </CardTitle>
          <CardDescription className="text-gray-500">
            서비스 이용을 위해 아이디와 비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      아이디
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="아이디를 입력하세요"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
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
                    <FormLabel className="text-gray-700 font-medium">
                      비밀번호
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="********"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-1">
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "로그인하기"
                )}
              </Button>
            </form>
          </Form>

          {/* 소셜 로그인 구분선 (와이어프레임 반영) */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 그룹 */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-11 font-medium text-gray-600 hover:bg-gray-50 border-gray-200"
            >
              Google
            </Button>
            <Button
              variant="outline"
              className="h-11 font-medium text-gray-600 hover:bg-[#FEE500] hover:text-black hover:border-[#FEE500] border-gray-200"
            >
              Kakao
            </Button>
            <Button
              variant="outline"
              className="h-11 font-medium text-gray-600 hover:bg-[#03C75A] hover:text-white hover:border-[#03C75A] border-gray-200"
            >
              Naver
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-gray-500 pb-8">
          계정이 없으신가요?&nbsp;
          <Link
            href="/signup"
            className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-colors"
          >
            회원가입
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
