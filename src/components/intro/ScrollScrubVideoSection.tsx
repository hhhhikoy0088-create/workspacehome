"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// One seek per ~30 FPS: fast enough to track the scroll, gentle enough that the
// decoder is never asked to service a backlog of seeks.
const SEEK_INTERVAL_MS = 1000 / 30;
// Sub-frame differences are treated as "already there" so a frame is never chased twice.
const SEEK_EPSILON_SECONDS = 1 / 120;

export type ScrollScrubAnimationRange = {
  /** Progress at which the element starts entering. */
  from: number;
  /** Progress at which the element has fully entered. */
  to: number;
  /** Entry travel distance in pixels. */
  offsetPx: number;
  /** Optional window used to hand the frame over cleanly at the end of the range. */
  outFrom?: number;
  outTo?: number;
};

export type ScrollScrubAnimationRanges = {
  headline: ScrollScrubAnimationRange;
  copy: ScrollScrubAnimationRange;
};

// Screen 2 defaults: one place per section for every progress-driven animation.
const DEFAULT_ANIMATION_RANGES: ScrollScrubAnimationRanges = {
  headline: { from: 0.04, to: 0.32, offsetPx: 64 },
  copy: { from: 0.12, to: 0.46, offsetPx: 0 },
};

export type ScrollScrubVideoSectionProps = {
  videoSrc: string;
  poster: string;
  label: string;
  className?: string;
  animations?: ScrollScrubAnimationRanges;
  /** Reports the 0-1 scroll progress of the section so callers can chain screens. */
  onProgress?: (progress: number) => void;
  children?: ReactNode;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hasSeekableDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0;
}

function getPhase(progress: number, range: { from: number; to: number }) {
  const span = range.to - range.from;
  if (span <= 0) return progress >= range.to ? 1 : 0;
  return clamp((progress - range.from) / span, 0, 1);
}

function getVisibility(progress: number, range: ScrollScrubAnimationRange) {
  const enter = getPhase(progress, range);
  if (range.outFrom === undefined || range.outTo === undefined) return enter;
  return enter * (1 - getPhase(progress, { from: range.outFrom, to: range.outTo }));
}

