"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { StudioMain } from "@/features/studio/studio-main";

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export default function StudioPage({ params }: StudioPageProps) {
  const resolvedParams = use(params);
  const studioId = resolvedParams.id;
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return <StudioMain studioId={studioId} />;
}
