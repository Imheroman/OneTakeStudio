"use client";

import Link from "next/link";
import { useEffect, use } from "react"; // use 훅 추가
import { useRouter } from "next/navigation";
import { Radio, Video } from "lucide-react";
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
import { ActionCard, PageHeader } from "@/components/shared/common";

// [Mock Data] 최근 스튜디오 목록
const recentStudios = [
  { id: 1, title: "Weekly Podcast Studio", date: "Jan 15, 2026" },
  { id: 2, title: "Product Demo Setup", date: "Jan 14, 2026" },
  { id: 3, title: "Team Meeting Room", date: "Jan 12, 2026" },
  { id: 4, title: "Gaming Stream Studio", date: "Jan 10, 2026" },
  { id: 5, title: "Tutorial Recording Space", date: "Jan 8, 2026" },
];

// 1. Next.js 15 규격에 맞는 타입 정의
interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  // 2. 'use' 훅을 사용하여 비동기 params를 언래핑합니다.
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { user, accessToken, isLoggedIn, logout, hasHydrated } = useAuthStore();
  const router = useRouter();
  
  // URL 인코딩 대응
  const userId = decodeURIComponent(id);

  // 3. 보안 가드: 리다이렉트 로직 최적화
  useEffect(() => {
    if (hasHydrated && (!isLoggedIn || !accessToken)) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, accessToken, router]);

  // 하이드레이션 전에는 아무것도 렌더링하지 않음 (Hydration Mismatch 방지)
  if (!hasHydrated) return null;
  // 로그인 체크 중일 때 깜빡임 방지
  if (!isLoggedIn) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 상단 환영 섹션 (Top Nav는 공통 레이아웃에서 제공) */}
      <PageHeader
        title={
          <>
            <span className="text-indigo-600">{user?.name ?? userId}</span>님, 반가워요!
          </>
        }
        description="오늘도 당신만의 멋진 방송을 만들어보세요."
      />

      {/* 액션 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          title="Start Live Streaming"
          description="Go live instantly with our professional streaming tools"
          icon={<Radio className="h-8 w-8 text-gray-600" />}
          href="/studio"
          actionLabel="Start Streaming"
        />
        <ActionCard
          title="Start Recording"
          description="Record high-quality content for later publishing"
          icon={<Video className="h-8 w-8 text-gray-600" />}
          href="/studio"
          actionLabel="Start Recording"
        />
      </div>

        {/* 최근 스튜디오 목록 테이블 */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6">Recent Studios</h3>
            <div className="rounded-md border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-gray-50/50">
                    <TableHead className="w-[50%] text-gray-600 font-semibold">Title</TableHead>
                    <TableHead className="text-gray-600 font-semibold">Last Modified</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStudios.map((studio) => (
                    <TableRow key={studio.id} className="hover:bg-gray-50/80 transition-colors">
                      <TableCell className="font-medium text-gray-700 py-4">{studio.title}</TableCell>
                      <TableCell className="text-gray-500">{studio.date}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/studio/${studio.id}`}>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                            Enter Studio
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
