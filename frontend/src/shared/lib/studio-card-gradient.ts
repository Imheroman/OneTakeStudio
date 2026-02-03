/**
 * 스튜디오 이름 해시 → 고유 그라데이션 색상 (이미지 없을 때 카드 비주얼용)
 */

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return Math.abs(h);
}

/**
 * 해시값으로 HSL 색상 생성 (채도·명도 고정, 색조만 변화)
 */
function hashToHsl(seed: number, offset: number): { h: number; s: number; l: number } {
  const h = (seed + offset * 137) % 360;
  return { h, s: 52, l: 42 };
}

function hslToCss({ h, s, l }: { h: number; s: number; l: number }): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * 스튜디오 제목으로 고유한 그라데이션 CSS 값 반환
 * @returns linear-gradient(...) 문자열
 */
export function getStudioGradientFromTitle(title: string): string {
  const seed = hashString(title || "studio");
  const c1 = hashToHsl(seed, 0);
  const c2 = hashToHsl(seed, 1);
  return `linear-gradient(135deg, ${hslToCss(c1)} 0%, ${hslToCss(c2)} 100%)`;
}
