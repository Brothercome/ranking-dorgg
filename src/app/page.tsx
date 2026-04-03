"use client";

import Image from "next/image";
import { UnifiedSearch } from "@/components/ranking/unified-search";
import { LeaderboardPreview } from "@/components/ranking/leaderboard-preview";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.07] blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-pink-600/[0.05] blur-[100px]" />
      </div>

      {/* Hero */}
      <div className="text-center mb-10 max-w-2xl">
        <Image
          src="/dorranking.svg"
          alt="랭킹도르그"
          width={300}
          height={50}
          className="mx-auto mb-4"
          priority
        />
        <p className="text-lg text-muted-foreground">
          우리 학교에서 내 게임 랭킹은 몇 등?
        </p>
      </div>

      {/* Unified Search */}
      <UnifiedSearch />

      {/* Leaderboard */}
      <LeaderboardPreview />

    </main>
  );
}
