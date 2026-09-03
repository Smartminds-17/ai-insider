import type { PathView } from "@/domain/types";
import VideoList from "./VideoList";

export default function TopicList({ topics }: { topics: PathView["topics"] }) {
  return (
    <ul className="space-y-8">
      {topics.map((topic) => (
        <li key={topic.id}>
          <h2 className="font-display text-2xl font-medium mb-4">{topic.title}</h2>
          <VideoList videos={topic.videos} />
        </li>
      ))}
    </ul>
  );
}