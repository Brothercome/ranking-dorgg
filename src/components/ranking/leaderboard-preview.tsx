"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";
import { TierBadge } from "./tier-badge";

type ScopeTab = "school" | "region";

interface SchoolRankEntry {
  rank: number;
  name: string;
  region: string;
  memberCount: number;
  avgTier: string;
  avgTierRank: string;
  avgPoints: number;
  id?: string;
}

interface RegionRankEntry {
  rank: number;
  region: string;
  schoolCount: number;
  playerCount: number;
  topTier: string;
  topTierRank: string;
  avgPoints: number;
}

const RANK_BADGES = ["👑", "🥈", "🥉"];

const MOCK_SCHOOLS: Record<GameType, SchoolRankEntry[]> = {
  lol: [
    { rank: 1, name: "인항고등학교", region: "인천광역시", memberCount: 24, avgTier: "CHALLENGER", avgTierRank: "", avgPoints: 1808 },
    { rank: 2, name: "마포고등학교", region: "서울특별시", memberCount: 18, avgTier: "DIAMOND", avgTierRank: "II", avgPoints: 672 },
    { rank: 3, name: "가좌고등학교", region: "인천광역시", memberCount: 12, avgTier: "MASTER", avgTierRank: "", avgPoints: 355 },
    { rank: 4, name: "서울과학고등학교", region: "서울특별시", memberCount: 31, avgTier: "PLATINUM", avgTierRank: "I", avgPoints: 87 },
    { rank: 5, name: "한국디지털미디어고", region: "경기도", memberCount: 45, avgTier: "GOLD", avgTierRank: "II", avgPoints: 54 },
  ],
  valorant: [
    { rank: 1, name: "서울과학고등학교", region: "서울특별시", memberCount: 15, avgTier: "Radiant", avgTierRank: "", avgPoints: 440 },
    { rank: 2, name: "한국디지털미디어고", region: "경기도", memberCount: 22, avgTier: "Immortal", avgTierRank: "2", avgPoints: 83 },
    { rank: 3, name: "경기과학고등학교", region: "경기도", memberCount: 8, avgTier: "Immortal", avgTierRank: "1", avgPoints: 52 },
    { rank: 4, name: "대전과학고등학교", region: "대전광역시", memberCount: 11, avgTier: "Diamond", avgTierRank: "3", avgPoints: 67 },
    { rank: 5, name: "세종과학고등학교", region: "세종특별자치시", memberCount: 6, avgTier: "Platinum", avgTierRank: "1", avgPoints: 44 },
  ],
};

const MOCK_REGIONS: Record<GameType, RegionRankEntry[]> = {
  lol: [
    { rank: 1, region: "서울특별시", schoolCount: 65, playerCount: 312, topTier: "CHALLENGER", topTierRank: "", avgPoints: 1450 },
    { rank: 2, region: "인천광역시", schoolCount: 9, playerCount: 87, topTier: "CHALLENGER", topTierRank: "", avgPoints: 1230 },
    { rank: 3, region: "경기도", schoolCount: 67, playerCount: 245, topTier: "GRANDMASTER", topTierRank: "", avgPoints: 980 },
    { rank: 4, region: "부산광역시", schoolCount: 29, playerCount: 134, topTier: "GRANDMASTER", topTierRank: "", avgPoints: 876 },
    { rank: 5, region: "대구광역시", schoolCount: 14, playerCount: 76, topTier: "MASTER", topTierRank: "", avgPoints: 654 },
  ],
  valorant: [
    { rank: 1, region: "서울특별시", schoolCount: 65, playerCount: 198, topTier: "Radiant", topTierRank: "", avgPoints: 487 },
    { rank: 2, region: "경기도", schoolCount: 67, playerCount: 156, topTier: "Radiant", topTierRank: "", avgPoints: 356 },
    { rank: 3, region: "인천광역시", schoolCount: 9, playerCount: 45, topTier: "Immortal", topTierRank: "3", avgPoints: 89 },
    { rank: 4, region: "부산광역시", schoolCount: 29, playerCount: 67, topTier: "Immortal", topTierRank: "2", avgPoints: 78 },
    { rank: 5, region: "대전광역시", schoolCount: 19, playerCount: 34, topTier: "Diamond", topTierRank: "1", avgPoints: 45 },
  ],
};

export function LeaderboardPreview() {
  const router = useRouter();
  const [scope, setScope] = useState<ScopeTab>("school");
  const [gameType, setGameType] = useState<GameType>("lol");

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      {/* Header with scope + game tabs */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {([
            { id: "school" as ScopeTab, label: "🏫 학교 종합" },
            { id: "region" as ScopeTab, label: "📍 지역 종합" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setScope(tab.id)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                scope === tab.id
                  ? "bg-white/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {(["lol", "valorant"] as GameType[]).map((game) => (
            <button
              key={game}
              onClick={() => setGameType(game)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                gameType === game
                  ? "bg-white/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {GAME_LABELS[game]}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        {scope === "school" ? (
          <>
            {/* School Rankings Header */}
            <div className="grid grid-cols-[40px_1fr_80px_60px_140px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>학교</span>
              <span>지역</span>
              <span>참여</span>
              <span className="text-right">평균 티어</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {MOCK_SCHOOLS[gameType].map((entry) => (
                <button
                  key={entry.rank}
                  onClick={() => entry.id ? router.push(`/school/${entry.id}`) : null}
                  className="w-full grid grid-cols-[40px_1fr_80px_60px_140px] gap-2 items-center px-5 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{entry.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{entry.region}</span>
                  <span className="text-xs text-muted-foreground">{entry.memberCount}명</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <TierBadge gameType={gameType} tier={entry.avgTier} rank={entry.avgTierRank} />
                    <span className="text-xs text-muted-foreground/60 shrink-0">
                      {entry.avgPoints}{gameType === "lol" ? "LP" : "RR"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Region Rankings Header */}
            <div className="grid grid-cols-[40px_1fr_60px_60px_140px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>지역</span>
              <span>학교</span>
              <span>참여</span>
              <span className="text-right">최고 티어</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {MOCK_REGIONS[gameType].map((entry) => (
                <button
                  key={entry.rank}
                  onClick={() => router.push(`/region/${encodeURIComponent(entry.region)}`)}
                  className="w-full grid grid-cols-[40px_1fr_60px_60px_140px] gap-2 items-center px-5 py-3 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">{entry.region}</span>
                  <span className="text-xs text-muted-foreground">{entry.schoolCount}개</span>
                  <span className="text-xs text-muted-foreground">{entry.playerCount}명</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <TierBadge gameType={gameType} tier={entry.topTier} rank={entry.topTierRank} />
                    <span className="text-xs text-muted-foreground/60 shrink-0">
                      {entry.avgPoints}{gameType === "lol" ? "LP" : "RR"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 text-center">
          <p className="text-xs text-muted-foreground/60">
            예시 데이터 · 검색해서 랭킹에 등록하세요!
          </p>
        </div>
      </div>
    </div>
  );
}
