"use client";

import { formatDuration } from "@/lib/formatDuration";
import type { YTPlayerInstance } from "@/types/youtube";
import { useCallback, useEffect, useRef, useState } from "react";

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

// How often we flush accumulated watch-seconds to the server. This is what
// makes tracking "streaming" rather than a single write at the end.
const PROGRESS_FLUSH_INTERVAL_MS = 10_000;
const UI_TICK_MS = 250;

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Tracks watch-seconds accumulated since the last flush to the backend.
  const pendingSecondsRef = useRef(0);
  const lastTickTimeRef = useRef<number | null>(null);
  const currentVideoRef = useRef<ActiveVideo | null>(null);
  const scrubValueRef = useRef(0);
  useEffect(() => {
    currentVideoRef.current = video;
  }, [video]);

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

  // (Re)create the player whenever the selected video changes.
  useEffect(() => {
    if (!video || !mountRef.current) return;
    let cancelled = false;
    setReady(false);
    setIsPlaying(false);
    setCurrentTime(video.lastPositionSec || 0);
    setDuration(video.durationSec || 0);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT || !mountRef.current) return;

      playerRef.current?.destroy();
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
            setDuration(e.target.getDuration() || video.durationSec || 0);
            if (video.lastPositionSec > 5) {
              e.target.seekTo(video.lastPositionSec, true);
            }
          },
          onStateChange: (e) => {
            if (cancelled) return;
            const playing = e.data === window.YT?.PlayerState?.PLAYING;
            setIsPlaying(!!playing);
            if (e.data === window.YT?.PlayerState?.ENDED) {
              flushProgress();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      flushProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

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
      if (!isScrubbing) {
        setCurrentTime(player.getCurrentTime?.() ?? 0);
      }
    }, UI_TICK_MS);
    return () => clearInterval(interval);
  }, [ready, isPlaying, isScrubbing]);

  // Periodic flush to the server so progress is genuinely streamed, not
  // written only once at the end.
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(flushProgress, PROGRESS_FLUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ready, flushProgress]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!video) {
    return (
      <div className="sticky top-0 z-30 -mx-16 px-16 pb-4 pt-4 bg-[var(--ink)]/80 backdrop-blur-xl">
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
    <div className="sticky top-0 z-30 -mx-16 px-16 pb-4 pt-4 bg-[var(--ink)]/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        <div
          ref={wrapperRef}
          className="relative aspect-video w-full rounded-2xl bg-black group border border-white/10 overflow-hidden"
        >
          <div ref={mountRef} className="w-full h-full" />

          {/* Click-to-play overlay, only shown when player is ready but not yet playing */}
          {!isPlaying && ready && (
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
