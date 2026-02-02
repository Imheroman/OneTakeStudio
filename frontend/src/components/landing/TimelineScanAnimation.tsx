"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";

interface Clip {
  id: number;
  type: "normal" | "ng";
  color: string;
  width: number;
  originalX: number;
  finalX: number;
}

const clips: Clip[] = [
  {
    id: 1,
    type: "normal",
    color: "#3b82f6",
    width: 80,
    originalX: 0,
    finalX: 0,
  },
  {
    id: 2,
    type: "normal",
    color: "#ec4899",
    width: 60,
    originalX: 85,
    finalX: 85,
  },
  { id: 3, type: "ng", color: "#ef4444", width: 40, originalX: 150, finalX: 0 },
  {
    id: 4,
    type: "normal",
    color: "#10b981",
    width: 70,
    originalX: 195,
    finalX: 150,
  },
  {
    id: 5,
    type: "normal",
    color: "#f59e0b",
    width: 55,
    originalX: 270,
    finalX: 225,
  },
  { id: 6, type: "ng", color: "#ef4444", width: 35, originalX: 330, finalX: 0 },
  {
    id: 7,
    type: "normal",
    color: "#8b5cf6",
    width: 65,
    originalX: 370,
    finalX: 285,
  },
  { id: 8, type: "ng", color: "#ef4444", width: 30, originalX: 440, finalX: 0 },
  {
    id: 9,
    type: "normal",
    color: "#06b6d4",
    width: 75,
    originalX: 475,
    finalX: 355,
  },
  {
    id: 10,
    type: "normal",
    color: "#f97316",
    width: 80,
    originalX: 555,
    finalX: 435,
  },
  {
    id: 11,
    type: "normal",
    color: "#a855f7",
    width: 60,
    originalX: 640,
    finalX: 520,
  },
  {
    id: 12,
    type: "ng",
    color: "#ef4444",
    width: 45,
    originalX: 705,
    finalX: 0,
  },
  {
    id: 13,
    type: "normal",
    color: "#14b8a6",
    width: 70,
    originalX: 755,
    finalX: 585,
  },
  {
    id: 14,
    type: "normal",
    color: "#f43f5e",
    width: 65,
    originalX: 830,
    finalX: 660,
  },
];

const TIMELINE_WIDTH_PX = 900;
/** 애니메이션이 100%가 되는 데 필요한 스크롤 거리 (vh) */
const PROGRESS_FULL_VH = 350;
/** 완료 화면 이후 더 스크롤해야 넘어가는 구간 (vh) */
const END_BUFFER_VH = 250;
/** 섹션 전체 높이 = 애니메이션 구간 + 완료 후 버퍼 */
const SECTION_HEIGHT_VH = PROGRESS_FULL_VH + END_BUFFER_VH;

