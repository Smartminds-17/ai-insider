import { prisma } from "@/infrastructure/db/prisma";

// Cached config to avoid repeated DB calls - invalidates after 5 minutes
const cachedConfig: Map<string, { value?: number; stringValue?: string }> = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSystemConfig<T = number | string | undefined>(key: string): Promise<T> {
  // Refresh cache if it's expired
  if (Date.now() - lastCacheRefresh > CACHE_TTL_MS || !cachedConfig.has(key)) {
    const allConfigs = await prisma.systemConfig.findMany();
    cachedConfig.clear();
    allConfigs.forEach(config => {
      cachedConfig.set(config.key, {
        value: config.value ?? undefined,
        stringValue: config.stringValue ?? undefined
      });
    });
    lastCacheRefresh = Date.now();
  }

  const config = cachedConfig.get(key);
  if (!config) return undefined as T;
  
  // Return numeric value if available, otherwise string value
  return (config.value ?? config.stringValue) as T;
}

// Seed initial config values if they don't exist
export async function seedSystemConfig() {
  const initialConfigs = [
    {
      key: "video_watch_threshold_pct",
      value: 0.95,
      description: "Percentage of video completion to auto-mark as watched"
    },
    {
      key: "path_generation_poll_interval_ms",
      value: 2000,
      description: "Milliseconds between API polls for path generation status"
    },
    {
      key: "anonymous_identity_ttl_days",
      value: 45,
      description: "Number of days to keep anonymous user paths active"
    },
    {
      key: "progress_auto_save_interval_ms",
      value: 5000,
      description: "Milliseconds between automatic progress saves while watching videos"
    },
    {
      key: "path_generating_message",
      stringValue: "Finding the best videos for each stop — this takes a moment. We rank tutorials by view count, recency, and duration fit to the difficulty of the waypoint.",
      description: "UI message shown when a path is still generating"
    },
    {
      key: "path_failed_message",
      stringValue: "Something went wrong charting this route. Try creating a new one.",
      description: "UI message shown when path generation fails"
    }
  ];

  // Upsert all configs to ensure they exist
  for (const config of initialConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config
    });
  }
}