"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

type ScopeTab = "school" | "region";

interface SchoolRankEntry {
  rank: number;
  name: string;
  region: string;
  memberCount: number;
  score: number;
  id?: string;
}

interface RegionRankEntry {
  rank: number;
  region: string;
  schoolCount: number;
  playerCount: number;
  score: number;
}

const RANK_BADGES = ["👑", "🥈", "🥉"];

// 점수 = 티어 가중치 합산 (챌린저=100, 그마=50, 마스터=25, 다이아=12...)
const MOCK_SCHOOLS: Record<GameType, SchoolRankEntry[]> = {
  lol: [
    { rank: 1, name: "인항고등학교", region: "인천광역시", memberCount: 3, score: 205 },
    { rank: 2, name: "마포고등학교", region: "서울특별시", memberCount: 2, score: 112 },
    { rank: 3, name: "가좌고등학교", region: "인천광역시", memberCount: 1, score: 25 },
    { rank: 4, name: "관악고등학교", region: "서울특별시", memberCount: 1, score: 100 },
    { rank: 5, name: "안양공업고등학교", region: "경기도", memberCount: 1, score: 100 },
  ],
  valorant: [
    { rank: 1, name: "안산동산고등학교", region: "경기도", memberCount: 1, score: 5 },
    { rank: 2, name: "인천동산고등학교", region: "인천광역시", memberCount: 1, score: 8 },
    { rank: 3, name: "서울과학고등학교", region: "서울특별시", memberCount: 15, score: 340 },
    { rank: 4, name: "한국디지털미디어고", region: "경기도", memberCount: 22, score: 285 },
    { rank: 5, name: "경기과학고등학교", region: "경기도", memberCount: 8, score: 120 },
  ],
};

const MOCK_REGIONS: Record<GameType, RegionRankEntry[]> = {
  lol: [
    { rank: 1, region: "인천광역시", schoolCount: 2, playerCount: 4, score: 230 },
    { rank: 2, region: "서울특별시", schoolCount: 3, playerCount: 5, score: 237 },
    { rank: 3, region: "경기도", schoolCount: 2, playerCount: 3, score: 126 },
    { rank: 4, region: "강원특별자치도", schoolCount: 1, playerCount: 1, score: 12 },
    { rank: 5, region: "광주광역시", schoolCount: 1, playerCount: 1, score: 100 },
  ],
  valorant: [
    { rank: 1, region: "서울특별시", schoolCount: 1, playerCount: 15, score: 340 },
    { rank: 2, region: "경기도", schoolCount: 2, playerCount: 30, score: 410 },
    { rank: 3, region: "인천광역시", schoolCount: 1, playerCount: 1, score: 8 },
    { rank: 4, region: "부산광역시", schoolCount: 1, playerCount: 5, score: 45 },
    { rank: 5, region: "대전광역시", schoolCount: 1, playerCount: 3, score: 25 },
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
            <div className="grid grid-cols-[40px_1fr_80px_50px_70px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>학교</span>
              <span>지역</span>
              <span>참여</span>
              <span className="text-right">점수</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {MOCK_SCHOOLS[gameType].map((entry) => (
                <button
                  key={entry.rank}
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/org/search?q=${encodeURIComponent(entry.name)}`);
                      const data = await res.json();
                      if (data.success && data.data.length > 0) {
                        router.push(`/school/${data.data[0].id}`);
                      }
                    } catch { /* silent */ }
                  }}
                  className="w-full grid grid-cols-[40px_1fr_80px_50px_70px] gap-2 items-center px-5 py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer text-left group"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate group-hover:text-white transition-colors">{entry.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{entry.region}</span>
                  <span className="text-xs text-muted-foreground">{entry.memberCount}명</span>
                  <span className="text-right text-sm font-bold text-primary">{entry.score.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[40px_1fr_50px_50px_70px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>지역</span>
              <span>학교</span>
              <span>참여</span>
              <span className="text-right">점수</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {MOCK_REGIONS[gameType].map((entry) => (
                <button
                  key={entry.rank}
                  onClick={() => router.push(`/region/${encodeURIComponent(entry.region)}`)}
                  className="w-full grid grid-cols-[40px_1fr_50px_50px_70px] gap-2 items-center px-5 py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer text-left group"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate group-hover:text-white transition-colors">{entry.region}</span>
                  <span className="text-xs text-muted-foreground">{entry.schoolCount}개</span>
                  <span className="text-xs text-muted-foreground">{entry.playerCount}명</span>
                  <span className="text-right text-sm font-bold text-primary">{entry.score.toLocaleString()}</span>
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
