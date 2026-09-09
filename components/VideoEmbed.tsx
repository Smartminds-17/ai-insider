"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Add TypeScript definitions for YouTube API - must be at top to extend global Window
declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: {
          events: {
            onReady: () => void;
            onStateChange: (event: { data: number }) => void;
          };
        }) => {
          seekTo: (seconds: number, allowSeekAhead: boolean) => void;
          getCurrentTime: () => number;
          pauseVideo: () => void;
          destroy: () => void;
        };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Per-browser (local) tracking of the active playing iframe - only ONE video plays per browser page
let activePlayingIframe: HTMLIFrameElement | null = null;
// Throttle position updates to every 5s to avoid excessive API calls
const POSITION_UPDATE_INTERVAL = 5000;

// Format seconds to HH:MM:SS for full time tracking
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface VideoEmbedProps {
  youtubeVideoId: string;
  title: string;
  videoId?: string; // Optional internal DB video ID to fetch/save progress (only for core path videos)
  durationSec?: number; // Total video duration to show "Resume at X:XX"
}

export default function VideoEmbed({ youtubeVideoId, title, videoId, durationSec }: VideoEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null); // Local timer for reliable tracking
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0); // Track current playback position for UI

  // Fetch saved playback position when component mounts - only if we have a database videoId
  const fetchSavedPosition = useCallback(async () => {
    if (!videoId) return 0;
    try {
      const res = await fetch(`/api/progress?videoId=${encodeURIComponent(videoId)}`);
      const json = await res.json();
      if (json.data?.positionSec > 30 && !json.data?.watched) {
        // Only show resume toast if we have >30s of progress and video isn't marked watched
        setResumePosition(json.data.positionSec);
        setShowResumeToast(true);
        // Auto-hide toast after 5s
        setTimeout(() => setShowResumeToast(false), 5000);
      }
      setCurrentPosition(json.data?.positionSec || 0);
      return json.data?.positionSec || 0;
    } catch (err) {
      console.error("Failed to fetch saved playback position:", err);
      return 0;
    }
  }, [videoId]);

  // Save current playback position using YouTube iframe postMessage API (more reliable)
  const saveCurrentPosition = useCallback(() => {
    if (!videoId || !iframeRef.current?.contentWindow) return;
    try {
      // Ask the YouTube iframe for current time
      iframeRef.current.contentWindow.postMessage(
        '{"event":"command","func":"getCurrentTime","args":""}',
        "*"
      );
    } catch (err) {
      console.error("Failed to request current playback position:", err);
    }
  }, [videoId]);

  // Listen for messages from the YouTube iframe (including current time responses)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only process messages from YouTube
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = JSON.parse(event.data);
        // When YouTube returns the current time, save it to our database
        if (data.info === "getCurrentTime" && videoId) {
          const currentTime = Math.floor(parseFloat(data.playerData));
          setCurrentPosition(currentTime); // Update UI progress bar
          await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId, positionSec: currentTime }),
          });
        }
      } catch {
        // Ignore invalid JSON messages from YouTube
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoId]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Simple initialization without YouTube Player constructor - uses iframe postMessage API for everything
    const initPlayer = async () => {
      // Fetch saved position once iframe loads
      const savedPosition = await fetchSavedPosition();
      setIsLoading(false);

      // If we have a saved position, seek to it when the iframe is ready
      if (savedPosition > 30 && iframe?.contentWindow) {
        // Give the iframe a moment to load before seeking
        setTimeout(() => {
          iframe.contentWindow?.postMessage(
            `{"event":"command","func":"seekTo","args":[${savedPosition}, true]}`,
            "*"
          );
        }, 2000);
      }

      // Add a message listener to detect when the video starts playing
      const handleVideoState = async (event: MessageEvent) => {
        if (event.origin !== "https://www.youtube.com") return;
        try {
          const data = JSON.parse(event.data);
          // YouTube sends info about player state changes
          if (data.event === "onStateChange") {
            // PlayerState.PLAYING = 1
              if (data.info === 1) {
                setIsPlaying(true);
                // PAUSE ALL OTHER VIDEOS FIRST - query ALL iframes that have our src pattern
                const allIframes = document.querySelectorAll<HTMLIFrameElement>('iframe[src*="youtube.com/embed"]');
                allIframes.forEach((otherIframe) => {
                  if (otherIframe !== iframe && otherIframe.contentWindow) {
                    try {
                      otherIframe.contentWindow.postMessage(
                        '{"event":"command","func":"pauseVideo","args":""}',
                        "*"
                      );
                    } catch (err) {
                      console.log("Failed to pause other player", err);
                    }
                  }
                });
                // Also clear any existing position update intervals from other videos
                if (activePlayingIframe && activePlayingIframe !== iframe) {
                  try {
                    activePlayingIframe.contentWindow?.postMessage(
                      '{"event":"command","func":"pauseVideo","args":""}',
                      "*"
                    );
                  } catch (err) {
                    console.log("Failed to pause active player", err);
                  }
                }
                // Set this iframe as the new active one
                activePlayingIframe = iframe;

                // Start interval to save position every 5s while playing
                if (positionUpdateRef.current) clearInterval(positionUpdateRef.current);
                positionUpdateRef.current = setInterval(saveCurrentPosition, POSITION_UPDATE_INTERVAL);

                // START LOCAL REAL-TIME TIMER for reliable tracking
                if (localTimerRef.current) clearInterval(localTimerRef.current);
                localTimerRef.current = setInterval(() => {
                  setCurrentPosition(prev => {
                    const newPos = prev + 1;
                    // Auto-save every 10 seconds locally too
                    if (newPos % 10 === 0 && videoId) {
                      fetch("/api/progress", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ videoId, positionSec: newPos }),
                      });
                    }
                    return newPos;
                  });
                }, 1000);
              }
              // PlayerState.PAUSED = 2 or ENDED = 0
              if (data.info === 2 || data.info === 0) {
                setIsPlaying(false);
                // Save position immediately when paused/ended
                saveCurrentPosition();
                // Clear interval when video is paused
                if (positionUpdateRef.current) {
                  clearInterval(positionUpdateRef.current);
                  positionUpdateRef.current = null;
                }
                // STOP LOCAL TIMER
                if (localTimerRef.current) {
                  clearInterval(localTimerRef.current);
                  localTimerRef.current = null;
                }
              }
          }
        } catch {
          // Ignore invalid messages
        }
      };

      window.addEventListener("message", handleVideoState);
      return () => window.removeEventListener("message", handleVideoState);
    };

    // Initialize once the iframe loads
    initPlayer();

    // Cleanup on unmount
    return () => {
      if (positionUpdateRef.current) clearInterval(positionUpdateRef.current);
      if (localTimerRef.current) clearInterval(localTimerRef.current);
      if (activePlayingIframe === iframe) activePlayingIframe = null;
    };
  }, [youtubeVideoId, fetchSavedPosition, saveCurrentPosition]);

  // Handle click on progress bar to seek to that position
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!durationSec || !progressBarRef.current || !iframeRef.current?.contentWindow) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * durationSec;
    
    // Seek to the clicked position in YouTube
    iframeRef.current.contentWindow.postMessage(
      `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
      "*"
    );
    // Update our local state immediately
    setCurrentPosition(Math.floor(seekTime));
  }, [durationSec]);

  // Calculate progress percentage for UI
  const progressPercentage = durationSec ? Math.min((currentPosition / durationSec) * 100, 100) : 0;
  
  // Toggle play/pause using YouTube API
  const togglePlayPause = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    if (isPlaying) {
      // Pause video
      iframeRef.current.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        "*"
      );
      setIsPlaying(false);
    } else {
      // Play video
      iframeRef.current.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        "*"
      );
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Enable JS API, HIDE ALL YouTube's default UI elements entirely
  // controls=0: Hide default controls | modestbranding=1: Hide YouTube logo
  // rel=0: Hide related videos at end | showinfo=0: Hide video title/channel info
  // iv_load_policy=3: Hide annotations | disablekb=1: Disable keyboard shortcuts
  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1disablekb=1&originplaysinline=1disablekb=1&originautohide=1disablekb=1&originorigin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  
  return (
    <div className="relative">
      {/* Resume playback toast */}
      {showResumeToast && resumePosition && (
        <div 
          className="absolute top-4 left-4 z-20 surface-card p-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300"
          aria-live="polite"
        >
          <span className="legend-label legend-label--route">Resume trail at</span>
          <span className="font-mono text-sm text-[var(--ink)]">{formatTime(resumePosition)}</span>
        </div>
      )}
      
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative group">
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={embedUrl}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope;picture-in-picture"
          allowFullScreen
          className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}
        />
        
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading video…</p>
          </div>
        )}

        {/* BIG Play/Pause overlay button when paused */}
        {!isLoading && !isPlaying && (
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-all cursor-pointer"
            aria-label="Play video"
          >
            <div className="w-20 h-20 bg-[var(--route)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--route)]/30 hover:scale-110 transition-transform">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </button>
        )}
        
        {/* OUR FULL CUSTOM CONTROL BAR - overlay on bottom of video */}
        {!isLoading && videoId && durationSec && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-12 pb-4 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Progress bar first */}
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all mb-4"
            >
              <div 
                className="h-full bg-[var(--route)] rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center gap-4">
              {/* Play/Pause button */}
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-[var(--route)] transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              {/* Time display */}
              <span className="font-mono text-sm text-white/90">
                {formatTime(currentPosition)} / {formatTime(durationSec)}
              </span>
              
              {/* Spacer */}
              <div className="flex-1"/>
              
              {/* Fullscreen button */}
              <button
                onClick={() => iframeRef.current?.requestFullscreen?.()}
                className="text-white hover:text-[var(--route)] transition-colors"
                aria-label="Fullscreen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add TypeScript definitions for YouTube API
interface Window {
  YT?: {
    Player: new (element: HTMLElement, options: unknown) => {
      seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      getCurrentTime: () => number;
      pauseVideo: () => void;
      destroy: () => void;
    };
    PlayerState?: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  };
  onYouTubeIframeAPIReady?: () => void;
}