import { Radio, Video, Users, BarChart3, ShieldCheck, Globe } from "lucide-react";

import { FeatureCard } from "@/components/landing/molecules/FeatureCard";

const FEATURES = [
  {
    title: "실시간 스트리밍",
    description: "지연을 줄이고 안정적인 라이브 스트리밍을 지원해요.",
    icon: <Radio className="h-5 w-5" />,
  },
  {
    title: "원클릭 녹화",
    description: "복잡한 설정 없이 고화질 녹화를 바로 시작할 수 있어요.",
    icon: <Video className="h-5 w-5" />,
  },
  {
    title: "다중 참여자",
    description: "게스트/패널 참여를 위한 협업 구조를 확장할 수 있어요.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "실시간 분석",
    description: "시청/송출 상태를 빠르게 파악할 수 있는 지표를 제공해요.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "보안 스트리밍",
    description: "권한 기반 접근 제어와 보안 정책을 고려해 설계해요.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "글로벌 CDN",
    description: "전 세계 어디서든 안정적인 전송 품질을 목표로 해요.",
    icon: <Globe className="h-5 w-5" />,
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1">
            핵심 기능
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            원테이크가 특별한 이유
          </h2>
          <p className="text-gray-600">
            전문 스트리머부터 입문자까지, 모두를 위한 완벽한 솔루션
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

