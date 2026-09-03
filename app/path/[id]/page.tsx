import PathHistoryList from "@/components/PathHistoryList";

export default function PathsHistoryPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--route)] mb-3">
          Your routes
        </p>
        <h1 className="font-display text-3xl font-medium mb-10">My Paths</h1>
        <PathHistoryList />
      </div>
    </main>
  );
}
