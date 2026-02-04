/** 사이드바(워크스페이스·스튜디오) 공통: 반응 빠름 + 튕김 억제 + 무게감 */
export const sidebarSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 40,
  mass: 1,
};

/** 저사양/모션 축소 시 사용 */
export const sidebarEaseReduced = {
  duration: 0.08,
  ease: [0.4, 0, 0.2, 1] as const,
};
