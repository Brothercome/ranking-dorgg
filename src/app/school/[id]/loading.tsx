export default function SchoolLoading() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="animate-pulse h-8 w-56 rounded bg-white/[0.06] mb-3" />
          <div className="animate-pulse h-4 w-40 rounded bg-white/[0.06]" />
        </div>

        {/* Leaderboard card skeleton */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="animate-pulse h-5 w-24 rounded bg-white/[0.06]" />
            <div className="animate-pulse h-6 w-28 rounded bg-white/[0.06]" />
          </div>
          <div className="divide-y divide-white/5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="animate-pulse h-6 w-6 rounded-full bg-white/[0.06]" />
                <div className="animate-pulse h-4 w-32 rounded bg-white/[0.06]" />
                <div className="ml-auto animate-pulse h-4 w-16 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
