"use client";

import { useSearchStore } from "@/stores/search-store";
import { RankingCard } from "@/components/ranking/ranking-card";
import { ShareButtons } from "@/components/share/share-buttons";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { RankingResult } from "@/types/ranking";
import type { GameType } from "@/types/game";
import Link from "next/link";

function RankContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { rankingResult: storeResult } = useSearchStore();
  const [ranking, setRanking] = useState<RankingResult | null>(storeResult);
  const [loading, setLoading] = useState(!storeResult);

  const accountId = params.id as string;
  const orgId = searchParams.get("org");
  const game = searchParams.get("game") as GameType;

  useEffect(() => {
    if (storeResult) {
      setRanking(storeResult);
      return;
    }

    if (!orgId || !game) return;

    async function fetchRanking() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rank/${orgId}?game=${game}&accountId=${accountId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setRanking(data.data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, [storeResult, orgId, game, accountId]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-muted-foreground animate-pulse">랭킹 불러오는 중...</p>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">랭킹 데이터를 찾을 수 없습니다</p>
        <Link href="/" className="text-primary hover:underline">처음으로 돌아가기</Link>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined"
    ? window.location.href
    : `${process.env.NEXT_PUBLIC_URL}/rank/${accountId}?org=${orgId}&game=${game}`;

  return (
    <div className="w-full max-w-lg space-y-6">
      <RankingCard ranking={ranking} />
      <ShareButtons rankEntry={ranking.myRank} shareUrl={shareUrl} />

      {/* Leaderboard */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">🏆 TOP 랭킹</h3>
        {ranking.topRanks.map((entry) => (
          <div
            key={entry.gameAccountId}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              entry.gameAccountId === ranking.myRank.gameAccountId
                ? "border-primary/50 bg-primary/5"
                : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${
                entry.rank === 1 ? "text-yellow-400" :
                entry.rank === 2 ? "text-gray-300" :
                entry.rank === 3 ? "text-orange-400" : "text-muted-foreground"
              }`}>
                #{entry.rank}
              </span>
              <div>
                <div className="font-medium text-sm">{entry.gameName}</div>
                <div className="text-xs text-muted-foreground">{entry.tier} {entry.tierRank}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{entry.points}{ranking.gameType === "valorant" ? "RR" : "LP"}</div>
          </div>
        ))}
      </div>

      {/* Try again */}
      <div className="text-center pt-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          다른 게임으로 확인하기 →
        </Link>
      </div>
    </div>
  );
}

export default function RankPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground animate-pulse">로딩 중...</div>}>
        <RankContent />
      </Suspense>
    </main>
  );
}
