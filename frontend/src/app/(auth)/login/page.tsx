// src/app/(auth)/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

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
import axios from "axios";
import { useState } from "react";

// 1. 유효성 검사 규칙 변경 (이메일 -> 아이디)
const formSchema = z.object({
  username: z.string().min(4, { message: "아이디는 4자 이상 입력해주세요." }), // ID 길이 제한
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore(); // zustand 로그인 함수 가져오기
  const [errorMsg, setErrorMsg] = useState(""); // ★ 로그인 에러 메시지 상태

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "", // 초기값 변경
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setErrorMsg(""); // 에러 초기화

      // 1. 진짜 API 요청 보내기 (MSW가 가로챔)
      const response = await axios.post("/api/login", {
        username: values.username,
        password: values.password,
      });

      console.log("로그인 성공 응답:", response.data);

      // 2. 응답받은 데이터로 상태 업데이트
      login({
        id: response.data.user.id,
        name: response.data.user.name,
      });

      // 3. 워크스페이스로 이동
      router.push("/workspace");
    } catch (error: any) {
      console.error("로그인 실패:", error);
      // MSW가 보낸 401 에러 메시지 띄우기
      if (error.response) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg("로그인 중 문제가 발생했습니다.");
      }
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
      <CardHeader className="space-y-1 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 mb-2">OneTake</h1>
        <CardTitle className="text-2xl font-semibold">로그인</CardTitle>
        <CardDescription>
          서비스 이용을 위해 아이디와 비밀번호를 입력해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 아이디 입력 필드 (수정됨) */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>아이디</FormLabel>
                  <FormControl>
                    <Input placeholder="아이디를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />

            {/* 비밀번호 입력 필드 */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />

            {errorMsg && (
              <div className="text-red-500 text-sm text-center font-medium">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              로그인하기
            </Button>
          </form>
        </Form>

        {/* 소셜 로그인 등 하단 생략 (이전 코드와 동일) */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-100 px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => alert("준비중")}
          >
            Google
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => alert("준비중")}
          >
            Kakao
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-gray-600">
        계정이 없으신가요?&nbsp;
        <Link
          href="/signup"
          className="text-indigo-600 hover:underline font-medium"
        >
          회원가입
        </Link>
      </CardFooter>
    </Card>
  );
}
