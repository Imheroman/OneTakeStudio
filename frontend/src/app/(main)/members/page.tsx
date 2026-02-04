"use client";

import { useEffect, Suspense, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { FavoriteManagement } from "@/widgets/favorites/favorite-management";
import { ReceivedInvitesPanel } from "@/widgets/workspace/received-invites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

type TabValue = "team" | "invites";

function MembersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabValue>(
    tabParam === "invites" ? "invites" : "team"
  );

  useEffect(() => {
    const t = tabParam === "invites" ? "invites" : "team";
    setActiveTab(t);
  }, [tabParam]);

  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  const handleTabChange = (value: string) => {
    const v = value as TabValue;
    setActiveTab(v);
    const url = v === "invites" ? "/members?tab=invites" : "/members";
    router.replace(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1
          className={cn(
            "text-3xl font-bold tracking-tight",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          팀 관리
        </h1>
        <p
          className={cn(
            "mt-1 text-sm",
            isDark ? "text-gray-400" : "text-gray-500"
          )}
        >
          팀원과 받은 초대를 관리합니다.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList
          className={cn(
            "grid w-full max-w-md grid-cols-2",
            isDark && "bg-gray-800 border border-gray-700"
          )}
        >
          <TabsTrigger
            value="team"
            className={cn(
              isDark &&
                "data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 data-[state=inactive]:text-gray-400"
            )}
          >
            팀원
          </TabsTrigger>
          <TabsTrigger
            value="invites"
            className={cn(
              isDark &&
                "data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 data-[state=inactive]:text-gray-400"
            )}
          >
            받은 초대
          </TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-6">
          <FavoriteManagement />
        </TabsContent>
        <TabsContent value="invites" className="mt-6">
          <ReceivedInvitesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MembersPage() {
  const { isLoggedIn, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace(`/?auth=login&redirect=${encodeURIComponent("/members")}`);
    }
  }, [hasHydrated, isLoggedIn, router]);

  if (!hasHydrated) return null;
  if (!isLoggedIn) return null;

  return (
    <Suspense fallback={<div className="p-8">로딩 중...</div>}>
      <MembersContent />
    </Suspense>
  );
}
