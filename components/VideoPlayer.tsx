"use client";

import { formatDuration } from "@/lib/formatDuration";
import type { YTPlayerInstance } from "@/types/youtube";
import { useCallback, useEffect, useRef, useState } from "react";

// Shared ActiveVideo interface to avoid circular imports
export interface ActiveVideo {
  id: string; // our internal Video row id, used for progress tracking
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  durationSec: number;
  lastPositionSec: number;
}

interface VideoPlayerProps {
  video: ActiveVideo | null;
  nextVideo?: { youtubeVideoId: string } | null; // Next video to preload for seamless playback
  progressFlushIntervalMs?: number;
  /** Reports playback position at most once per second, for live progress UI. */
  onProgress?: (update: { videoId: string; positionSec: number; durationSec: number }) => void;
}

let ytApiLoadPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window.YT?.Player === 'function') return Promise.resolve();
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiLoadPromise;
}

// UI tick for smooth scrubber updates (fixed interval for responsive UI)
const UI_TICK_MS = 250;

export default function VideoPlayer({ video, nextVideo, progressFlushIntervalMs = 10000, onProgress }: VideoPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const onProgressRef = useRef(onProgress);
  const lastReportRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  // Keyed by YouTube id so switching lessons clears the state without a reset
  // effect (which would trigger an extra render pass).
  const [embedErrorFor, setEmbedErrorFor] = useState<string | null>(null);
  const [slowLoadFor, setSlowLoadFor] = useState<string | null>(null);
  const embedError = Boolean(video && embedErrorFor === video.youtubeVideoId);
  const slowLoad = Boolean(video && slowLoadFor === video.youtubeVideoId);

  // If the embed has not become ready in a reasonable window, surface an
  // explicit "open on YouTube" escape hatch instead of a silent black box.
  useEffect(() => {
    const youTubeId = video?.youtubeVideoId;
    if (!youTubeId || ready) return;
    const timeout = setTimeout(() => setSlowLoadFor(youTubeId), 8000);
    return () => clearTimeout(timeout);
  }, [video?.youtubeVideoId, ready]);

  // Preload next video in sequence when current video is actively playing
  useEffect(() => {
    if (!video || !nextVideo?.youtubeVideoId || !isPlaying) return;

    // Preload the next YouTube video's embed by creating a hidden iframe
    // This allows seamless playback when the user navigates to the next video
    const preloadIframe = document.createElement('iframe');
    preloadIframe.style.display = 'none';
    preloadIframe.src = `https://www.youtube.com/embed/${nextVideo.youtubeVideoId}`;
    preloadIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    document.body.appendChild(preloadIframe);

    // Cleanup preload iframe if component unmounts or video changes
    return () => {
      if (document.body.contains(preloadIframe)) {
        document.body.removeChild(preloadIframe);
      }
    };
  }, [video?.id, nextVideo?.youtubeVideoId, isPlaying]);

  // Tracks watch-seconds accumulated since the last flush to the backend.
  const pendingSecondsRef = useRef(0);
  const lastTickTimeRef = useRef<number | null>(null);
  const currentVideoRef = useRef<ActiveVideo | null>(null);
  const scrubValueRef = useRef(0);
  useEffect(() => {
    currentVideoRef.current = video;
  }, [video]);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const reportProgress = useCallback((positionSec: number, durationSec: number) => {
    const current = currentVideoRef.current;
    if (!current) return;
    const now = Date.now();
    lastReportRef.current = now;
    onProgressRef.current?.({
      videoId: current.id,
      positionSec: Math.max(0, positionSec),
      durationSec: durationSec || current.durationSec,
    });
  }, []);

  const flushProgress = useCallback(() => {
    const v = currentVideoRef.current;
    if (!v || !playerRef.current) return;
    const delta = pendingSecondsRef.current;
    pendingSecondsRef.current = 0;
    if (delta <= 0) return;

    const positionSec = playerRef.current.getCurrentTime?.() ?? 0;
    // navigator.sendBeacon would be ideal on unmount, but fetch keepalive covers it here.
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        videoId: v.id,
        deltaSeconds: delta,
        positionSec,
        durationSec: v.durationSec,
      }),
    }).catch(() => {});
  }, []);

  // Reuse existing player instead of recreating - fixes slow video switching!
  // The player mounts only after an explicit lesson/Resume click, so it starts
  // loading immediately instead of waiting for an intersection observer (which
  // could miss and leave the embed uninitialised behind the "taking too long"
  // fallback).
  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    
    // Update state asynchronously to avoid cascading render warnings
    setTimeout(() => {
      if (!cancelled) {
        setCurrentTime(video.lastPositionSec || 0);
        setDuration(video.durationSec || 0);
      }
    }, 0);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT || !mountRef.current) return;

      if (!playerRef.current) {
        // Only create the player ONCE when the component mounts
        new window.YT.Player(mountRef.current, {
          videoId: video.youtubeVideoId,
          playerVars: {
            // Strip YouTube's native chrome — our own control bar replaces all of it.
            controls: 0,
            rel: 0, // limit related videos (at end) to the same channel
            modestbranding: 1, // smaller YouTube logo
            disablekb: 1, // we handle our own keyboard shortcuts if added later
            iv_load_policy: 3, // hide video annotations/cards
            fs: 0, // hide native fullscreen button, we render our own
            playsinline: 1,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              playerRef.current = e.target;
              setReady(true);
              // A retry of the same lesson must clear any previous fallback.
              setEmbedErrorFor(null);
              setSlowLoadFor(null);
              const knownDuration = e.target.getDuration() || video.durationSec || 0;
              setDuration(knownDuration);
              // Never resume into the final 15 seconds — that lands on the
              // end screen and looks like the video "didn't play".
              const resumeAt =
                video.lastPositionSec > 5 &&
                (!knownDuration || video.lastPositionSec < knownDuration - 15)
                  ? video.lastPositionSec
                  : 0;
              if (resumeAt > 0) {
                e.target.seekTo(resumeAt, true);
              }
              // Start playback immediately once ready
              e.target.playVideo();
            },
            onError: () => {
              if (!cancelled) setEmbedErrorFor(video.youtubeVideoId);
            },
            onStateChange: (e) => {
              if (cancelled) return;
              const playing = e.data === window.YT?.PlayerState?.PLAYING;
              setIsPlaying(!!playing);
              if (!playing) {
                reportProgress(
                  e.target.getCurrentTime?.() ?? 0,
                  e.target.getDuration?.() ?? 0
                );
              }
              if (e.data === window.YT?.PlayerState?.ENDED) {
                flushProgress();
              }
            },
          },
        });
      } else {
        // Switch to new video instantly with cueVideoById (pre-buffers video) then play.
        // Same end-guard as onReady: don't seek into the last 15 seconds.
        const resumeAt =
          video.lastPositionSec > 5 &&
          (!video.durationSec || video.lastPositionSec < video.durationSec - 15)
            ? video.lastPositionSec
            : 0;
        playerRef.current.cueVideoById(video.youtubeVideoId, resumeAt);
        setEmbedErrorFor(null);
        setSlowLoadFor(null);
        setReady(true);
        // Small delay to ensure buffering started before playing
        setTimeout(() => playerRef.current?.playVideo(), 100);
      }
    });

    return () => {
      cancelled = true;
      flushProgress();
    };
  }, [video?.id, flushProgress, reportProgress]);

  // Smooth UI tick (scrubber + clock) and watch-seconds accumulation while playing.
  useEffect(() => {
    if (!ready || !isPlaying) {
      lastTickTimeRef.current = null;
      return;
    }
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const now = performance.now();
      if (lastTickTimeRef.current !== null) {
        pendingSecondsRef.current += (now - lastTickTimeRef.current) / 1000;
      }
      lastTickTimeRef.current = now;
      const seconds = player.getCurrentTime?.() ?? 0;
      if (!isScrubbing) {
        setCurrentTime(seconds);
      }
      // Feed the page's live progress readout, but only once per second so the
      // roadmap isn't re-rendering on every 250ms UI tick.
      if (Date.now() - lastReportRef.current >= 1000) {
        reportProgress(seconds, player.getDuration?.() ?? 0);
      }
    }, UI_TICK_MS);
    return () => clearInterval(interval);
  }, [ready, isPlaying, isScrubbing, reportProgress]);

  // Periodic flush to the server so progress is genuinely streamed, not
  // written only once at the end. Uses database-configured interval
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(flushProgress, progressFlushIntervalMs);
    return () => clearInterval(interval);
  }, [ready, flushProgress, progressFlushIntervalMs]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!video) {
    return (
      <div className="sticky top-[var(--header-h)] z-[var(--z-player)] -mx-5 px-5 pb-4 pt-4 sm:-mx-8 sm:px-8 bg-[var(--ink)]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <div className="aspect-video w-full rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-[var(--text-dim)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.25}
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                  />
                </svg>
              </div>
              <p className="text-sm text-[var(--text-dim)] font-mono">
                Select a video from the syllabus below to start watching
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setScrubValue(value);
    scrubValueRef.current = value;
  };

  // Shared commit handler for mouse and touch — reads the last scrubbed value
  // rather than the differently-shaped mouse/touch event, so one handler works for both.
  const commitSeek = () => {
    playerRef.current?.seekTo(scrubValueRef.current, true);
    setCurrentTime(scrubValueRef.current);
    setIsScrubbing(false);
    reportProgress(scrubValueRef.current, duration);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    playerRef.current?.setVolume(value);
    if (value === 0) {
      playerRef.current?.mute();
      setMuted(true);
    } else if (muted) {
      playerRef.current?.unMute();
      setMuted(false);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  };

  return (
    <div className="sticky top-[var(--header-h)] z-[var(--z-player)] -mx-5 px-5 pb-4 pt-4 sm:-mx-8 sm:px-8 bg-[var(--ink)]/85 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        <div
          ref={wrapperRef}
          className="relative aspect-video w-full rounded-2xl bg-black group border border-white/10 overflow-hidden"
        >
          <div ref={mountRef} className="w-full h-full" />

          {/* Fallback when YouTube refuses to embed the lesson (disabled by the
              uploader, age-gated, or removed). Without this the player just sits
              on a black rectangle with a console 404. */}
          {(embedError || (slowLoad && !ready)) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--ink)]/95 px-6 text-center">
              <p className="text-sm font-medium text-[var(--text)]">
                {embedError ? "This lesson can’t play here" : "This lesson is taking too long to load"}
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-[var(--text-dim)]">
                {embedError
                  ? "YouTube has disabled embedding for this video. Open it on YouTube, or pick another lesson below."
                  : "YouTube may be blocked or slow on this connection. You can open the lesson directly."}
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeVideoId)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn--route btn--sm"
              >
                Open on YouTube
              </a>
            </div>
          )}

          {/* Click-to-play overlay, only shown when player is ready but not yet playing */}
          {!isPlaying && ready && !embedError && (
            <button
              type="button"
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/20"
              onClick={togglePlay}
              aria-label="Play video"
            >
              <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.3 20.7c-.4 0-.8-.1-1.1-.4-.6-.5-.9-1.2-.9-2V5.7c0-.8.3-1.5.9-2 .6-.5 1.4-.6 2.1-.3l11.5 6.3c.7.4 1.1 1.1 1.1 1.9s-.4 1.5-1.1 1.9L7.3 20.4c-.3.2-.7.3-1 .3z" />
                </svg>
              </div>
            </button>
          )}

          {/* Custom controls, absolutely positioned over the player iframe */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              // When fullscreen, controls are always visible. Otherwise, they fade in/out on hover.
              opacity: isFullscreen || isScrubbing ? 1 : undefined,
            }}
          >
            <div className="flex items-center gap-4">
              <button type="button" onClick={togglePlay} className="text-white">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-white font-mono tabular-nums">
                  {formatDuration(Math.round(isScrubbing ? scrubValue : currentTime))}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={isScrubbing ? scrubValue : currentTime}
                  onChange={handleSeek}
                  onMouseDown={() => setIsScrubbing(true)}
                  onMouseUp={commitSeek}
                  onTouchStart={() => setIsScrubbing(true)}
                  onTouchEnd={commitSeek}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white ${
                      ((isScrubbing ? scrubValue : currentTime) / duration) * 100
                    }%, rgba(255,255,255,0.2) ${((isScrubbing ? scrubValue : currentTime) / duration) * 100}%)`,
                  }}
                />
                <span className="text-xs text-white font-mono tabular-nums">
                  {formatDuration(Math.round(duration))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={toggleMute} className="text-white">
                  {muted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.94 8.94 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c3.98-.91 7-4.49 7-8.77s-3.02-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white ${
                      muted ? 0 : volume
                    }%, rgba(255,255,255,0.2) ${muted ? 0 : volume}%)`,
                  }}
                />
              </div>
              <button type="button" onClick={toggleFullscreen} className="text-white">
                {isFullscreen ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}