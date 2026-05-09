import { useMemo } from "react";

export interface ScrollState {
  scrollOffset: number;
  visibleStart: number;
  visibleEnd: number;
}

export function useScroll(
  totalItems: number,
  viewportHeight: number,
  focusedIndex: number
): ScrollState {
  return useMemo(() => {
    if (totalItems === 0) {
      return { scrollOffset: 0, visibleStart: 0, visibleEnd: 0 };
    }

    const maxOffset = Math.max(0, totalItems - viewportHeight);
    let scrollOffset = 0;

    // Keep focused item visible with some padding
    const scrollPadding = 2;
    const idealTop = focusedIndex - scrollPadding;
    const idealBottom = focusedIndex + scrollPadding - viewportHeight + 1;

    if (idealTop > 0) {
      scrollOffset = Math.min(idealTop, maxOffset);
    }
    if (idealBottom > scrollOffset) {
      scrollOffset = Math.min(idealBottom, maxOffset);
    }

    const visibleStart = scrollOffset;
    const visibleEnd = Math.min(scrollOffset + viewportHeight, totalItems);

    return { scrollOffset, visibleStart, visibleEnd };
  }, [totalItems, viewportHeight, focusedIndex]);
}
