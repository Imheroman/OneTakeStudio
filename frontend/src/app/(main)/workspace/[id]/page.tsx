"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { WorkspaceHome } from "@/widgets/workspace/workspace-home";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user, accessToken, isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();
  const userId = decodeURIComponent(id);

  useEffect(() => {
    if (hasHydrated && (!isLoggedIn || !accessToken)) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, accessToken, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return <WorkspaceHome userId={userId} userName={user?.nickname} />;
}
