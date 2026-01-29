"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { HeroSection } from "@/widgets/landing/hero-section";
import { FeatureSection } from "@/widgets/landing/feature-section";
import { CTASection } from "@/widgets/landing/cta-section";
import { Button } from "@/shared/ui/button";

export default function LandingPage() {
  const { isLoggedIn, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 로그인된 유저는 본인의 워크스페이스로 자동 리다이렉트 (userId 확정 후에만 이동)
    if (!hasHydrated) return;
    if (isLoggedIn && user?.userId) {
      router.replace(`/workspace/${user.userId}`);
    }
  }, [hasHydrated, isLoggedIn, user, router]);

  return (
    <main className="grow">
      <HeroSection />
      <div id="about" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-10">
            <h2 className="text-2xl font-extrabold text-gray-900">OneTake는</h2>
            <p className="mt-3 text-gray-600 leading-relaxed max-w-3xl">
              방송 준비 시간을 줄이고, 송출 품질과 운영 효율을 높이기 위한 통합
              워크스페이스를 목표로 합니다. 지금은 랜딩/인증/워크스페이스 뼈대를
              다듬는 단계이며, 스튜디오 기능을 점진적으로 확장할 예정입니다.
            </p>
          </div>
        </div>
      </div>
      <FeatureSection />
      <div id="guide" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-3xl border border-gray-200 p-10">
            <h2 className="text-2xl font-extrabold text-gray-900">GUIDE</h2>
            <p className="mt-2 text-gray-600">
              아직 데모 영상/페이지가 준비 중이라면, 임시로 이 섹션을 “데모
              보기” 버튼의 목적지로 사용하면 돼요.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                데모 시작
              </Button>
              <Button variant="outline">가이드 문서</Button>
            </div>
          </div>
        </div>
      </div>
      <CTASection />
      <div id="contact" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-3xl border border-gray-200 p-10">
            <h2 className="text-2xl font-extrabold text-gray-900">CONTACT</h2>
            <p className="mt-2 text-gray-600">
              문의 채널은 추후 확정. 지금은 폼/메일/디스코드 중 아무거나로
              연결하면 돼요.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200">
                <div className="font-bold text-gray-900">이메일</div>
                <div className="text-gray-600 mt-1">
                  contact@onetake.example
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200">
                <div className="font-bold text-gray-900">가이드/문서</div>
                <div className="text-gray-600 mt-1">업데이트 예정</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
