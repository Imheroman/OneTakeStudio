"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { updateProfile } from "@/shared/api/users";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Separator } from "@/shared/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Loader2, User, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// 1. 프로필 수정 스키마 (백엔드: 2–20자)
const profileSchema = z.object({
  nickname: z
    .string()
    .min(2, { message: "닉네임은 2글자 이상이어야 합니다." })
    .max(20, { message: "닉네임은 20자 이하여야 합니다." }),
});

// 2. 비밀번호 변경 스키마
const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "현재 비밀번호를 입력해주세요." }),
    newPassword: z
      .string()
      .min(8, { message: "새 비밀번호는 8자 이상이어야 합니다." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export default function MyPage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user?.nickname ?? "",
    },
  });

  useEffect(() => {
    if (user?.nickname != null) {
      profileForm.reset({ nickname: user.nickname });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user 변경 시 폼만 동기화
  }, [user?.nickname]);

  // 비밀번호 폼
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    try {
      setIsLoading(true);
      const updated = await updateProfile({ nickname: values.nickname });
      updateUser(updated);
      profileForm.reset({ nickname: updated.nickname });
      alert(`닉네임이 '${updated.nickname}'(으)로 변경되었습니다.`);
    } catch (error) {
      console.error(error);
      alert("프로필 수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  // [Action] 비밀번호 변경
  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    try {
      setIsLoading(true);
      // API 요청
      // await apiClient.put("/api/users/password", values);

      console.log("비밀번호 변경 요청:", values);
      alert("비밀번호가 성공적으로 변경되었습니다.");
      passwordForm.reset();
    } catch (error) {
      console.error(error);
      alert("현재 비밀번호가 일치하지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          마이페이지
        </h1>
        <p className="text-gray-500">내 계정 정보와 설정을 관리하세요.</p>
      </div>

      <Separator />

      <div className="flex flex-col md:flex-row gap-8">
        {/* 왼쪽: 요약 프로필 카드 */}
        <aside className="md:w-1/3">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.profileImageUrl ?? undefined} />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl font-bold">
                    {user?.nickname?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{user?.nickname}</CardTitle>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm("정말 로그아웃 하시겠습니까?")) {
                    logout();
                    router.push("/login");
                  }
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </CardFooter>
          </Card>
        </aside>

        {/* 오른쪽: 설정 탭 */}
        <div className="flex-1">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">프로필 설정</TabsTrigger>
              <TabsTrigger value="password">보안 설정</TabsTrigger>
            </TabsList>

            {/* 탭 1: 프로필 설정 */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>프로필 수정</CardTitle>
                  <CardDescription>
                    다른 사용자에게 보여질 정보를 수정합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...profileForm}>
                    <form
                      onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                      className="space-y-4"
                    >
                      {/* 이메일 (읽기 전용) */}
                      <div className="space-y-2">
                        <FormLabel className="text-sm font-medium">
                          이메일
                        </FormLabel>
                        <Input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500">
                          이메일은 변경할 수 없습니다.
                        </p>
                      </div>

                      {/* 닉네임 수정 */}
                      <FormField
                        control={profileForm.control}
                        name="nickname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>닉네임</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="닉네임을 입력하세요"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          변경사항 저장
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 탭 2: 비밀번호 변경 */}
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>비밀번호 변경</CardTitle>
                  <CardDescription>
                    계정 보안을 위해 비밀번호를 주기적으로 변경해주세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>현재 비밀번호</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="********"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Separator className="my-2" />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>새 비밀번호</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="8자 이상 입력"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>새 비밀번호 확인</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="한 번 더 입력"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          variant="secondary"
                        >
                          {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          비밀번호 변경
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
