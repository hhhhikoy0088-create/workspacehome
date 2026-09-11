"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/components/auth-provider";
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
const DASHBOARD_ROUTE = "/dashboard";
const FOCUS_SECTION_SELECTOR = ".scroll-video-section--focus";

// Module scope on purpose: these survive the client-side navigation that leaves and comes
// back to this page, which is what keeps a restored scroll position from being misread.
// `handoffDone` stops the restored end-of-range scroll from bouncing back to login.
let handoffDone = false;
// The 2 -> 3 click gate stays open for the rest of the visit, so returning from the login
// page restores screen 3 exactly where it was instead of re-locking to screen 2.
let focusScreenUnlocked = false;

export function IntroExperience() {
  const router = useRouter();
  const { isLogin, loading } = useAuthStore();
  const lastProgressRef = useRef(0);
  const handoffTimerRef = useRef<number | null>(null);
  // The handoff is a user action: a restored scroll position (browser back, reload or
  // scroll anchoring) must not trigger it on its own.
  const userIntentRef = useRef(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  // Screen 2 -> screen 3 is a click, not a scroll: the third screen only joins the scroll
  // flow once this gate opens, so scrolling cannot carry the visitor into it.
  const [isFocusUnlocked, setIsFocusUnlocked] = useState(focusScreenUnlocked);
  const openedGateRef = useRef(focusScreenUnlocked);

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

  // A signed-in visitor never sees the intro: it is only an entry experience.
  useEffect(() => {
    if (!loading && isLogin) router.replace(DASHBOARD_ROUTE);
  }, [isLogin, loading, router]);

  // Opening the gate adds the third screen's scroll range, so land on its first frame.
  // A gate that was already open (returning to the page) must not move the scroll: the
  // browser's own scroll restoration is the accurate position there.
  useEffect(() => {
    if (!isFocusUnlocked || openedGateRef.current) return;
    openedGateRef.current = true;
    const frameId = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(FOCUS_SECTION_SELECTOR);
      if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isFocusUnlocked]);

  const goToFocusScreen = useCallback(() => {
    if (!isFocusUnlocked) {
      focusScreenUnlocked = true;
      setIsFocusUnlocked(true);
      return;
    }
    const target = document.querySelector<HTMLElement>(FOCUS_SECTION_SELECTOR);
    if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
  }, [isFocusUnlocked]);

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

  // While the session is being restored nothing is shown, so a signed-in visitor never
  // catches a flash of the intro before the redirect above happens.
  if (loading || isLogin) return <main className="intro-root" aria-hidden="true" />;

  return (
    <main className={isHandingOff ? "intro-root intro-root--handoff" : "intro-root"}>
      {/* Any click on the page opens the third screen and lands on its first frame. */}
      <ClickToAdvance onAdvance={goToFocusScreen} />
      <PointerScrubHero />
      <ScrollScrubVideoSection
        videoSrc="/media/login-scroll.mp4"
        poster="/media/login-scroll-poster.svg"
        label="滚动控制视频章节"
      >
        <p>一切井然有序</p>
        <h2>让工作随着你的节奏展开。</h2>
        <span>滚动到本屏末尾，点击进入下一屏。</span>
      </ScrollScrubVideoSection>
      <div className="intro-root__focus-gate" hidden={!isFocusUnlocked}>
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
      </div>
      <div className="intro-root__handoff-wash" aria-hidden="true" />
    </main>
  );
}