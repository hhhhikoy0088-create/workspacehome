"use client";

import { useEffect } from "react";

// Clicking anywhere on the intro jumps straight to the target screen; real drags
// (the first screen is pointer-scrubbed) and interactive controls are ignored.
const DRAG_THRESHOLD_PX = 8;
const MAX_CLICK_DURATION_MS = 700;
const IGNORED_SELECTOR = "a, button, input, textarea, select, label, [data-click-advance='ignore']";

export function ClickToAdvance({ targetSelector }: { targetSelector: string }) {
  useEffect(() => {
    let downX = 0;
    let downY = 0;
    let downAt = 0;
    let tracked = false;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        tracked = false;
        return;
      }
      downX = event.clientX;
      downY = event.clientY;
      downAt = performance.now();
      tracked = true;
    };

    const handleClick = (event: MouseEvent) => {
      if (!tracked) return;
      tracked = false;

      if (Math.hypot(event.clientX - downX, event.clientY - downY) > DRAG_THRESHOLD_PX) return;
      if (performance.now() - downAt > MAX_CLICK_DURATION_MS) return;

      const origin = event.target;
      if (origin instanceof Element && origin.closest(IGNORED_SELECTOR)) return;

      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) return;

      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY });
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("click", handleClick);
    };
  }, [targetSelector]);

  return null;
}
