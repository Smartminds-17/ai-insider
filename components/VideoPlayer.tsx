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
  if (window.YT?.Player) return Promise.resolve();
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
    const player = playerRef.current;
    if (!v || !player) return;
    const delta = pendingSecondsRef.current;
    pendingSecondsRef.current = 0;
    if (delta <= 0) return;

    const positionSec = player.getCurrentTime?.() ?? 0;
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
      playerRef.current = new window.YT.Player(mountRef.current, {
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
      <div className="sticky top-0 z-30 -mx-6 px-6 pb-4 pt-4 bg-[var(--ink)]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="aspect-video w-full rounded-2xl bg-[var(--ink-2)] border border-white/10 flex items-center justify-center">
            <p className="text-sm text-[var(--text-dim)] font-mono">
              Select a video from the syllabus below to start watching
            </p>
          </div>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    scrubValueRef.current = value;
    setCurrentTime(value);
  };

  // Shared commit handler for mouse and touch — reads the last scrubbed value
  // rather than the differently-shaped mouse/touch event, so one handler works for both.
  const commitSeek = () => {
    playerRef.current?.seekTo(scrubValueRef.current, true);
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
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
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
    <div className="sticky top-0 z-30 -mx-6 px-6 pb-4 pt-4 bg-[var(--ink)]/95 backdrop-blur border-b border-white/5">
      <div className="max-w-3xl mx-auto">
        <div
          ref={wrapperRef}
          className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black group"
        >
          {/* YouTube IFrame API mounts its iframe here; playerVars strip all native controls */}
          <div ref={mountRef} className="w-full h-full pointer-events-none" />

          {/* Click-to-play/pause overlay on the video area itself */}
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            className="absolute inset-0 w-full h-full"
          />

          {/* Our custom control bar */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onMouseDown={() => setIsScrubbing(true)}
              onChange={handleSeek}
              onMouseUp={commitSeek}
              onTouchStart={() => setIsScrubbing(true)}
              onTouchEnd={() => commitSeek()}
              className="w-full accent-[var(--route)] h-1.5 cursor-pointer mb-2"
              aria-label="Seek"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="5" width="4" height="14" />
                    <rect x="14" y="5" width="4" height="14" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <span className="font-mono text-xs text-white/90 shrink-0 tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <div className="flex items-center gap-1.5 ml-1 shrink-0">
                <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="text-white/80 hover:text-white">
                  {muted || volume === 0 ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2 2m0-2l-2 2M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5l-5 4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5l-5 4z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-16 accent-[var(--route)] h-1 cursor-pointer"
                  aria-label="Volume"
                />
              </div>

              <p className="text-xs text-white/70 truncate flex-1 min-w-0 hidden sm:block">
                {video.title}
              </p>

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="text-white/80 hover:text-white shrink-0"
              >
                {isFullscreen ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15H4v5m0-5l5.5 5.5M15 9h5V4m0 5l-5.5-5.5M9 9H4V4m0 5l5.5-5.5M15 15h5v5m0-5l-5.5 5.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4m8 0h4v-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--text-dim)] truncate">
          <span className="font-medium">{video.title}</span>
          {" · "}
          {video.channelTitle}
        </p>
      </div>
    </div>
  );
}
