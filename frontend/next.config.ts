import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 프론트엔드만의 루트로 지정해 루트 package-lock.json과의 lockfile 경고 제거
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
