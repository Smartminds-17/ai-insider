import { fetchChannelPlaylists, type ChannelPlaylist } from "./youtubeClient";
import { rankPlaylists } from "./rankPlaylists";

// Channels repeat across waypoints (one creator often covers several topics),
// so a path's generation probes each channel at most once per hour.
const CACHE_TTL = 60 * 60 * 1000;
const playlistCache = new Map<string, { data: ChannelPlaylist[]; timestamp: number }>();

async function playlistsForChannel(channelId: string): Promise<ChannelPlaylist[]> {
  const cached = playlistCache.get(channelId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const fresh = await fetchChannelPlaylists(channelId);
  playlistCache.set(channelId, { data: fresh, timestamp: Date.now() });
  return fresh;
}

export type SuggestedPlaylist = ChannelPlaylist;

/**
 * Find one curated playlist that fits a waypoint, drawn from the channels
 * already teaching on that route. Probing 3 channels costs 3 quota units and
 * never fails the path — a weak match simply returns null.
 */
export async function suggestPlaylistForTopic(
  topicTitle: string,
  channelIds: string[],
  maxChannels = 3
): Promise<SuggestedPlaylist | null> {
  const unique = [...new Set(channelIds.filter((id): id is string => Boolean(id)))].slice(
    0,
    maxChannels
  );
  if (unique.length === 0) return null;

  const lists = await Promise.all(unique.map(playlistsForChannel));

  const seen = new Set<string>();
  const candidates = lists.flat().filter((playlist) => {
    if (seen.has(playlist.id)) return false;
    seen.add(playlist.id);
    return true;
  });

  const [best] = rankPlaylists(candidates, topicTitle, 1);
  return best ?? null;
}