export function ScrollScrubVideoSection({
  videoSrc,
  poster,
  label,
  className,
  animations = DEFAULT_ANIMATION_RANGES,
  onProgress,
  children,
}: ScrollScrubVideoSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let disposed = false;
    let frameId: number | null = null;
    let seekTimer: number | null = null;
    let isSeeking = false;
    let lastSeekAt = 0;
    let targetTime = 0;

    const cancelScheduledWork = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      if (seekTimer !== null) {
        window.clearTimeout(seekTimer);
        seekTimer = null;
      }
    };

    // A single layout read, always derived from the real scroll position.
    const readProgress = () => {
      const scrollDistance = section.scrollHeight - window.innerHeight;
      const progress = scrollDistance > 0
        ? clamp(-section.getBoundingClientRect().top / scrollDistance, 0, 1)
        : 0;

      const headline = animations.headline;
      section.style.setProperty("--scroll-progress", progress.toFixed(4));
      section.style.setProperty(
        "--headline-visibility",
        getVisibility(progress, headline).toFixed(4),
      );
      section.style.setProperty(
        "--headline-offset",
        `${((1 - getPhase(progress, headline)) * headline.offsetPx).toFixed(2)}px`,
      );
      section.style.setProperty(
        "--copy-visibility",
        getVisibility(progress, animations.copy).toFixed(4),
      );

      return progress;
    };

    const scheduleSeek = (delay: number) => {
      if (disposed || seekTimer !== null) return;
      seekTimer = window.setTimeout(() => {
        seekTimer = null;
        requestSync();
      }, Math.max(delay, 0));
    };

    const runFrame = () => {
      frameId = null;
      if (disposed) return;

      const progress = readProgress();

      // Report the real scroll position so a parent can hand off to the next screen.
      onProgressRef.current?.(progress);

      // `duration` only exists once metadata has loaded. Before that the text
      // animations still follow the scroll and the poster stays on screen.
      if (!hasSeekableDuration(video.duration)) return;

      targetTime = progress * video.duration;

      const now = performance.now();
      const wait = SEEK_INTERVAL_MS - (now - lastSeekAt);
      if (wait > 0) {
        scheduleSeek(wait);
        return;
      }

      const safeTarget = clamp(targetTime, 0, video.duration);
      if (Math.abs(video.currentTime - safeTarget) < SEEK_EPSILON_SECONDS) return;

      // Wait for the in-flight seek instead of stacking another one on top.
      if (isSeeking || video.seeking) {
        scheduleSeek(SEEK_INTERVAL_MS);
        return;
      }

      lastSeekAt = now;
      video.currentTime = safeTarget;
    };

    const requestSync = () => {
      if (disposed || frameId !== null) return;
      frameId = requestAnimationFrame(runFrame);
    };

    const handleMediaReady = () => {
      video.pause();
      requestSync();
    };

    const handleSeeking = () => {
      isSeeking = true;
    };

    const handleSeeked = () => {
      isSeeking = false;
      if (Math.abs(video.currentTime - targetTime) >= SEEK_EPSILON_SECONDS) requestSync();
    };

    // Scrub-only surface: the video must never start playing on its own.
    const handlePlayAttempt = () => {
      video.pause();
    };

    const handleLayoutChange = () => {
      requestSync();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelScheduledWork();
        return;
      }
      requestSync();
    };

    // A scroll gesture that cannot move the page any further (the section is already at
    // its last frame) still has to re-read the progress, so a parent can chain screens.
    const handleScrollIntent = () => {
      requestSync();
    };

    video.pause();
    video.addEventListener("loadedmetadata", handleMediaReady);
    video.addEventListener("durationchange", handleMediaReady);
    video.addEventListener("loadeddata", handleLayoutChange);
    video.addEventListener("canplay", handleLayoutChange);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("play", handlePlayAttempt);
    window.addEventListener("scroll", handleLayoutChange, { passive: true });
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("pageshow", handleLayoutChange);
    window.addEventListener("load", handleLayoutChange);
    window.visualViewport?.addEventListener("resize", handleLayoutChange);
    window.visualViewport?.addEventListener("scroll", handleLayoutChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("wheel", handleScrollIntent, { passive: true });
    window.addEventListener("touchmove", handleScrollIntent, { passive: true });
    window.addEventListener("keydown", handleScrollIntent);
    window.addEventListener("pointerdown", handleScrollIntent);

    // Covers the first paint as well as reloads that restore a mid-section scroll.
    requestSync();

    return () => {
      disposed = true;
      cancelScheduledWork();
      video.removeEventListener("loadedmetadata", handleMediaReady);
      video.removeEventListener("durationchange", handleMediaReady);
      video.removeEventListener("loadeddata", handleLayoutChange);
      video.removeEventListener("canplay", handleLayoutChange);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("play", handlePlayAttempt);
      window.removeEventListener("scroll", handleLayoutChange);
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("pageshow", handleLayoutChange);
      window.removeEventListener("load", handleLayoutChange);
      window.visualViewport?.removeEventListener("resize", handleLayoutChange);
      window.visualViewport?.removeEventListener("scroll", handleLayoutChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("wheel", handleScrollIntent);
      window.removeEventListener("touchmove", handleScrollIntent);
      window.removeEventListener("keydown", handleScrollIntent);
      window.removeEventListener("pointerdown", handleScrollIntent);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={className ? `scroll-video-section ${className}` : "scroll-video-section"}
      style={{
        "--scroll-progress": 0,
        "--headline-visibility": 0,
        "--headline-offset": `${animations.headline.offsetPx}px`,
        "--copy-visibility": 0,
      } as CSSProperties}
      aria-label={label}
    >
      <div className="scroll-video-section__sticky">
        <video
          ref={videoRef}
          className="scroll-video-section__video"
          muted
          playsInline
          preload="auto"
          poster={poster}
          autoPlay={false}
          controls={false}
          aria-hidden="true"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="scroll-video-section__scrim" />
        {children ? (
          <div className="scroll-video-section__content">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
