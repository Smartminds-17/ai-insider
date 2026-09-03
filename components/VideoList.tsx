import type { PathView } from "@/domain/types";

export default function VideoList({ videos }: { videos: PathView["topics"][0]["videos"] }) {
  return (
    <ul className="space-y-4">
      {videos.map((video) => (
        <li key={video.id} className="flex items-start gap-4">
          <input type="checkbox" checked={video.watched} className="mt-1" />
          <div>
            <h3 className="font-medium">{video.title}</h3>
            <p className="text-sm text-[var(--text-dim)]">{video.channelTitle}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}