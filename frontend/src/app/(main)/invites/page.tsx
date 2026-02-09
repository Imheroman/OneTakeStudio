"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

/**
 * 받은 초대 기능은 팀 관리에 통합되었습니다.
 * /invites 접근 시 팀 관리의 "받은 초대" 탭으로 리다이렉트합니다.
 */
export default function InvitesPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isLoggedIn) {
      router.replace(`/?auth=login&redirect=${encodeURIComponent("/invites")}`);
      return;
    }
    router.replace("/members?tab=invites");
  }, [hasHydrated, isLoggedIn, router]);

  return null;
}
