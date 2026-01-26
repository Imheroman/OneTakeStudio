"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, Video, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// [Mock Data] 최근 스튜디오 목록
const recentStudios = [
  { id: 1, title: "Weekly Podcast Studio", date: "Jan 15, 2026" },
  { id: 2, title: "Product Demo Setup", date: "Jan 14, 2026" },
  { id: 3, title: "Team Meeting Room", date: "Jan 12, 2026" },
  { id: 4, title: "Gaming Stream Studio", date: "Jan 10, 2026" },
  { id: 5, title: "Tutorial Recording Space", date: "Jan 8, 2026" },
];

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const { id } = params; // URL 파라미터에서 id 추출
  const { user, accessToken, isLoggedIn, logout, hasHydrated } = useAuthStore();
  const router = useRouter();
  const userId = decodeURIComponent(id);

  // 1. 보안 가드: 토큰이나 로그인 정보가 없으면 튕겨냄
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn || !accessToken) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, accessToken, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-8 max-w-7xl mx-auto px-6 py-8">
        {/* 상단 환영 메시지 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              <span className="text-indigo-600">{user?.name ?? userId}</span>님,
              반가워요!
            </h1>
            <p className="text-gray-500">
              오늘도 당신만의 멋진 방송을 만들어보세요.
            </p>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>

        {/* 액션 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 라이브 스트리밍 카드 */}
          <Card className="hover:shadow-lg transition-shadow border-gray-200">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Radio className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Start Live Streaming</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Go live instantly with our professional streaming tools
                </p>
              </div>
              <Link href="/studio">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-2 h-auto text-base">
                  Start Streaming
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 녹화 카드 */}
          <Card className="hover:shadow-lg transition-shadow border-gray-200">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Video className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Start Recording</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Record high-quality content for later publishing
                </p>
              </div>
              <Link href="/studio">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-2 h-auto text-base">
                  Start Recording
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 최근 스튜디오 목록 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6">Recent Studios</h3>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="w-[50%] text-gray-400 font-medium">
                    Title
                  </TableHead>
                  <TableHead className="text-gray-400 font-medium">
                    Last Modified
                  </TableHead>
                  <TableHead className="text-right text-gray-400 font-medium" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStudios.map((studio) => (
                  <TableRow
                    key={studio.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-gray-700 py-4">
                      {studio.title}
                    </TableCell>
                    <TableCell className="text-gray-500">{studio.date}</TableCell>
                    <TableCell className="text-right">
                      <Link href="/studio">
                        <Button className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-sm font-normal rounded-md">
                          Enter Studio
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
