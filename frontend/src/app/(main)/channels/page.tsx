"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { ChannelManagement } from "@/widgets/channels/channel-management";

export default function ChannelsPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoggedIn, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return <ChannelManagement />;
}
