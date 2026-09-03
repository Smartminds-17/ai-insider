  "use client";

import TopicList from "@/components/TopicList";
import type { PathView } from "@/domain/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PathPage() {
  const { id } = useParams();
  const [path, setPath] = useState<PathView | null>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/paths/${id}`)
        .then((res) => res.json())
        .then((json) => setPath(json.data))
        .catch(() => setPath(null));
    }
  }, [id]);

  if (!path) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-medium mb-2">{path.title}</h1>
        <p className="text-[var(--text-dim)] mb-10">{path.prompt}</p>
        <TopicList topics={path.topics} />
      </div>
    </main>
  );
}