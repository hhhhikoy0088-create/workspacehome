"use client";

import { useEffect, useRef } from "react";

const SEEK_INTERVAL_MS = 1000 / 30;
const INITIAL_FRAME_TIME = 0.02;
const SEEK_EPSILON_SECONDS = 1 / 120;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isSeekableDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0;
}

export function PointerScrubHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let isInViewport = false;
    let isPointerActive = false;
    let activePointerId: number | null = null;
    let isSeeking = false;
    let targetTime = INITIAL_FRAME_TIME;
    let rafId: number | null = null;
    let retryTimer: number | null = null;
    let lastSeekAt = 0;

    const clearScheduledWork = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleSeek = () => {
      if (!isInViewport || rafId !== null) return;
      rafId = requestAnimationFrame(flushSeek);
    };

    const queueRetry = (delay: number) => {
      if (!isInViewport || retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        scheduleSeek();
      }, delay);
    };

    const flushSeek = () => {
      rafId = null;
      if (!isInViewport || !isSeekableDuration(video.duration)) return;

      const now = performance.now();
      const elapsed = now - lastSeekAt;
      if (elapsed < SEEK_INTERVAL_MS) {
        queueRetry(SEEK_INTERVAL_MS - elapsed);
        return;
      }

      if (isSeeking || video.seeking) {
        queueRetry(SEEK_INTERVAL_MS);
        return;
      }

      const safeTarget = clamp(targetTime, 0, video.duration);
      if (Math.abs(video.currentTime - safeTarget) < SEEK_EPSILON_SECONDS) return;

      lastSeekAt = now;
      video.currentTime = safeTarget;
    };

    const updateTargetFromClientX = (clientX: number) => {
      if (!isInViewport || !isSeekableDuration(video.duration)) return;

      const rect = section.getBoundingClientRect();
      if (rect.width <= 0) return;

      // The clip is authored so that playing it forward pushes the subject to the
      // left, so the pointer position is mirrored to keep the motion following it.
      const progress = clamp((rect.right - clientX) / rect.width, 0, 1);
      targetTime = progress * video.duration;
      scheduleSeek();
    };

    const stopPointerInteraction = (event?: PointerEvent) => {
      if (event && activePointerId !== event.pointerId) return;
      if (activePointerId !== null && section.hasPointerCapture(activePointerId)) {
        section.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
      isPointerActive = false;
    };

    const handleLoadedMetadata = () => {
      if (!isSeekableDuration(video.duration)) return;
      targetTime = Math.min(INITIAL_FRAME_TIME, video.duration);
      video.pause();
      video.currentTime = targetTime;
    };

    const handleSeeking = () => {
      isSeeking = true;
    };

    const handleSeeked = () => {
      isSeeking = false;
      if (isInViewport && Math.abs(video.currentTime - targetTime) >= SEEK_EPSILON_SECONDS) {
        scheduleSeek();
      }
    };

    const handlePointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && isInViewport) updateTargetFromClientX(event.clientX);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isInViewport) return;
      activePointerId = event.pointerId;
      isPointerActive = true;
      section.setPointerCapture(event.pointerId);
      updateTargetFromClientX(event.clientX);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isInViewport) return;
      const isMouseHover = event.pointerType === "mouse" && activePointerId === null;
      const isActivePointer = activePointerId === event.pointerId && isPointerActive;
      if (isMouseHover || isActivePointer) updateTargetFromClientX(event.clientX);
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (activePointerId === null) stopPointerInteraction(event);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      stopPointerInteraction(event);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPointerInteraction();
        clearScheduledWork();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting;
        if (!isInViewport) {
          stopPointerInteraction();
          clearScheduledWork();
        }
      },
      { threshold: [0, 1] },
    );

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    section.addEventListener("pointerenter", handlePointerEnter);
    section.addEventListener("pointerdown", handlePointerDown);
    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", handlePointerLeave);
    section.addEventListener("pointerup", handlePointerEnd);
    section.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    observer.observe(section);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) handleLoadedMetadata();

    return () => {
      clearScheduledWork();
      stopPointerInteraction();
      observer.disconnect();
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      section.removeEventListener("pointerenter", handlePointerEnter);
      section.removeEventListener("pointerdown", handlePointerDown);
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", handlePointerLeave);
      section.removeEventListener("pointerup", handlePointerEnd);
      section.removeEventListener("pointercancel", handlePointerEnd);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section ref={sectionRef} className="scrub-hero" aria-label="登录页面视频首屏">
      <video
        ref={videoRef}
        className="scrub-hero__video"
        muted
        playsInline
        preload="auto"
        poster="/media/login-hero-poster.svg"
        aria-hidden="true"
      >
        <source src="/media/login-hero.mp4" type="video/mp4" />
      </video>
      <div className="scrub-hero__scrim" />
      <div className="scrub-hero__content">
        <p className="scrub-hero__eyebrow">WORKSPACE</p>
        <h1>从这一刻开始，回到你的工作节奏。</h1>
        <p>左右移动或拖动，即可探索这一段画面。</p>
      </div>
      <div className="scrub-hero__hint" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
