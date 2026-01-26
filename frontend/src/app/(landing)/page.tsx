"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
// 추후 작성할 Organisms 임포트
// import HeroSection from "@/components/organisms/landing/HeroSection";
// import FeatureSection from "@/components/organisms/landing/FeatureSection";

export default function LandingPage() {
  const { isLoggedIn, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 로그인된 유저는 본인의 워크스페이스로 자동 리다이렉트
    if (!hasHydrated) return;
    if (isLoggedIn && user) {
      router.replace(`/workspace/${user.id}`);
    }
  }, [hasHydrated, isLoggedIn, user, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="grow">
        {/* 유기체(Organisms) 단위로 섹션을 배치하여 가독성 확보 */}
        {/* <HeroSection /> */}
        {/* <FeatureSection /> */}
        
        {/* 임시 플레이스홀더 */}
        <section className="py-20 text-center bg-linear-to-b from-indigo-50 to-white">
          <h1 className="text-5xl font-black italic text-indigo-600 tracking-tighter mb-4">
            OneTake
          </h1>
          <p className="text-xl text-gray-600">
            창작의 시간은 줄이고 가치는 높이는 통합 영상 송출 솔루션
          </p>
        </section>
      </main>
    </div>
  );
}