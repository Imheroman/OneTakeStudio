"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

const LOGO_SRC = "/logo_01.svg";
const LOGO_DARK_SRC = "/logo_01_dark.svg";

interface LogoProps {
  /** 링크 URL (없으면 링크 없이 img만) */
  href?: string;
  /** 어두운 배경용 (흰색으로 보이도록 invert) */
  dark?: boolean;
  /** 크기: sm | md | lg */
  size?: "sm" | "md" | "lg";
  /** 로고 옆 OneTake 텍스트 표시 (sm일 때는 기본 숨김) */
  showText?: boolean;
  className?: string;
  /** 이미지 alt */
  alt?: string;
}

const sizeMap = {
  sm: { width: 24, height: 24, textClass: "text-base font-bold" },
  md: { width: 34, height: 34, textClass: "text-lg font-bold" },
  lg: { width: 44, height: 44, textClass: "text-xl font-bold" },
};

export function Logo({
  href,
  dark = false,
  size = "md",
  showText = true,
  className,
  alt = "원테이크",
}: LogoProps) {
  const { width, height, textClass } = sizeMap[size];
  const showLabel = showText && size !== "sm";

  const content = (
    <>
      <Image
        src={dark ? LOGO_DARK_SRC : LOGO_SRC}
        alt={alt}
        width={width}
        height={height}
        className="shrink-0 object-contain"
        priority
      />
      {showLabel && (
        <span
          className={cn(
            "font-black tracking-tighter whitespace-nowrap",
            textClass
          )}
        >
          <span className={dark ? "text-white" : "text-[#6366f1]"}>원</span>
          <span className={dark ? "text-white" : "text-black"}>테이크</span>
        </span>
      )}
    </>
  );

  const wrapperClass = "inline-flex items-center gap-0.5";

  if (href) {
    return (
      <Link href={href} className={cn(wrapperClass, className)}>
        {content}
      </Link>
    );
  }
  return <span className={cn(wrapperClass, className)}>{content}</span>;
}
