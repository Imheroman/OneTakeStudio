import { ActionButton } from "@/shared/common";

export function CTASection() {
  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-3xl p-10 text-center bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            지금 바로 시작하세요
          </h3>
          <p className="mt-2 text-white/85 text-sm sm:text-base">
            14일 무료 체험, 신용카드 필요 없어요
          </p>
          <div className="mt-6 flex items-center justify-center">
            <ActionButton href="/?auth=signup" variant="outline">
              무료 체험 시작하기
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}
