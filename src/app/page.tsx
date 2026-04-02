"use client";

import Image from "next/image";
import { UnifiedSearch } from "@/components/ranking/unified-search";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
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

      {/* Stats */}
      <div className="flex gap-8 text-center text-muted-foreground mt-16">
        <div>
          <div className="text-2xl font-bold text-foreground">🎮</div>
          <div className="text-xs mt-1">2개 게임 지원</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">🏫</div>
          <div className="text-xs mt-1">전국 학교 검색</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">📱</div>
          <div className="text-xs mt-1">카톡/인스타 공유</div>
        </div>
      </div>
    </main>
  );
}
