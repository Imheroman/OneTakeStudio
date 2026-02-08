"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuthModal } from "@/widgets/landing/auth-modal-context";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { SocialProofBand } from "@/components/landing/SocialProofBand";
import { TimelineScanAnimation } from "@/components/landing/TimelineScanAnimation";
import { GlassmorphicFeatureCard } from "@/components/landing/GlassmorphicFeatureCard";
import { ImageWithFallback } from "@/components/landing/figma/ImageWithFallback";
import { GrainOverlay } from "@/components/landing/GrainOverlay";
import svgPaths from "@/imports/svg-pm6qk27wb4";
import { cn } from "@/shared/lib/utils";

export default function LandingPage() {
  return (
    <Suspense>
      <LandingPageContent />
    </Suspense>
  );
}

function LandingPageContent() {
  const { isLoggedIn, user, hasHydrated } = useAuthStore();
  const { openSignupModal, openLoginModal } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  useEffect(() => {
    if (!hasHydrated) return;
    if (isLoggedIn && user?.userId) {
      router.replace(`/workspace/${user.userId}`);
    }
  }, [hasHydrated, isLoggedIn, user, router]);

  // 로그아웃 후 /?auth=login으로 이동 시 로그인 모달 자동 열기 (URL 정리는 AuthModal에서 처리)
  useEffect(() => {
    if (searchParams.get("auth") === "login") {
      openLoginModal();
    } else if (searchParams.get("auth") === "signup") {
      openSignupModal();
    }
  }, [searchParams, openLoginModal, openSignupModal]);

  return (
    <div
      className={cn(
        "w-full min-h-screen overflow-x-hidden transition-colors duration-300",
        isDark ? "bg-[#121212] text-white" : "bg-[#F9F9F9] text-gray-900"
      )}
    >
      {/* Hero Section — Modern SaaS: charcoal/off-white, purple mesh, grain, gradient keyword, 3D glass CTA */}
      <section className="relative h-screen overflow-hidden">
        {/* Base + purple mesh glow (dark) / clean off-white (light) */}
        <div
          className="absolute inset-0 z-0 transition-colors duration-300"
          style={
            isDark
              ? {
                  backgroundColor: "#121212",
                  backgroundImage: `
                    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.25), transparent),
                    radial-gradient(ellipse 60% 40% at 80% 50%, rgba(99, 102, 241, 0.12), transparent),
                    radial-gradient(ellipse 50% 30% at 20% 80%, rgba(139, 92, 246, 0.1), transparent)
                  `,
                }
              : {
                  backgroundColor: "#F9F9F9",
                  backgroundImage: `
                    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.08), transparent),
                    radial-gradient(ellipse 60% 40% at 80% 50%, rgba(99, 102, 241, 0.05), transparent)
                  `,
                }
          }
        />
        <GrainOverlay />

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 -mt-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "rounded-full px-6 py-2 mb-8 flex items-center gap-3 border transition-colors duration-300 backdrop-blur-sm",
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white/80 border-gray-200/80 shadow-sm"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 opacity-90" />
            <span
              className={cn(
                "text-sm font-medium",
                isDark ? "text-white/90" : "text-gray-700"
              )}
            >
              AI 스튜디오
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="text-center mb-6"
          >
            <h1
              className={cn(
                "text-[48px] sm:text-[60px] md:text-[72px] font-bold leading-tight mb-3 transition-colors duration-300",
                isDark ? "text-white" : "text-gray-900"
              )}
            >
              당신은 방송에만 집중하세요.
            </h1>
            <h1
              className={cn(
                "text-[48px] sm:text-[60px] md:text-[72px] font-bold leading-tight transition-colors duration-300",
                isDark ? "text-white" : "text-gray-900"
              )}
            >
              클릭 한 번으로 완성되는{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-400 to-cyan-400 bg-clip-text font-semibold text-transparent">
                AI 스튜디오
              </span>
              .
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "text-center text-base sm:text-[20px] leading-relaxed mb-10 max-w-2xl transition-colors duration-300",
              isDark ? "text-white/70" : "text-gray-600"
            )}
          >
            <p>브라우저에서 바로 시작하세요.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-4 flex-wrap justify-center"
          >
            <motion.span
              role="button"
              tabIndex={0}
              onClick={openSignupModal}
              onKeyDown={(e) => e.key === "Enter" && openSignupModal()}
              className={cn(
                "inline-flex items-center justify-center font-bold text-lg px-8 py-4 rounded-2xl cursor-pointer transition-all duration-300",
                "backdrop-blur-xl border",
                "hover:scale-[1.02] active:scale-[0.98]",
                isDark
                  ? "bg-white/[0.12] text-white border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.18] hover:shadow-[0_12px_40px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "bg-white/80 text-gray-900 border-white/60 shadow-[0_8px_32px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white hover:shadow-[0_12px_40px_rgba(139,92,246,0.18),inset_0_1px_0_rgba(255,255,255,1)]"
              )}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              지금 바로 시작하기
            </motion.span>
            <Link href="/#solution">
              <motion.span
                className={cn(
                  "inline-flex items-center gap-2 border font-semibold px-6 py-4 rounded-2xl transition-all backdrop-blur-sm cursor-pointer",
                  isDark
                    ? "border-white/20 text-white/80 hover:border-white/40 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>데모 보기</span>
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 20 20"
                  stroke="currentColor"
                  strokeOpacity="0.8"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.16667 10H15.8333" />
                  <path d={svgPaths.p1ae0b780} />
                </svg>
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </section>

      <SocialProofBand />

      {/* Problem Section */}
      <section className="relative min-h-screen flex items-center justify-center py-24 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 z-0"
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1682506457554-b34c9682e985?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wbGV4JTIwdmlkZW8lMjBlZGl0aW5nJTIwdGltZWxpbmUlMjBkYXJrJTIwbWVzc3l8ZW58MXx8fHwxNzY5OTQyNDI3fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="복잡한 편집 타임라인"
            className="w-full h-full object-cover"
          />
          <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 text-center px-6"
        >
          <h2 className="text-[40px] sm:text-[52px] md:text-[60px] font-bold leading-tight mb-8">
            복잡한 방송 설정,
            <br />
            따로따로 쓰는 툴에 지치지 않으셨나요?
          </h2>
          <p
            className={cn(
              "text-lg sm:text-[24px] leading-relaxed max-w-2xl mx-auto",
              isDark ? "text-white/60" : "text-gray-600"
            )}
          >
            원테이크는 씬·소스·송출·녹화를 하나의 스튜디오에서.
            <br />
            YouTube 연동만 하면 바로 Go Live입니다.
          </p>
        </motion.div>
      </section>

      <TimelineScanAnimation />

      {/* Features Grid */}
      <section
        className={cn(
          "py-24 px-6 transition-colors duration-300",
          isDark ? "bg-[#121212]" : "bg-white"
        )}
        id="features"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="inline-block bg-purple-500/10 border border-purple-500/30 rounded-full px-6 py-2 mb-8"
            >
              <span className="text-purple-500 font-semibold text-sm">
                핵심 기능
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="text-[40px] sm:text-[48px] font-bold leading-tight mb-6"
            >
              원테이크가 특별한 이유
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "text-lg",
                isDark ? "text-white/60" : "text-gray-600"
              )}
            >
              지금 원테이크에서 제공하는 기능입니다.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassmorphicFeatureCard
              index={0}
              gradient="linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(0, 184, 219) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p1c4d0dc0}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={svgPaths.p4207a00}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="YouTube 라이브 송출"
              description="RTMP로 YouTube에 바로 송출. Go Live 한 번이면 라이브 시작."
            />

            <GlassmorphicFeatureCard
              index={1}
              gradient="linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p25c6480}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={svgPaths.p1fc92080}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 19V22"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="로컬·서버 녹화"
              description="브라우저 녹화로 다운로드 또는 서버 녹화로 저장. 클릭 한 번으로 시작."
            />

            <GlassmorphicFeatureCard
              index={2}
              gradient="linear-gradient(135deg, rgb(255, 105, 0) 0%, rgb(251, 44, 54) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p1d820380}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={svgPaths.p161d4800}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={svgPaths.p2981fe00}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={svgPaths.p13e20900}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="씬·소스·레이아웃"
              description="웹캠, 마이크, 씬별 레이아웃(풀뷰, 스플릿 등)을 자유롭게 구성."
            />

            <GlassmorphicFeatureCard
              index={3}
              gradient="linear-gradient(135deg, rgb(0, 201, 80) 0%, rgb(0, 188, 125) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p36c5af80}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 17V9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 17V5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 17V14"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="YouTube 채널 연동"
              description="RTMP URL·스트림 키만 등록하면 바로 송출 준비 완료."
            />

            <GlassmorphicFeatureCard
              index={4}
              gradient="linear-gradient(135deg, rgb(255, 193, 7) 0%, rgb(255, 152, 0) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p1a880700}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="해상도·오디오"
              description="720p/1080p 전환, 오디오 레벨 시각화로 방송 품질을 확인."
            />

            <GlassmorphicFeatureCard
              index={5}
              gradient="linear-gradient(135deg, rgb(156, 39, 176) 0%, rgb(233, 30, 99) 100%)"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <path
                    d={svgPaths.p398e8a80}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="18"
                    cy="5"
                    r="3"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="녹화·라이브러리"
              description="녹화 목록 확인과 다운로드. (클라우드 업로드는 준비 중)"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="guide" className="relative py-24 px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="max-w-4xl mx-auto relative"
        >
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-12 text-center">
            <h2 className="text-[36px] sm:text-[48px] font-bold mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-8">
              YouTube 채널 연동 후, 씬·소스만 꾸미면 Go Live 한 번이면 됩니다.
            </p>
            <motion.span
              role="button"
              tabIndex={0}
              onClick={openSignupModal}
              onKeyDown={(e) => e.key === "Enter" && openSignupModal()}
              className="inline-block bg-white text-purple-600 font-bold text-lg px-10 py-4 rounded-2xl shadow-2xl hover:shadow-[0_20px_50px_rgba(255,255,255,0.3)] transition-all cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              무료로 시작하기
            </motion.span>
          </div>
        </motion.div>
      </section>

      {/* Contact 앵커용 빈 섹션 (푸터는 레이아웃에서 렌더) */}
      <div id="contact" className="h-0" aria-hidden />
    </div>
  );
}
