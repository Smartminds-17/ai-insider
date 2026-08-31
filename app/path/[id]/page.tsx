import PathRoadmap from "@/components/PathRoadmap";

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathRoadmap pathId={id} />;
}
