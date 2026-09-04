"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = ["Become a data analyst", "Learn UI design fundamentals", "Start making short-form video content"];

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
      if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong");
      const { id } = json.data;
      router.push(`/path/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    } finally {
      // Always reset loading state if navigation fails for any reason
      // This prevents the button from staying disabled permanently
      setTimeout(() => setLoading(false), 1000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <label htmlFor="prompt" className="block font-mono text-xs tracking-widest uppercase text-[var(--text-dim)] mb-3">
        Destination
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What do you want to learn?"
          maxLength={300}
          disabled={loading}
          className="flex-1 min-w-0 bg-[var(--ink-2)] border border-white/10 rounded-lg px-4 py-3.5 text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--route)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="shrink-0 min-h-[44px] px-6 py-3.5 rounded-lg bg-[var(--route)] text-[var(--ink)] font-display font-medium hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Mapping route…" : "Map my route"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error} — please try again.</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            disabled={loading}
            className="text-xs font-mono px-3 py-1.5 rounded-full border border-white/10 text-[var(--text-dim)] hover:text-[var(--text)] hover:border-white/25 transition disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}