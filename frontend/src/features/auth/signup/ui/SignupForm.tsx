"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import {
  getHttpErrorStatus,
  getHttpErrorMessage,
} from "@/shared/lib/error-utils";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  SimpleResponseSchema,
  type SignupRequest,
} from "@/entities/user/model";

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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { cn } from "@/shared/lib/utils";

const formSchema = z
  .object({
    nickname: z
      .string()
      .min(2, { message: "닉네임은 2글자 이상이어야 합니다." }),
    email: z.string().email({ message: "올바른 이메일 형식을 입력해주세요." }),
    verificationCode: z
      .string()
      .min(6, { message: "인증 코드를 입력해주세요." }),
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

interface SignupFormProps {
  /** 모달 모드: 로그인 링크 대신 클릭 핸들러 사용 */
  onSwitchToLogin?: () => void;
  /** 모달 모드: 회원가입 성공 시 호출 (예: 모달 닫고 로그인 모달 열기) */
  onSignupSuccess?: () => void;
}

export function SignupForm({
  onSwitchToLogin,
  onSignupSuccess,
}: SignupFormProps = {}) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: "",
      email: "",
      verificationCode: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  // 이메일 인증 코드 발송
  const handleSendVerificationCode = async () => {
    const email = form.getValues("email");

    // 이메일 형식 직접 검증
    if (!email || !email.trim()) {
      form.setError("email", { message: "이메일을 입력해주세요." });
      return;
    }

    // zod email validation 사용 (deprecated 파라미터 제거)
    const emailSchema = z.string().email();
    const emailValidation = emailSchema.safeParse(email);

    if (!emailValidation.success) {
      form.setError("email", {
        message:
          emailValidation.error.issues[0]?.message ||
          "올바른 이메일 형식을 입력해주세요.",
      });
      return;
    }

    try {
      setIsSendingCode(true);
      setServerError("");

      await apiClient.post(
        "/api/auth/send-verification",
        SimpleResponseSchema,
        { email }
      );

      setIsCodeSent(true);
      setIsEmailVerified(false); // 새 코드 발송 시 인증 상태 초기화
      alert("인증 코드가 이메일로 발송되었습니다.");
    } catch (error: unknown) {
      console.error("인증 코드 발송 에러:", error);
      setServerError(
        getHttpErrorMessage(error, "인증 코드 발송에 실패했습니다.")
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  // 이메일 인증 코드 확인
  const handleVerifyEmail = async () => {
    const email = form.getValues("email");
    const code = form.getValues("verificationCode");

    if (!email || !email.trim()) {
      form.setError("email", { message: "이메일을 입력해주세요." });
      return;
    }

    if (!code || !code.trim()) {
      form.setError("verificationCode", {
        message: "인증 코드를 입력해주세요.",
      });
      return;
    }

    try {
      setIsVerifying(true);
      setServerError("");

      await apiClient.post("/api/auth/verify-email", SimpleResponseSchema, {
        email: email.trim(),
        code: code.trim(),
      });

      setIsEmailVerified(true);
      alert("이메일 인증이 완료되었습니다.");
    } catch (error: unknown) {
      console.error("이메일 인증 에러:", error);
      const errorMessage = getHttpErrorMessage(
        error,
        "인증 코드가 올바르지 않습니다."
      );
      form.setError("verificationCode", { message: errorMessage });
      setServerError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // 이메일 인증이 완료되었는지 확인
    if (!isEmailVerified) {
      setServerError("먼저 이메일 인증 코드를 발송하고 인증을 완료해주세요.");
      return;
    }

    // 인증 코드는 이미 검증되었으므로 저장된 값 사용
    if (
      !values.verificationCode ||
      values.verificationCode.trim().length === 0
    ) {
      form.setError("verificationCode", {
        message: "인증 코드를 입력해주세요.",
      });
      return;
    }

    const signupData: SignupRequest = {
      email: values.email.trim(),
      password: values.password,
      verificationCode: values.verificationCode.trim(),
      nickname: values.nickname.trim(),
    };

    try {
      setIsSubmitting(true);
      setServerError("");

      const response = await apiClient.post(
        "/api/auth/register",
        SimpleResponseSchema,
        signupData
      );

      if (response.success) {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
        if (onSignupSuccess) {
          onSignupSuccess();
        } else {
          router.push("/?auth=login");
        }
      }
    } catch (error: unknown) {
      console.error("회원가입 에러:", error);

      const status = getHttpErrorStatus(error);
      // 400 Bad Request 에러 상세 로깅
      if (
        status === 400 &&
        error &&
        typeof error === "object" &&
        "response" in error
      ) {
        const res = (
          error as {
            response?: {
              data?: { message?: string } | string;
              headers?: unknown;
            };
          }
        ).response;
        const responseData = res?.data;
        console.error("400 Bad Request 상세:", {
          status,
          data: res?.data,
          requestData: signupData,
          headers: res?.headers,
        });

        // 백엔드 ApiResponse 형식: { resultCode, success, message, data, errorCode }
        let errorMessage = "회원가입 요청이 올바르지 않습니다.";
        const msg =
          responseData &&
          typeof responseData === "object" &&
          "message" in responseData
            ? (responseData as { message?: string }).message
            : typeof responseData === "string"
            ? responseData
            : undefined;
        if (msg) errorMessage = msg;

        // 일반적인 400 에러 원인 안내
        if (
          errorMessage.includes("인증") ||
          errorMessage.includes("verification")
        ) {
          errorMessage += " 이메일 인증 코드를 다시 확인해주세요.";
        } else if (
          errorMessage.includes("이메일") ||
          errorMessage.includes("email")
        ) {
          errorMessage += " 이메일 형식과 중복 여부를 확인해주세요.";
        } else if (
          errorMessage.includes("닉네임") ||
          errorMessage.includes("nickname")
        ) {
          errorMessage += " 닉네임은 2-20자이며 중복되지 않아야 합니다.";
        }

        setServerError(errorMessage);
      } else if (
        error instanceof Error &&
        (error.message?.includes("Network Error") ||
          (error as { code?: string }).code === "ERR_NETWORK")
      ) {
        setServerError(
          "네트워크 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요."
        );
      } else if (
        error instanceof Error &&
        error.message?.includes("API 응답 검증 실패")
      ) {
        setServerError("서버 응답 형식이 올바르지 않습니다.");
      } else {
        setServerError(
          getHttpErrorMessage(error, "회원가입 중 문제가 발생했습니다.")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-[500px] border-0 shadow-xl bg-white rounded-2xl">
      <div className="flex justify-center pt-1 pb-1">
        <Logo href="/" size="lg" />
      </div>
      <CardHeader className="space-y-1 text-center pb-6">
        <CardTitle className="text-2xl font-bold text-gray-900">
          회원가입
        </CardTitle>
        <CardDescription className="text-gray-500">
          원테이크의 모든 기능을 사용하려면 계정을 생성하세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    닉네임
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="닉네임을 입력하세요"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    이메일
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="이메일을 입력하세요"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // 이메일 변경 시 인증 상태 초기화
                          if (isEmailVerified || isCodeSent) {
                            setIsEmailVerified(false);
                            setIsCodeSent(false);
                            form.setValue("verificationCode", "");
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode || !form.getValues("email")}
                      className="whitespace-nowrap"
                    >
                      {isSendingCode ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : isCodeSent ? (
                        "재발송"
                      ) : (
                        "인증코드 발송"
                      )}
                    </Button>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {isCodeSent && (
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">
                      인증 코드
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="이메일로 받은 인증 코드를 입력하세요"
                          className={cn(
                            "h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all",
                            isEmailVerified && "bg-green-50 border-green-500"
                          )}
                          {...field}
                          disabled={isEmailVerified}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant={isEmailVerified ? "outline" : "default"}
                        onClick={handleVerifyEmail}
                        disabled={
                          isVerifying ||
                          isEmailVerified ||
                          !form.getValues("verificationCode")
                        }
                        className="whitespace-nowrap"
                      >
                        {isVerifying ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : isEmailVerified ? (
                          "✓ 완료"
                        ) : (
                          "확인"
                        )}
                      </Button>
                    </div>
                    {isEmailVerified && (
                      <p className="text-sm text-green-600 font-medium">
                        이메일 인증이 완료되었습니다.
                      </p>
                    )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    비밀번호
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all pr-10"
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
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    비밀번호 확인
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력하세요"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all pr-10"
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
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <FormMessage className="text-xs" />
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
                      <span className="text-indigo-600 font-medium">
                        이용약관
                      </span>
                      과{" "}
                      <span className="text-indigo-600 font-medium">
                        개인정보처리방침
                      </span>
                      에 동의합니다
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
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-1">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "회원가입하기"
              )}
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400 font-medium">
              또는 다음으로 가입하기
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="google-oauth-hover h-11 transition-colors"
          >
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

      <CardFooter className="flex justify-center text-sm text-gray-500 pb-8">
        이미 계정이 있으신가요?&nbsp;
        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-colors"
          >
            로그인
          </button>
        ) : (
          <Link
            href="/?auth=login"
            className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-colors"
          >
            로그인
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
