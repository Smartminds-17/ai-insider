  "use client";

import PathRoadmap from "@/components/PathRoadmap";
import { useParams } from "next/navigation";

export default function PathPage() {
  const { id } = useParams();

  if (typeof id !== "string") {
    return null;
  }

  return <PathRoadmap pathId={id} />;
}