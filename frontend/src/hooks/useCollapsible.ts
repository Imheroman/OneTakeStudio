"use client";

import { useState, useCallback } from "react";

export interface UseCollapsibleReturn {
  /** Radix Collapsible open state */
  open: boolean;
  /** Radix Collapsible onOpenChange */
  onOpenChange: (open: boolean) => void;
  /** 라벨(텍스트) 표시 여부. open과 동기화 (onAnimationComplete 제거로 이벤트 지연 회피) */
  shouldShowText: boolean;
}

/**
 * 사이드바 등 Collapsible + 라벨 표시 상태 관리.
 * shouldShowText는 open과 동기화 (애니메이션 완료 이벤트는 사용하지 않음).
 */
export function useCollapsible(initialOpen = false): UseCollapsibleReturn {
  const [open, setOpen] = useState(initialOpen);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  const shouldShowText = open;

  return {
    open,
    onOpenChange,
    shouldShowText,
  };
}
