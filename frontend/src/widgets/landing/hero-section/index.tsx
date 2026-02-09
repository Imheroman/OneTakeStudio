import { Play, Sparkles, ArrowRight } from "lucide-react";
import { ActionButton } from "@/shared/common";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-indigo-950">
      {/* 배경 오버레이(이미지 대체용 그라데이션/블러) */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,rgba(99,102,241,0.55),transparent),radial-gradient(70%_55%_at_80%_35%,rgba(168,85,247,0.55),transparent)]" />
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs text-white/90">
          <Play className="h-3.5 w-3.5" />
          자세한 소개 영상 둘러보기
        </div>

        <h1 className="mt-6 text-4xl sm:text-6xl font-black tracking-tighter text-white">
          창작의 시간은 줄이고
          <br />
          가치는 높이는,
          <br />
          통합 영상 송출 솔루션
        </h1>

        <p className="mt-6 text-base sm:text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
          OneTake와 함께 라이브 스트리밍, 녹화, 운영을 하나의 플랫폼에서
          경험하세요.
          <br />
          전문가 수준의 방송을 누구나 쉽게.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <ActionButton href="/?auth=signup" variant="outline">
            무료로 시작하기
          </ActionButton>
          <ActionButton
            href="/#guide"
            variant="primary"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            데모 보기
          </ActionButton>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-white/70">
          <Sparkles className="h-4 w-4" />
          빠르게 시작하고, 오래 쓰기 쉬운 송출 환경
        </div>
      </div>
    </section>
  );
}
