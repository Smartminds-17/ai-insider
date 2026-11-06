"use client";

import { useEffect, useState } from "react";

// Client-side system config state
interface ClientSystemConfig {
  pathGenerationPollIntervalMs: number;
  pathGeneratingMessage: string;
  pathFailedMessage: string;
  progressAutoSaveIntervalMs: number;
}

export function useSystemConfig() {
  const [config, setConfig] = useState<ClientSystemConfig>({
    pathGenerationPollIntervalMs: 2000,
    pathGeneratingMessage: "Finding the best videos for each stop — this takes a moment.",
    pathFailedMessage: "Something went wrong charting this route. Try creating a new one.",
    progressAutoSaveIntervalMs: 5000
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/system-config");
        const json = await res.json();
        if (json.data) setConfig(json.data);
      } catch (err) {
        console.warn("Failed to fetch system config, using defaults:", err);
      }
    };
    fetchConfig();
  }, []);

  return config;
}