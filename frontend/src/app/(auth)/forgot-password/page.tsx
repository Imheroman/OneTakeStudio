"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient } from "@/shared/api/client";
import { SimpleResponseSchema } from "@/entities/user/model";
import { getHttpErrorMessage } from "@/shared/lib/error-utils";
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
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 형식을 입력해주세요." }),
});

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      setErrorMsg("");

      await apiClient.post("/api/auth/password-reset", SimpleResponseSchema, {
        email: values.email.trim(),
      });

      setIsEmailSent(true);
    } catch (error) {
      console.error("비밀번호 재설정 요청 실패:", error);
      setErrorMsg(
        getHttpErrorMessage(
          error,
          "비밀번호 재설정 요청에 실패했습니다. 이메일을 확인해주세요."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEmailSent) {
    return (
      <Card className="w-full max-w-md border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-4 pt-10">
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-300" />
          </div>
          <CardTitle className="text-xl font-bold text-white tracking-tight">
            이메일을 확인해주세요
          </CardTitle>
          <CardDescription className="text-white/70 mt-2">
            비밀번호 재설정 링크를 이메일로 보냈습니다.
            <br />
            메일함을 확인해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center px-8">
          <p className="text-sm text-white/70 mb-4">
            이메일이 도착하지 않았나요?
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setIsEmailSent(false);
              setErrorMsg("");
            }}
            className="w-full bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
          >
            다시 시도하기
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pb-10">
          <Link
            href="/?auth=login"
            className="text-indigo-300 hover:text-indigo-200 font-medium text-sm flex items-center gap-1 hover:underline transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="text-center pb-4 pt-10">
        <div className="mx-auto w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mb-2">
          <Mail className="h-7 w-7 text-indigo-300" />
        </div>
        <CardTitle className="text-xl font-bold text-white tracking-tight">
          비밀번호 찾기
        </CardTitle>
        <CardDescription className="text-white/70">
          가입한 이메일 주소를 입력하시면
          <br />
          비밀번호 재설정 링크를 보내드립니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90 font-medium">
                    이메일
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="가입한 이메일을 입력하세요"
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-300" />
                </FormItem>
              )}
            />

            {errorMsg && (
              <p className="text-sm text-red-300 text-center">{errorMsg}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "재설정 링크 보내기"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center text-sm text-white/70 pb-10">
        <Link
          href="/?auth=login"
          className="text-indigo-300 hover:text-indigo-200 font-medium flex items-center gap-1 hover:underline transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          로그인으로 돌아가기
        </Link>
      </CardFooter>
    </Card>
  );
}
