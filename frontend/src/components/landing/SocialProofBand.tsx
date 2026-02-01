"use client";

import { motion } from "motion/react";
import { User } from "lucide-react";

export function SocialProofBand() {
  return (
    <section className="relative py-6 bg-white/5 border-y border-white/10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-sm sm:text-base text-white/90 text-center sm:text-left"
        >
          이미 <strong className="text-white">1,000명 이상</strong>의
          크리에이터가 OneTake로 시간을 절약하고 있습니다
        </motion.p>
        <div className="flex shrink-0 items-center gap-0">
          {/* 겹쳐진 사람 아이콘 4개 */}
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex size-10 items-center justify-center rounded-full border-2 border-black bg-white/10 text-white/90 ring-2 ring-black"
              >
                <User className="size-5" strokeWidth={2} />
              </div>
            ))}
          </div>
          <span className="ml-2 text-white/70 text-lg font-medium tracking-wider">
            ...
          </span>
        </div>
      </div>
    </section>
  );
}
