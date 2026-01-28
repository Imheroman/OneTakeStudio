/**
 * Canvas 렌더링 로직
 * 다양한 소스 타입을 Canvas에 렌더링
 */

import type { SourceRenderContext, SourceType } from "./types";

/**
 * 비디오 소스 렌더링
 */
export function renderVideoSource(ctx: SourceRenderContext): void {
  const { source, ctx: context, x, y, width, height } = ctx;

  // 비디오 엘리먼트가 있는 경우
  if (source.element instanceof HTMLVideoElement) {
    const video = source.element;
    if (video.readyState >= 2) {
      // 비디오가 로드된 경우
      context.drawImage(video, x, y, width, height);
    } else {
      // 로딩 중인 경우
      renderPlaceholder(context, x, y, width, height, "비디오 로딩 중...");
    }
  } else if (source.stream) {
    // MediaStream이 있는 경우 - 실제 구현에서는 비디오 엘리먼트를 재사용해야 함
    renderPlaceholder(context, x, y, width, height, "비디오 스트림");
  } else {
    renderPlaceholder(context, x, y, width, height, "비디오 소스 없음");
  }
}

/**
 * 이미지 소스 렌더링
 */
export function renderImageSource(ctx: SourceRenderContext): void {
  const { source, ctx: context, x, y, width, height } = ctx;

  if (source.element instanceof HTMLImageElement) {
    const img = source.element;
    if (img.complete && img.naturalHeight !== 0) {
      context.drawImage(img, x, y, width, height);
    } else {
      renderPlaceholder(context, x, y, width, height, "이미지 로딩 중...");
    }
  } else {
    renderPlaceholder(context, x, y, width, height, "이미지 소스 없음");
  }
}

/**
 * 텍스트 소스 렌더링
 */
export function renderTextSource(ctx: SourceRenderContext): void {
  const { source, ctx: context, x, y, width, height } = ctx;

  // 배경
  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.fillRect(x, y, width, height);

  // 텍스트
  context.fillStyle = "#ffffff";
  context.font = "24px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    source.source.name || "텍스트",
    x + width / 2,
    y + height / 2,
  );
}

/**
 * 브라우저 소스 렌더링 (캡처)
 */
export function renderBrowserSource(ctx: SourceRenderContext): void {
  const { source, ctx: context, x, y, width, height } = ctx;

  if (source.element instanceof HTMLCanvasElement) {
    context.drawImage(source.element, x, y, width, height);
  } else {
    renderPlaceholder(context, x, y, width, height, "브라우저 소스");
  }
}

/**
 * 오디오 소스 렌더링 (시각화)
 */
export function renderAudioSource(ctx: SourceRenderContext): void {
  const { source, ctx: context, x, y, width, height } = ctx;

  // 오디오 시각화
  context.fillStyle = "rgba(100, 100, 200, 0.5)";
  context.fillRect(x, y, width, height);

  context.fillStyle = "#ffffff";
  context.font = "20px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    source.source.name || "오디오",
    x + width / 2,
    y + height / 2,
  );
}

/**
 * 플레이스홀더 렌더링
 */
function renderPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
): void {
  // 배경
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x, y, width, height);

  // 테두리
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // 텍스트
  ctx.fillStyle = "#666666";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2);
}

/**
 * 소스 타입에 따라 적절한 렌더링 함수 호출
 */
export function renderSourceByType(ctx: SourceRenderContext): void {
  const sourceType = ctx.source.source.type;

  switch (sourceType) {
    case "video":
      renderVideoSource(ctx);
      break;
    case "image":
      renderImageSource(ctx);
      break;
    case "text":
      renderTextSource(ctx);
      break;
    case "browser":
      renderBrowserSource(ctx);
      break;
    case "audio":
      renderAudioSource(ctx);
      break;
    default:
      renderPlaceholder(
        ctx.ctx,
        ctx.x,
        ctx.y,
        ctx.width,
        ctx.height,
        "알 수 없는 소스",
      );
  }
}
