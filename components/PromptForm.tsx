"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EXAMPLES = [
  "Become a data analyst",
  "Learn UI design fundamentals",
  "Start making short-form video content",
];

// Hidden for now. The playlist plumbing (playlistId -> /api/paths ->
// processLearningPathTopics) is kept intact because the mentorship program may
// use it to seed a route from a mentor's curated playlist. Flip to true to
// bring the input back on the homepage.
const PLAYLIST_INPUT_ENABLED = false;

interface PromptFormProps {
  initialPrompt?: string;
}

export default function PromptForm({ initialPrompt = "" }: PromptFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [playlistId, setPlaylistId] = useState("");

  // Focus and select the input text when we receive an initial prompt (from suggested content)
  useEffect(() => {
    if (initialPrompt && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [initialPrompt]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          playlistId: playlistId.trim() || undefined
        }),
      });
      const json = await res.json();
      if (res.status === 402) {
        setError("__gate__");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong");
      const { id } = json.data;
      router.push(`/path/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="prompt" className="block">
        <span className="legend-label legend-label--dim block mb-2.5">
          Destination — what do you want to learn?
        </span>
        <div className="surface-card p-2 flex flex-col sm:flex-row gap-2 focus-within:ring-1 focus-within:ring-[var(--route)]/50 transition">
          <input
            ref={inputRef}
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want to learn?"
            maxLength={300}
            disabled={loading}
            className="flex-1 min-w-0 bg-transparent outline-none px-3 py-3 text-[var(--text)] placeholder:text-[var(--text-dim)] disabled:opacity-60 rounded-md"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="btn btn--route shrink-0 min-h-[44px] px-5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {loading ? "Mapping route…" : "Map my route →"}
          </button>
        </div>
      </label>

      {/* Advanced: YouTube Playlist Input (hidden — reserved for mentorship) */}
      {PLAYLIST_INPUT_ENABLED && (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setPlaylistId(prev => prev === "" ? "https://www.youtube.com/playlist?list=" : "")}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-all duration-300 ease-out flex items-center gap-2 group px-1 py-1.5 rounded-md hover:bg-[var(--surface-elevated)]/50"
        >
          <svg 
            className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-90 group-hover:text-[var(--route)]" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Embed your own YouTube playlist</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-dim)] ml-1 group-hover:bg-[var(--route)]/10 group-hover:text-[var(--route)] transition-colors">
            Beta
          </span>
        </button>
        {playlistId !== "" && (
          <div className="mt-4 surface-card p-4 border border-[var(--border-subtle)] hover:border-[var(--route)]/30 transition-all duration-300 ease-out shadow-sm hover:shadow-md animate-in fade-in slide-in-from-top-3 duration-400">
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 w-8 h-8 bg-[#FF0000]/10 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)]">YouTube Playlist</h3>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">All videos from your playlist will be prioritized in the learning path</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaylistId("")}
                className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors p-1 rounded-md hover:bg-[var(--surface-elevated)]"
                aria-label="Remove playlist"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              id="playlistId"
              value={playlistId}
              onChange={(e) => {
                const value = e.target.value;
                // Auto-extract playlist ID from full URLs
                const listMatch = value.match(/[?&]list=([^&]+)/);
                if (listMatch) {
                  setPlaylistId(listMatch[1]);
                } else {
                  setPlaylistId(value);
                }
              }}
              placeholder="Paste YouTube playlist URL or paste playlist ID (starts with PL...)"
              disabled={loading}
              className="w-full bg-[var(--surface-subtle)] outline-none px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] disabled:opacity-60 rounded-lg border border-[var(--border-subtle)] focus:border-[var(--route)]/50 focus:ring-1 focus:ring-[var(--route)]/30 transition-all duration-200"
            />
            <div className="mt-3 min-h-[20px] px-1">
              {playlistId && !/^PL[a-zA-Z0-9_-]+$/.test(playlistId) && playlistId !== "https://www.youtube.com/playlist?list=" && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5 animate-in fade-in duration-300">
                  <svg className="h-3.5 w-3.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Parsing URL — extracting playlist ID...
                </p>
              )}
              {/^PL[a-zA-Z0-9_-]+$/.test(playlistId) && (
                <p className="text-xs text-emerald-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Valid playlist connected! <span className="font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">{playlistId.slice(0, 8)}...</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {error && error !== "__gate__" && (
        <div className="mt-3 rounded-lg border border-[var(--route)]/30 bg-[var(--route)]/5 text-sm text-[var(--text-dim)] px-4 py-3">
          <span className="legend-label legend-label--route mr-2">ERR</span>
          {error} — please try again.
        </div>
      )}

      {error === "__gate__" && (
        <div
          role="status"
          className="mt-4 surface-card p-5 border-[var(--route)]/30 ring-1 ring-[var(--route)]/20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="legend-label legend-label--route block mb-1.5">
                Trail permit required
              </span>
              <p className="text-sm text-[var(--text-dim)] max-w-md leading-relaxed">
                You&apos;ve used your 3 free routes this month. Upgrade to Thru-hike for
                unlimited routes, community trail logs, and trail-guide access.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/pricing" className="btn btn--ink">
                See plans
              </Link>
              <button type="button" className="btn btn--route">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design slot: the card below is the exact paywall-gate markup that the future
          billing system will show when the API returns 402. Kept in the tree but hidden
          via `hidden data-gate-slot` so the layout is visually proven in this file and
          future engineers only need to conditionally un-hide it. */}
      <div aria-hidden className="hidden" data-gate-slot>
        <div className="mt-4 surface-card p-5 border-[var(--route)]/30 ring-1 ring-[var(--route)]/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="legend-label legend-label--route block mb-1.5">
                Trail permit required
              </span>
              <p className="text-sm text-[var(--text-dim)] max-w-md leading-relaxed">
                You&apos;ve used your 3 free routes this month. Upgrade to Thru-hike
                for unlimited routes, community trail logs, and trail-guide access.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/pricing" className="btn btn--ink">See plans</Link>
              <button type="button" className="btn btn--route">Upgrade</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            disabled={loading}
            className="chip chip--ink disabled:opacity-40"
          >
            <span className="chip__dot" />
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}