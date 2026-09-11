"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClickToAdvance } from "@/components/intro/ClickToAdvance";
import { PointerScrubHero } from "@/components/intro/PointerScrubHero";
import {
  ScrollScrubVideoSection,
  type ScrollScrubAnimationRanges,
} from "@/components/intro/ScrollScrubVideoSection";

// Screen 3 clears its copy out of the frame before the camera lands on the login screen.
const LOGIN_SECTION_ANIMATIONS: ScrollScrubAnimationRanges = {
  headline: { from: 0.05, to: 0.26, offsetPx: 48, outFrom: 0.74, outTo: 0.9 },
  copy: { from: 0.1, to: 0.32, offsetPx: 0, outFrom: 0.74, outTo: 0.9 },
};

// The clip is authored so that its final frame is the login screen itself, which is why
// finishing the range hands over to the real /auth/login route instead of a mock-up.
const HANDOFF_AT_PROGRESS = 0.999;
// Scrolling back inside the clip cancels a pending handoff and re-arms it later on.
const REARM_AT_PROGRESS = 0.9;
// Matches the dissolve duration of `.intro-root--handoff` in globals.css.
const HANDOFF_FADE_MS = 260;
// Scroll intents that count as a real gesture, as opposed to a restored scroll position.
const SCROLL_INTENT_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
const LOGIN_ROUTE = "/auth/login";

// Module scope on purpose: it survives the client-side back navigation that returns to
// this page, so a restored bottom-of-range scroll cannot bounce straight back to login.
let handoffDone = false;

export function IntroExperience() {
  const router = useRouter();
  const lastProgressRef = useRef(0);
  const handoffTimerRef = useRef<number | null>(null);
  // The handoff is a user action: a restored scroll position (browser back, reload or
  // scroll anchoring) must not trigger it on its own.
  const userIntentRef = useRef(false);
  const [isHandingOff, setIsHandingOff] = useState(false);

  useEffect(() => {
    const markUserIntent = () => {
      userIntentRef.current = true;
    };
    SCROLL_INTENT_EVENTS.forEach((type) =>
      window.addEventListener(type, markUserIntent, { passive: true }),
    );
    return () => {
      SCROLL_INTENT_EVENTS.forEach((type) => window.removeEventListener(type, markUserIntent));
    };
  }, []);

  useEffect(() => () => {
    if (handoffTimerRef.current !== null) window.clearTimeout(handoffTimerRef.current);
  }, []);

  const handleFocusProgress = useCallback(
    (progress: number) => {
      const lastProgress = lastProgressRef.current;
      lastProgressRef.current = progress;

      // Scrolling back out of the handoff point undoes it, so the intro stays replayable.
      if (handoffTimerRef.current !== null && progress < HANDOFF_AT_PROGRESS) {
        window.clearTimeout(handoffTimerRef.current);
        handoffTimerRef.current = null;
        handoffDone = false;
        setIsHandingOff(false);
        return;
      }

      // Once the range is done the dissolve runs, then the real login route takes over.
      if (progress >= HANDOFF_AT_PROGRESS) {
        if (handoffDone || !userIntentRef.current) return;
        handoffDone = true;
        setIsHandingOff(true);
        handoffTimerRef.current = window.setTimeout(() => {
          handoffTimerRef.current = null;
          router.push(LOGIN_ROUTE);
        }, HANDOFF_FADE_MS);
        return;
      }

      // Scrolling back up inside the clip re-arms a handoff that already ran.
      if (progress <= REARM_AT_PROGRESS && progress < lastProgress) handoffDone = false;
    },
    [router],
  );

  return (
    <main className={isHandingOff ? "intro-root intro-root--handoff" : "intro-root"}>
      {/* Any click on the page jumps straight to the third screen. */}
      <ClickToAdvance targetSelector=".scroll-video-section--focus" />
      <PointerScrubHero />
      <ScrollScrubVideoSection
        videoSrc="/media/login-scroll.mp4"
        poster="/media/login-scroll-poster.svg"
        label="滚动控制视频章节"
      >
        <p>一切井然有序</p>
        <h2>让工作随着你的节奏展开。</h2>
        <span>继续滚动，观看完整过程。</span>
      </ScrollScrubVideoSection>
      <ScrollScrubVideoSection
        className="scroll-video-section--focus"
        videoSrc="/media/login-focus.mp4"
        poster="/media/login-focus-poster.jpg"
        label="镜头推进登录章节"
        animations={LOGIN_SECTION_ANIMATIONS}
        onProgress={handleFocusProgress}
      >
        <p>WORKSPACE</p>
        <h2>镜头推近，进入你的工作台。</h2>
        <span>继续滚动，直达登录。</span>
      </ScrollScrubVideoSection>
      <div className="intro-root__handoff-wash" aria-hidden="true" />
    </main>
  );
}