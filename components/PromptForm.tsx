"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  "Become a data analyst",
  "Learn UI design fundamentals",
  "Start making short-form video content",
];

export default function PromptForm() {
  const [prompt, setPrompt] = useState("");
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
        body: JSON.stringify({ prompt }),
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
            className="btn btn--route shrink-0 min-h-[44px] px-5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Mapping route…" : "Map my route →"}
          </button>
        </div>
      </label>

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