"use client";

import { VideoDetailViewer } from "@/widgets/library/video-detail/video-detail-viewer";
import { useParams } from "next/navigation";

export default function LibraryDetailPage() {
  const params = useParams();
  const videoId = params.id as string;

  return <VideoDetailViewer videoId={videoId} />;
}
