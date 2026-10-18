"use client";

import PromptForm from "@/components/PromptForm";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface PathsResponse {
  data: unknown[];
  meta: {
    monthlyUsage: number;
    monthlyLimit: number;
    totalMonthlyPaths: number;
    lifetimeTotalPaths: number;
  };
  error: { code: string; message: string } | null;
}
  
  export default function Home() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [displayData, setDisplayData] = useState({
    monthlyUsage: 0,
    monthlyLimit: 3,
    totalMonthlyPaths: 0,
    lifetimeTotalPaths: 0
  });

  useEffect(() => {
    // Fetch all data from API - we'll use what we need based on login status
    fetch("/api/paths")
      .then(res => res.json() as Promise<PathsResponse>)
      .then(json => {
        if (json.meta) {
          setDisplayData({
            monthlyUsage: json.meta.monthlyUsage,
            monthlyLimit: json.meta.monthlyLimit,
            totalMonthlyPaths: json.meta.totalMonthlyPaths,
            lifetimeTotalPaths: json.meta.lifetimeTotalPaths
          });
        }
      })
      .catch(err => console.error("Failed to load usage data:", err));
  }, []);

  return (
    <main className="relative flex-1 overflow-hidden px-5 py-12 sm:px-8 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] opacity-60" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(232,163,61,.12), transparent 65%)" }} />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:mb-14">
          <span className="legend-label legend-label--route">AI Insider</span>
          <span className="text-[var(--ink-4)]">·</span>
          <span className="chip chip--ink">
            <span className="chip__dot" />
            {isLoggedIn 
              ? `Usage · ${displayData.monthlyUsage} / ${displayData.monthlyLimit} routes this month`
              : `${displayData.totalMonthlyPaths} path${displayData.totalMonthlyPaths !== 1 ? "s" : ""} created this month`
            }
          </span>
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display mb-6 text-4xl font-medium leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            YouTube has the course.
            <br />
            You just couldn&apos;t{" "}
            <span className="text-[var(--route)]">find the trail.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-[var(--text-dim)] sm:text-lg">
            Turn a learning goal into a clear sequence of videos. Follow your progress one lesson at a time.
          </p>

          <PromptForm />
        </div>

        <section aria-label="How AI Insider works" className="mx-auto mt-14 grid max-w-4xl gap-3 border-t border-white/10 pt-6 sm:mt-20 sm:grid-cols-3 sm:gap-6 sm:pt-8">
          {[
            { number: "01", title: "Name your goal", copy: "Describe what you want to learn." },
            { number: "02", title: "Get a learning route", copy: "Videos are arranged into a step-by-step path." },
            { number: "03", title: "Keep moving", copy: "Track progress as you work through each lesson." },
          ].map((step) => (
            <div key={step.number} className="flex gap-3 sm:block">
              <span className="legend-label legend-label--route pt-1 sm:block sm:pb-3">{step.number}</span>
              <div>
                <h2 className="mb-1 text-sm font-medium text-[var(--text)]">{step.title}</h2>
                <p className="text-sm leading-relaxed text-[var(--text-dim)]">{step.copy}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Design-only: Pricing teaser section (hidden per request, uncomment to restore)
        <section className="mt-20">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="legend-label legend-label--sage mb-2">Choose your trail</p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium">
                From a day hike to a guided expedition.
              </h2>
            </div>
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              Full plans
              <span aria-hidden>→</span>
            </Link>
          </div>*/}

          {/*<div className="grid gap-4 md:grid-cols-3">
            <article className="surface-card p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="legend-label legend-label--dim">Tier 01 · Free</span>
                <span className="chip chip--ink">
                  <span className="chip__dot" />
                  Day hike
                </span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-medium mb-1">$0</h3>
                <p className="text-xs text-[var(--text-dim)] font-mono tracking-wider">
                  FOREVER
                </p>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1 text-[var(--sage)]">●</span>
                  <span>3 routes / month</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 text-[var(--sage)]">●</span>
                  <span>Progress tracking</span>
                </li>
                <li className="flex gap-2 opacity-40">
                  <span className="mt-1">○</span>
                  <span>Community trail logs</span>
                </li>
                <li className="flex gap-2 opacity-40">
                  <span className="mt-1">○</span>
                  <span>Trail guide sessions</span>
                </li>
              </ul>
              <button className="btn btn--ghost mt-auto btn--block" type="button">
                Start with free
              </button>
            </article>

            <article className="surface-card p-6 flex flex-col gap-5 ring-1 ring-[var(--route)]/40">
              <div className="flex items-center justify-between">
                <span className="legend-label legend-label--route">Tier 02 · Pro</span>
                <span className="chip chip--route">
                  <span className="chip__dot" />
                  Most popular
                </span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-medium mb-1">$9 / mo</h3>
                <p className="text-xs text-[var(--text-dim)] font-mono tracking-wider">
                  OR $86 / YEAR · SAVE 20%
                </p>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1 text-[var(--route)]">●</span>
                  <span>Unlimited routes</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 text-[var(--route)]">●</span>
                  <span>Edit syllabus order</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 text-[var(--sage)]">●</span>
                  <span>Community trail logs</span>
                </li>
                <li className="flex gap-2 opacity-40">
                  <span className="mt-1">○</span>
                  <span>Guided mentor sessions</span>
                </li>
              </ul>
              <button className="btn btn--route mt-auto btn--block" type="button">
                Choose Thru-hike
              </button>
            </article>

            <article className="surface-card surface-card--paper p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="legend-label legend-label--dim" style={{ color: "var(--paper-ink)" }}>
                  Tier 03 · Mentor
                </span>
                <span className="chip chip--paper">
                  <span className="chip__dot" />
                  Guided expedition
                </span>
              </div>
              <div>
                <h3 className="font-display text-2xl font-medium mb-1">$39 / mo</h3>
                <p className="text-xs opacity-70 font-mono tracking-wider">
                  OR $390 / YEAR · 2 CREDITS / MO
                </p>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1" style={{ color: "var(--sage)" }}>●</span>
                  <span>Everything in Thru-hike</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1" style={{ color: "var(--sage)" }}>●</span>
                  <span>1:1 trail guide sessions</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1" style={{ color: "var(--sage)" }}>●</span>
                  <span>Mentor-curated reviews</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1" style={{ color: "var(--sage)" }}>●</span>
                  <span>Priority video ranking</span>
                </li>
              </ul>
              <button className="btn btn--paper mt-auto btn--block" type="button">
                Book a guide
              </button>
            </article>
          </div>

          <Link
            href="/pricing"
            className="sm:hidden mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition"
          >
            View full plans →
          </Link>
        </section>*/}
      </div>
    </main>
  );
}
