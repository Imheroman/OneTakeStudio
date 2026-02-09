import type { NextConfig } from "next";
import path from "path";

const CORE_URL = process.env.CORE_SERVICE_URL || "http://localhost:8080";
const MEDIA_URL = process.env.MEDIA_SERVICE_URL || "http://localhost:8082";

const nextConfig: NextConfig = {
  // 프론트엔드만의 루트로 지정해 루트 package-lock.json과의 lockfile 경고 제거
  turbopack: {
    root: path.join(__dirname),
  },

  // 로컬 개발: API Gateway/Eureka 없이 백엔드 직접 프록시
  async rewrites() {
    return [
      // Media Service — /api/v1/media/** → media:8082/api/media/**
      {
        source: "/api/v1/media/:path*",
        destination: `${MEDIA_URL}/api/media/:path*`,
      },
      // Media Service — 직접 경로
      { source: "/api/media/:path*", destination: `${MEDIA_URL}/api/media/:path*` },
      { source: "/api/shorts/:path*", destination: `${MEDIA_URL}/api/shorts/:path*` },
      { source: "/api/oauth/:path*", destination: `${MEDIA_URL}/api/oauth/:path*` },
      { source: "/api/callback/:path*", destination: `${MEDIA_URL}/api/callback/:path*` },
      // Media Service — 별칭 리라이트
      { source: "/api/publish/:path*", destination: `${MEDIA_URL}/api/media/publish/:path*` },
      { source: "/api/streams/:path*", destination: `${MEDIA_URL}/api/media/stream/:path*` },
      { source: "/api/recordings/:path*", destination: `${MEDIA_URL}/api/media/record/:path*` },
      // Core Service — 나머지 전부
      { source: "/api/:path*", destination: `${CORE_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
