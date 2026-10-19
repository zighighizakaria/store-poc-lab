"use client";

import { useCallback, useRef, useState } from "react";

// Index + programmatic scrolling for a horizontal scroll-snap container whose
// slides are one container-width wide. Works in LTR and RTL (scrollLeft is
// negative in RTL browsers), so no direction-specific code is needed outside.
export function useSnapCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }, []);

  const goTo = useCallback((target: number) => {
    const el = ref.current;
    if (!el) return;
    const sign = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: sign * target * el.clientWidth,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return { ref, index, onScroll, goTo };
}
