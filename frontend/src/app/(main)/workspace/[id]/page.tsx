"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { WorkspaceHome } from "@/widgets/workspace/workspace-home";
import { Loader2 } from "lucide-react";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

const isValidWorkspaceId = (id: string) =>
  id != null && id !== "" && id !== "undefined";

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user, accessToken, isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();
  const userId = decodeURIComponent(id);
  const idInvalid = !isValidWorkspaceId(id);

  // 비로그인 시 로그인 페이지로
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn || !accessToken) {
      router.replace("/login");
      return;
    }
    // URL id가 undefined 등 잘못된 경우: 스토어에 userId가 있으면 올바른 URL로 교정
    if (idInvalid && user?.userId) {
      router.replace(`/workspace/${user.userId}`);
    }
    // 로그인됐지만 userId가 아직 없고 URL도 잘못된 경우 → 랜딩으로 (데이터 로드 후 랜딩에서 워크스페이스로 리다이렉트)
    if (idInvalid && isLoggedIn && !user?.userId) {
      router.replace("/");
    }
  }, [hasHydrated, isLoggedIn, accessToken, idInvalid, user?.userId, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (!isLoggedIn) return null;

  // id가 잘못된 동안 로딩 표시 (위 useEffect에서 리다이렉트 처리)
  if (idInvalid) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">워크스페이스 불러오는 중...</p>
      </div>
    );
  }

  return <WorkspaceHome userId={userId} userName={user?.nickname} />;
}
