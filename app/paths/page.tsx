"use client";

import PathHistoryList from "@/components/PathHistoryList";

export default function PathsPage() {
  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-medium mb-10">Your Routes</h1>
        <PathHistoryList />
      </div>
    </main>
  );
}