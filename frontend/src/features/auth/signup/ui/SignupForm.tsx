"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { AuthResponse, SignupRequest } from "@/entities/user/model";

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
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

const formSchema = z
  .object({
    name: z.string().min(2, { message: "이름은 2글자 이상이어야 합니다." }),
    nickname: z
      .string()
      .min(2, { message: "닉네임은 2글자 이상이어야 합니다." }),
    username: z
      .string()
      .min(4, { message: "아이디는 4글자 이상이어야 합니다." }),
    password: z
      .string()
      .min(8, { message: "비밀번호는 8글자 이상이어야 합니다." }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "약관에 동의해야 합니다.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export function SignupForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      nickname: "",
      username: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      setServerError("");

      const signupData: SignupRequest = {
        username: values.username,
        password: values.password,
        name: values.name,
        nickname: values.nickname,
      };

      const response = await apiClient.post<AuthResponse>(
        "/api/v1/auth/signup",
        signupData,
      );

      if (response.accessToken && response.user) {
        login(response.user, response.accessToken);
        router.push(`/workspace/${response.user.id}`);
      } else {
        router.push("/login");
      }
    } catch (error: any) {
      console.error("회원가입 에러:", error);
      setServerError(
        error.response?.data?.message || "회원가입 중 문제가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed top-8 left-8 z-50 md:top-12 md:left-12">
        <Link
          href="/"
          className="text-indigo-600 flex items-center gap-2 hover:underline font-medium text-sm md:text-base"
        >
          <ArrowLeft size={20} />
          홈으로 돌아가기
        </Link>
      </div>

      <Card className="w-full max-w-[500px] border-0 shadow-xl bg-white rounded-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">회원가입</CardTitle>
          <CardDescription>
            OneTake의 모든 기능을 사용하려면 계정을 생성하세요.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a nickname" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your ID" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal text-gray-600">
                        I agree to{" "}
                        <span className="text-indigo-600 font-medium">
                          Terms of Service
                        </span>{" "}
                        and{" "}
                        <span className="text-indigo-600 font-medium">
                          Privacy Policy
                        </span>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {form.formState.errors.terms && (
                <p className="text-[0.8rem] font-medium text-red-500">
                  {form.formState.errors.terms.message}
                </p>
              )}

              {serverError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-medium">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="h-11">
              Google
            </Button>
            <Button
              variant="outline"
              className="h-11 hover:bg-[#FEE500] hover:text-black hover:border-[#FEE500]"
            >
              Kakao
            </Button>
            <Button
              variant="outline"
              className="h-11 hover:bg-[#03C75A] hover:text-white hover:border-[#03C75A]"
            >
              Naver
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-gray-500 pb-6">
          Already have an account?&nbsp;
          <Link
            href="/login"
            className="text-indigo-600 hover:underline font-bold"
          >
            Log in
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}