export function TimelineScanAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [hasReachedSection, setHasReachedSection] = useState(false);
  const [hasLeftSection, setHasLeftSection] = useState(false);

  // 스크롤 위치로 progress·도달·이탈 한 번에 계산 (progress는 350vh에서 100%, 섹션은 450vh로 끝나서 100vh 더 스크롤 필요)
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const progressFullPx = (PROGRESS_FULL_VH / 100) * vh;

      setHasReachedSection(rect.top <= 0);
      setHasLeftSection(rect.bottom <= vh);

      if (rect.top > 0) {
        setProgress(0);
        return;
      }
      const scrolledIntoSection = -rect.top;
      const p = Math.min(1, scrolledIntoSection / progressFullPx);
      setProgress(p * 100);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const laserProgress = Math.min(progress / 40, 1) * 100;
  const isScanningPhase = progress <= 40;
  const isMagnetPhase = progress > 40 && progress <= 70;
  const isZoomPhase = progress > 70;

  const getNGFloatingState = (clipCenterX: number) => {
    const scanPositionInPx = (laserProgress / 100) * TIMELINE_WIDTH_PX;
    const hasBeenScanned = scanPositionInPx > clipCenterX;

    if (!hasBeenScanned) return { isFloating: false, floatProgress: 0 };

    const timeSinceScan = scanPositionInPx - clipCenterX;
    const floatProgress = Math.min(timeSinceScan / 200, 1);

    return { isFloating: true, floatProgress };
  };

  // 섹션에 도달한 뒤 고정. 섹션을 벗어날 때까지 유지 (완료 후 100vh 더 스크롤해야 해제)
  const isPinned = hasReachedSection && !hasLeftSection;

  return (
    <section
      id="solution"
      ref={containerRef}
      className="relative bg-black"
      style={{ height: `${SECTION_HEIGHT_VH}vh` }}
    >
      {/* 도달 전: 문서 흐름(원래 위치). 도달 후: fixed로 고정. 끝나면: absolute로 스크롤 아웃 */}
      <div
        className="flex flex-col items-center justify-center overflow-hidden bg-black z-10"
        style={{
          position: hasReachedSection
            ? isPinned
              ? "fixed"
              : "absolute"
            : "relative",
          top: hasReachedSection && isPinned ? 0 : undefined,
          bottom: hasReachedSection && !isPinned ? 0 : undefined,
          left: hasReachedSection ? 0 : undefined,
          right: hasReachedSection ? 0 : undefined,
          height: "100vh",
          minHeight: "100vh",
        }}
      >
        {/* 헤딩 - 초기에만 표시 */}
        {progress < 60 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1 - progress / 60, y: 0 }}
            className="absolute top-20 text-center z-20 px-6"
          >
            <h2 className="text-[40px] sm:text-[52px] md:text-[60px] font-bold text-white leading-tight mb-6">
              클릭 한 번이면
              <br />
              NG 장면이 사라져요.
            </h2>
            <p className="text-lg sm:text-[24px] text-white/60 leading-relaxed">
              AI가 음성과 댓글 밀집도를 분석해 침묵을 없애고, 알차고 재밌게.
            </p>
            <p className="text-lg sm:text-[24px] text-white/60 leading-relaxed mt-2">
              3개의 쇼츠를 만들어 드려요.
            </p>
          </motion.div>
        )}

        {/* 타임라인 컨테이너 */}
        <motion.div
          className="relative w-full h-24 flex items-center justify-center"
          style={{
            scale: isZoomPhase ? 1 + ((progress - 70) / 30) * 0.5 : 1,
            opacity: isZoomPhase ? 1 - (progress - 70) / 30 : 1,
          }}
        >
          {!isZoomPhase && (
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 opacity-30" />
          )}

          {/* 타임라인 트랙 배경 (900px와 정렬) */}
          <div
            className="absolute top-1/2 left-1/2 h-20 -translate-x-1/2 -translate-y-1/2"
            style={{ width: TIMELINE_WIDTH_PX }}
          >
            <div className="w-full h-full bg-gray-900/50 border-t border-b border-gray-700/30 rounded" />
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 h-2 w-px bg-gray-600/30"
                style={{ left: `${(i / 19) * 100}%` }}
              />
            ))}
          </div>

          {/* 타임라인 클립들 */}
          <div
            className="absolute top-1/2 left-1/2 h-20 -translate-x-1/2 -translate-y-1/2"
            style={{ width: TIMELINE_WIDTH_PX }}
          >
            {clips.map((clip) => {
              const clipCenterX = clip.originalX + clip.width / 2;
              const isNG = clip.type === "ng";
              const { isFloating, floatProgress } =
                getNGFloatingState(clipCenterX);
              const shouldFloat = isNG && isFloating && isScanningPhase;
              const shouldHide = isNG && (isMagnetPhase || isZoomPhase);
              const targetX =
                isMagnetPhase || isZoomPhase ? clip.finalX : clip.originalX;

              if (shouldHide) return null;

              return (
                <motion.div
                  key={clip.id}
                  className="absolute top-1/2 -translate-y-1/2"
                  initial={{ left: clip.originalX }}
                  animate={{
                    left: targetX,
                    y: shouldFloat ? -100 * floatProgress : 0,
                    x: isMagnetPhase && !isNG ? [0, -5, 0, 5, 0] : 0,
                  }}
                  transition={{
                    duration: shouldFloat ? 1.2 : isMagnetPhase ? 0.6 : 0.3,
                    delay: shouldFloat ? 0 : clip.id * 0.05,
                    ease: shouldFloat ? "easeOut" : "easeInOut",
                  }}
                >
                  <motion.div
                    className="relative rounded-sm overflow-hidden"
                    style={{
                      width: clip.width,
                      height: 60,
                      backgroundColor: clip.color,
                      filter: shouldFloat ? "grayscale(100%)" : "grayscale(0%)",
                      opacity: shouldFloat ? (1 - floatProgress) * 0.5 : 1,
                      boxShadow: `0 0 10px ${clip.color}40`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    {isNG && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">NG</span>
                      </div>
                    )}
                    <div className="absolute inset-1 grid grid-cols-3 gap-0.5 opacity-40">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white/10 rounded-sm" />
                      ))}
                    </div>
                  </motion.div>

                  {isMagnetPhase && !isNG && clip.id > 1 && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                      transition={{ duration: 0.5, delay: clip.id * 0.05, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-purple-400 rounded-full"
                          style={{ left: 0, top: 0 }}
                          animate={{
                            x: Math.cos((i / 8) * Math.PI * 2) * 15,
                            y: Math.sin((i / 8) * Math.PI * 2) * 15,
                            opacity: [1, 0],
                          }}
                          transition={{
                            duration: 0.4,
                            delay: clip.id * 0.05 + i * 0.02,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 레이저 스캔 빔 */}
          {isScanningPhase && (
            <motion.div
              className="absolute top-0 bottom-0 z-10 pointer-events-none -translate-x-px"
              style={{
                left: `calc(50% - ${TIMELINE_WIDTH_PX / 2}px + ${
                  (laserProgress / 100) * TIMELINE_WIDTH_PX
                }px)`,
                width: 2,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, rgba(168, 85, 247, 1) 30%, rgba(168, 85, 247, 1) 70%, transparent)",
                  boxShadow: `
                    0 0 40px rgba(168, 85, 247, 1),
                    0 0 80px rgba(168, 85, 247, 0.6),
                    0 0 120px rgba(168, 85, 247, 0.4)
                  `,
                  filter: "blur(3px)",
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-screen"
                style={{
                  background:
                    "radial-gradient(ellipse, rgba(168, 85, 247, 0.3), transparent 60%)",
                  filter: "blur(30px)",
                }}
              />
              <div
                className="absolute inset-0 -left-20 w-40"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(168, 85, 247, 0.2) 50%, transparent)",
                  filter: "blur(20px)",
                }}
              />
            </motion.div>
          )}
        </motion.div>

        {/* SNS 쇼츠 목업 (줌인 완료 후) */}
        {isZoomPhase && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: (progress - 70) / 30,
              scale: 0.8 + ((progress - 70) / 30) * 0.2,
            }}
          >
            <div className="relative">
              {/* 휴대폰 목업 (placeholder - 실제 이미지로 교체 가능) */}
              <div
                className="w-[280px] sm:w-[320px] h-[560px] sm:h-[640px] rounded-[2.5rem] border-[10px] border-gray-800 bg-black overflow-hidden shadow-2xl"
                style={{
                  boxShadow: "0 40px 80px rgba(168, 85, 247, 0.4)",
                }}
              >
                <div className="w-full h-full bg-gradient-to-b from-purple-900/30 to-black flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="text-purple-300 font-bold text-xl mb-2">
                      ✨ 편집 완료
                    </p>
                    <p className="text-white/70 text-sm">
                      알차고 재밌는 3개의 쇼츠가 준비되었습니다
                    </p>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: progress > 85 ? 1 : 0,
                  y: progress > 85 ? 0 : 20,
                }}
                className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
              >
                <p className="text-purple-400 font-bold text-2xl mb-2">
                  ✨ 완료!
                </p>
                <p className="text-white/60 text-lg">
                  음성·댓글 분석으로 만든 3개의 쇼츠가 준비되었습니다
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 프로그레스 인디케이터 */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white/60 text-sm font-medium">
              {isScanningPhase && "단계 1-2: AI 스캔 및 NG 제거 중..."}
              {isMagnetPhase && "단계 3: 자동 정리 및 병합 중..."}
              {isZoomPhase && "단계 4: 결과물 생성 완료!"}
            </div>
            <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-white/40 text-xs">{Math.round(progress)}%</div>
          </div>
        </div>

        {/* 스크롤 안내 */}
        {progress < 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 text-white/40 text-sm flex flex-col items-center gap-2"
          >
            <span>스크롤을 내려 AI 편집 과정을 확인하세요</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            >
              ↓
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
