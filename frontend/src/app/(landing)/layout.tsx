import { Navbar } from "@/widgets/landing/navbar";
import { LandingFooter } from "@/widgets/landing/footer";
import Link from "next/link";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar
        variant="dark"
        menuItems={[
          {
            label: "주요기능",
            dropdown: true,
            items: [
              { label: "실시간 스트리밍", href: "/#features" },
              { label: "원클릭 녹화", href: "/#features" },
              { label: "다중 참여자", href: "/#features" },
              { label: "실시간 분석", href: "/#features" },
              { label: "AI 자동 편집", href: "/#features" },
              { label: "클라우드 저장", href: "/#features" },
            ],
          },
          { label: "가이드", href: "/#guide" },
          { label: "고객지원", href: "/#contact" },
        ]}
        rightElement={
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 transition-colors"
            >
              지금 시작하기
            </Link>
          </div>
        }
      />

      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}
