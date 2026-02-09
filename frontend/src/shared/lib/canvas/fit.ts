/**
 * 소스 박스 정책(Letterboxing & Pillarboxing) 계산
 * contain: 비율 유지, 여백(검은 막대) 허용
 * cover: 빈 공간 없이 채우기, 넘치는 부분 자름
 */

export type SourceFitMode = "contain" | "cover";

export interface FitDrawRect {
  /** Konva Image 내부 기준 그리기 위치 X */
  drawX: number;
  /** Konva Image 내부 기준 그리기 위치 Y */
  drawY: number;
  /** 그리기 너비 */
  drawWidth: number;
  /** 그리기 높이 */
  drawHeight: number;
  /** cover일 때만 사용. 소스 이미지/비디오 픽셀 기준 crop 영역 */
  crop?: { x: number; y: number; width: number; height: number };
}

/**
 * 박스 정책에 따라 Konva Image에 그릴 사각형과(선택) crop 영역 계산
 * @param fit "contain" | "cover"
 * @param boxWidth 셀(박스) 너비 (논리 좌표)
 * @param boxHeight 셀(박스) 높이
 * @param sourceWidth 소스 원본 너비 (videoWidth / naturalWidth)
 * @param sourceHeight 소스 원본 높이
 */
export function computeSourceFitRect(
  fit: SourceFitMode,
  boxWidth: number,
  boxHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): FitDrawRect {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      drawX: 0,
      drawY: 0,
      drawWidth: boxWidth,
      drawHeight: boxHeight,
    };
  }

  if (fit === "contain") {
    const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    return {
      drawX: (boxWidth - drawWidth) / 2,
      drawY: (boxHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    };
  }

  // cover: 박스를 채우도록 확대, 넘치는 부분은 crop
  const boxAspect = boxWidth / boxHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  let cropX: number;
  let cropY: number;
  let cropWidth: number;
  let cropHeight: number;

  if (sourceAspect > boxAspect) {
    cropHeight = sourceHeight;
    cropWidth = sourceHeight * boxAspect;
    cropX = (sourceWidth - cropWidth) / 2;
    cropY = 0;
  } else {
    cropWidth = sourceWidth;
    cropHeight = sourceWidth / boxAspect;
    cropX = 0;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  return {
    drawX: 0,
    drawY: 0,
    drawWidth: boxWidth,
    drawHeight: boxHeight,
    crop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
  };
}
