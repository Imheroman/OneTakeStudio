"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { VideoLibrary } from "@/features/library/video-library";

export default function LibraryPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return <VideoLibrary />;
}
