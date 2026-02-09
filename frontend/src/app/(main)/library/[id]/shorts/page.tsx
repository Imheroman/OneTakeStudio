"use client";

import Link from "next/link";
import { ShortsConfigurator } from "@/widgets/shorts/shorts-configurator";
import { useParams } from "next/navigation";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

export default function ShortsCreatePage() {
  const params = useParams();
  const videoId = params.id as string;
  const isDark = useResolvedTheme() === "dark";

  return (
    <div
      className={`p-6 overflow-y-auto flex flex-col items-center ${
        isDark ? "bg-[#0c0c0f]" : "bg-[#f4f4f8]"
      }`}
    >
      <div className="w-full max-w-6xl mx-auto">
        <Link
          href={`/library/${videoId}`}
          className={`inline-flex items-center gap-2 text-sm font-semibold mb-4 px-3 py-2 rounded-lg border shadow-sm ${
            isDark
              ? "text-white/80 hover:text-white bg-white/5 border-white/10 hover:bg-white/10"
              : "text-gray-700 hover:text-gray-900 bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span>←</span> Back
        </Link>

        <ShortsConfigurator videoId={videoId} />
      </div>
    </div>
  );
}
