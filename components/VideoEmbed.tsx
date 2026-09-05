"use client";

import { useEffect, useRef } from "react";

// Extend Window type to include YouTube API types that TypeScript doesn't know about
declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: unknown) => {
        pauseVideo: () => void;
        destroy: () => void;
      };
      PlayerState?: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface VideoEmbedProps {
  youtubeVideoId: string;
  title: string;
}

// PER-BROWSER (local) tracking of the active playing iframe - this is NOT shared between users/browsers
// Each user's browser session maintains its own state, so only ONE video plays per browser page
let activePlayingIframe: HTMLIFrameElement | null = null;

export default function VideoEmbed({ youtubeVideoId, title }: VideoEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Load YouTube IFrame API to get proper player events that work reliably
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player once YouTube API is ready
    const initPlayer = () => {
      if (!window.YT?.Player) {
        // If API isn't ready yet, retry in 500ms
        setTimeout(initPlayer, 500);
        return;
      }
      
      new window.YT.Player(iframe, {
        events: {
          onReady: () => {},
          onStateChange: (event: { data: number }) => {
            // YouTube PlayerState.PLAYING = 1
            if (event.data === 1) {
              // When THIS video starts playing, pause the currently active one (if any exists and it's not this one)
              if (activePlayingIframe && activePlayingIframe !== iframe) {
                // Call pauseVideo() on the previously active player
                try {
                  activePlayingIframe.contentWindow?.postMessage(
                    '{"event":"command","func":"pauseVideo","args":""}',
                    "*"
                  );
                } catch (err) {
                  console.log("Failed to pause previous player", err);
                }
              }
              // Set this iframe as the new active playing one
              activePlayingIframe = iframe;
            }
          },
        },
      });
    };

    // Start the initialization process
    if (window.YT) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Cleanup
    return () => {
      if (activePlayingIframe === iframe) {
        activePlayingIframe = null;
      }
    };
  }, [youtubeVideoId]);

  // Enable JS API for programmatic control, add playsinline to prevent fullscreen hijack
  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  
  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope;picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}