"use client";

import Image from "next/image";
import { UnifiedSearch } from "@/components/ranking/unified-search";
import { LeaderboardPreview } from "@/components/ranking/leaderboard-preview";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.07] blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-pink-600/[0.05] blur-[100px]" />
      </div>

      {/* Hero */}
      <div className="text-center mb-6 sm:mb-10 max-w-2xl px-2">
        <Image
          src="/dorranking.svg"
          alt="랭킹 도르"
          width={300}
          height={50}
          className="mx-auto mb-3 sm:mb-4 w-[220px] sm:w-[300px] h-auto"
          priority
        />
        <p className="text-sm sm:text-lg text-muted-foreground">
          우리 학교 <span className="text-foreground font-semibold">1등</span>은 누구? <span className="text-foreground font-semibold">내 등수</span>는?
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          닉네임#태그 입력 3초면 확인 · 카톡 · 인스타 · 디코 공유
        </p>
      </div>

      {/* Unified Search */}
      <UnifiedSearch />

      {/* dor.gg CTA Banner — above the fold for conversion */}
      <div className="w-full max-w-2xl mx-auto mt-5 sm:mt-6">
        <DorggCtaBanner placement="home_hero" />
      </div>

      {/* Leaderboard */}
      <LeaderboardPreview />

    </main>
  );
}
