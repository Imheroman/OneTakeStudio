"use client";

import { useEffect, Suspense } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoLibrary } from "@/widgets/library/video-library";

function LibraryContent() {
  const searchParams = useSearchParams();
  const studioId = searchParams.get("studioId") ?? undefined;
  return <VideoLibrary studioId={studioId} />;
}

export default function LibraryPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace(`/?auth=login&redirect=${encodeURIComponent("/library")}`);
    }
  }, [hasHydrated, isLoggedIn, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <Suspense fallback={<div className="p-8">로딩 중...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
