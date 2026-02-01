import { Logo } from "@/shared/ui/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-8 px-6 bg-black">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Logo dark size="md" />
          <p className="text-sm text-gray-400">
            창작의 시간은 줄이고 가치는 높이는 통합 영상 송출 솔루션
          </p>
        </div>
        <div className="text-xs text-white/50">
          © {new Date().getFullYear()} OneTake. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
