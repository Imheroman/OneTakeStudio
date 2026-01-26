/**
 * Canvas Preview 테스트 유틸리티
 * 개발 환경에서 프리뷰 기능을 테스트하기 위한 헬퍼 함수
 */

import type { Source } from "@/entities/studio/model";

/**
 * 테스트용 이미지 소스 생성
 */
export function createTestImageSource(
  id: string,
  name: string,
  imageUrl: string,
): { source: Source; element: HTMLImageElement } {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;

  const source: Source = {
    id,
    type: "image",
    name,
    isVisible: true,
  };

  return { source, element: img };
}

/**
 * 테스트용 비디오 소스 생성 (웹캠)
 */
export async function createTestVideoSource(
  id: string,
  name: string,
): Promise<{ source: Source; element: HTMLVideoElement; stream: MediaStream } | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    video.play();

    const source: Source = {
      id,
      type: "video",
      name,
      isVisible: true,
    };

    return { source, element: video, stream };
  } catch (error) {
    console.error("웹캠 접근 실패:", error);
    return null;
  }
}

/**
 * 테스트용 텍스트 소스 생성
 */
export function createTestTextSource(id: string, name: string): Source {
  return {
    id,
    type: "text",
    name,
    isVisible: true,
  };
}

/**
 * 샘플 이미지 URL 목록 (테스트용)
 */
export const SAMPLE_IMAGE_URLS = [
  "https://picsum.photos/800/600?random=1",
  "https://picsum.photos/800/600?random=2",
  "https://picsum.photos/800/600?random=3",
  "https://picsum.photos/800/600?random=4",
];

/**
 * 테스트용 소스 세트 생성
 */
export function createTestSourceSet(): Source[] {
  return [
    {
      id: "test_image_1",
      type: "image",
      name: "테스트 이미지 1",
      isVisible: true,
    },
    {
      id: "test_text_1",
      type: "text",
      name: "테스트 텍스트",
      isVisible: true,
    },
    {
      id: "test_audio_1",
      type: "audio",
      name: "테스트 오디오",
      isVisible: true,
    },
  ];
}
