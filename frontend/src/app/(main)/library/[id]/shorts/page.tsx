"use client";

import { ShortsConfigurator } from "@/widgets/shorts/shorts-configurator";
import { useParams, useRouter } from "next/navigation";

export default function ShortsCreatePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  return (
    <div className="p-6 h-[calc(100vh-64px)] bg-[#F8FAFC]">
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-500 mb-6 hover:text-gray-900 transition-colors"
      >
        <span className="mr-2">←</span> Back
      </button>

      <ShortsConfigurator videoId={videoId} />
    </div>
  );
}
