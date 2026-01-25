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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setErrorMsg("");
      setIsSubmitting(true);

      // 1. MSW 핸들러 주소와 일치시킴
      const response: any = await apiClient.post("/api/v1/auth/login", values);

      // 2. Zustand 스토어 업데이트 (accessToken 필드명 확인)
      login(
        { id: response.user.id, name: response.user.name },
        response.accessToken
      );

      // 3. 워크스페이스 도메인으로 이동 (id 기반 동적 라우팅)
      router.push(`/workspace/${response.user.id}`);
      
    } catch (error: any) {
      console.error("로그인 에러 세부사항:", error);
      // MSW가 던지는 401 에러 메시지 우선 노출
      setErrorMsg(error.response?.data?.message || "아이디 또는 비밀번호를 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100/50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white">
        <CardHeader className="space-y-2 text-center pb-2">
          <h1 className="text-4xl font-black text-indigo-600 italic tracking-tighter">OneTake</h1>
          <CardTitle className="text-2xl font-bold text-gray-900">로그인</CardTitle>
          <CardDescription className="text-gray-500">
            당신의 워크스페이스에 접속하세요.
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
                    <FormLabel>아이디</FormLabel>
                    <FormControl>
                      <Input placeholder="아이디 입력" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "워크스페이스 입장"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          신규 사용자이신가요?&nbsp;
          <Link href="/signup" className="text-indigo-600 hover:underline font-bold">회원가입</Link>
        </CardFooter>
      </Card>
    </div>
  );
}