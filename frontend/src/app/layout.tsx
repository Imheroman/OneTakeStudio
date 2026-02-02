import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MSWComponent } from "@/mock/MSWComponent";
import { ApiAuthProvider } from "@/app/providers/ApiAuthProvider";
import "@/styles/globals.css";

// 폰트 설정
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 메타데이터 설정
export const metadata: Metadata = {
  title: "OneTake | 통합 영상 송출 솔루션",
  description: "창작의 시간은 줄이고 가치는 높이는 스트리밍 플랫폼",
  icons: {
    icon: "/logo_01.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApiAuthProvider />
        {/* MSW 활성화 조건문 (환경변수 기반) */}
        {process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && <MSWComponent />}
        {children}
      </body>
    </html>
  );
}
