"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/client";
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

const formSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식을 입력해주세요." }),
  password: z.string().min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
});

export function LoginForm() {
  const router = useRouter();
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
        "/api/v1/auth/login",
        AuthResponseSchema,
        values,
      );

      login(response.user, response.accessToken);

      router.push(`/workspace/${response.user.id}`);
    } catch (error: any) {
      console.error("로그인 에러:", error);
      setErrorMsg(
        error.response?.data?.message || "이메일 또는 비밀번호를 확인해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-xl bg-white rounded-2xl">
      <CardHeader className="space-y-1 text-center pb-6">
        <h1 className="text-3xl font-black text-indigo-600 tracking-tighter mb-2">
          OneTake
        </h1>
        <CardTitle className="text-xl font-bold text-gray-900">로그인</CardTitle>
        <CardDescription className="text-gray-500">
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
                  <FormLabel className="text-gray-700 font-medium">이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="이메일을 입력하세요"
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
                  <FormLabel className="text-gray-700 font-medium">비밀번호</FormLabel>
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
  );
}
