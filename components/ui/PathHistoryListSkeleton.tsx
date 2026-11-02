"use client";

export function PathHistoryListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="surface-card animate-pulse p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="chip h-6 w-24 rounded-full bg-white/10" />
                <div className="h-4 w-48 rounded-full bg-white/10" />
              </div>
              <div className="h-6 w-3/4 rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-1/2 rounded-full bg-white/10" />
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t border-white/10 pt-4 sm:border-0 sm:pt-0">
              <div className="btn h-10 w-36 rounded-md bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}