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

  // 인증 실패 시 로그인으로(replace). URL(id) 잘못된 경우 보정.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn || !accessToken) {
      router.replace(
        `/?auth=login&redirect=${encodeURIComponent(`/workspace/${userId}`)}`
      );
      return;
    }
    if (!idInvalid) return;
    if (user?.userId) {
      router.replace(`/workspace/${user.userId}`);
      return;
    }
    router.replace("/");
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
