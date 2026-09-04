"use client";

import type { PathView } from "@/domain/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RelatedRail from "./RelatedRail";
import TopicWaypoint from "./TopicWaypoint";

interface PathRoadmapProps {
  pathId: string;
}

export default function PathRoadmap({ pathId }: PathRoadmapProps) {
  const router = useRouter();
  const [path, setPath] = useState<PathView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedTopicIndex, setExpandedTopicIndex] = useState<number | null>(null); // ONLY ONE TOPIC EXPANDED AT A TIME

  // Single-source-of-truth for which topic is expanded - only one can ever be open!
  const handleToggleTopic = (index: number) => {
    if (expandedTopicIndex === index) {
      // Closing the currently open topic
      setExpandedTopicIndex(null);
    } else {
      // Opening a new topic - automatically closes the previous one, so only one video is ever loaded
      setExpandedTopicIndex(index);
    }
  };

  const fetchPath = useCallback(async () => {
    const res = await fetch(`/api/paths/${pathId}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const json = await res.json();
    console.log("Fetched path data:", JSON.stringify(json.data, null, 2));
    setPath(json.data);
  }, [pathId]);

  useEffect(() => {
    // Standard fetch-on-mount idiom: fetchPath is async and calls setState
    // once data arrives, not synchronously within the effect body itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPath();
  }, [fetchPath]);

  // While the path is still being assembled server-side, poll for updates.
  useEffect(() => {
    if (!path || path.status !== "GENERATING") return;
    const interval = setInterval(fetchPath, 2000);
    return () => clearInterval(interval);
  }, [path, fetchPath]);

  async function handleToggleWatched(videoId: string, watched: boolean) {
    // Optimistic update
    setPath((prev) =>
      prev
        ? {
            ...prev,
            topics: prev.topics.map((t) => ({
              ...t,
              videos: t.videos.map((v) => (v.id === videoId ? { ...v, watched } : v)),
            })),
          }
        : prev
    );
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, watched }),
    });
  }

  async function handleDelete() {
    if (!path || deleting) return;
    
    if (!window.confirm("Are you sure you want to delete this route? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/paths/${pathId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/paths"); // Redirect back to your routes list after deletion
      }
    } catch (err) {
      console.error("Failed to delete path:", err);
      setDeleting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-[var(--text-dim)]">This route doesn&apos;t exist. It may have been removed.</p>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading route…</p>
      </div>
    );
  }

  const totalVideos = path.topics.reduce((sum, t) => sum + t.videos.length, 0);
  const watchedVideos = path.topics.reduce((sum, t) => sum + t.videos.filter((v) => v.watched).length, 0);
  const pct = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--route)] mb-3">
          {path.status === "GENERATING" ? "Charting route…" : `${pct}% complete`}
        </p>
        <div className="flex items-start justify-between mb-10">
          <h1 className="font-display text-3xl font-medium">{path.title}</h1>
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1 text-sm text-red-400 border border-red-400 rounded hover:bg-red-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Delete Route"}
          </button>
        </div>

        {path.status === "GENERATING" && (
          <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse mb-10">
            Finding the best videos for each step — this takes a moment.
          </p>
        )}

        {path.status === "FAILED" && (
          <p className="text-sm text-red-400 mb-10">
            Something went wrong charting this route. Try creating a new one.
          </p>
        )}

        <div>
          {path.topics.map((topic, i) => (
            <TopicWaypoint
              key={topic.id}
              topic={topic}
              isLast={i === path.topics.length - 1}
              onToggleWatched={handleToggleWatched}
              isExpanded={expandedTopicIndex === i}
              onToggle={() => handleToggleTopic(i)}
            />
          ))}
        </div>

        {path.status === "READY" && <RelatedRail field={path.title} />}
      </div>
    </main>
  );
}