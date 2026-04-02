"use client";

import { useState, useEffect } from "react";
import type { GameType } from "@/types/game";
import { GAME_LABELS, LOL_TIER_KOREAN, VALORANT_TIER_KOREAN } from "@/types/game";

interface LeaderboardEntry {
  rank: number;
  gameName: string;
  tagLine: string;
  tier: string;
  tierRank: string;
  points: number;
  gameType: GameType;
  organizationName: string;
}

// Mock data for preview (will be replaced with real API data when users register)
const MOCK_DATA: Record<GameType, LeaderboardEntry[]> = {
  lol: [
    { rank: 1, gameName: "Hide on bush", tagLine: "KR1", tier: "CHALLENGER", tierRank: "", points: 1241, gameType: "lol", organizationName: "서울과학고등학교" },
    { rank: 2, gameName: "T1 Gumayusi", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 987, gameType: "lol", organizationName: "서울과학고등학교" },
    { rank: 3, gameName: "Deft", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 845, gameType: "lol", organizationName: "서울과학고등학교" },
    { rank: 4, gameName: "Chovy", tagLine: "KR1", tier: "MASTER", tierRank: "", points: 523, gameType: "lol", organizationName: "서울과학고등학교" },
    { rank: 5, gameName: "Ruler", tagLine: "KR1", tier: "MASTER", tierRank: "", points: 412, gameType: "lol", organizationName: "서울과학고등학교" },
  ],
  valorant: [
    { rank: 1, gameName: "MaKo", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 487, gameType: "valorant", organizationName: "서울과학고등학교" },
    { rank: 2, gameName: "Lakia", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 392, gameType: "valorant", organizationName: "서울과학고등학교" },
    { rank: 3, gameName: "Rb", tagLine: "KR1", tier: "Immortal", tierRank: "3", points: 89, gameType: "valorant", organizationName: "서울과학고등학교" },
    { rank: 4, gameName: "k1Ng", tagLine: "KR1", tier: "Immortal", tierRank: "2", points: 76, gameType: "valorant", organizationName: "서울과학고등학교" },
    { rank: 5, gameName: "Estrella", tagLine: "KR1", tier: "Immortal", tierRank: "1", points: 52, gameType: "valorant", organizationName: "서울과학고등학교" },
  ],
};

const TIER_COLORS: Record<string, string> = {
  IRON: "#5e5e5e", BRONZE: "#a8713a", SILVER: "#b4b4b4", GOLD: "#e8c252",
  PLATINUM: "#4aa8a0", EMERALD: "#2dce89", DIAMOND: "#b882ff",
  MASTER: "#9d4dff", GRANDMASTER: "#ff4444", CHALLENGER: "#f4c874",
  Iron: "#5e5e5e", Bronze: "#a8713a", Silver: "#b4b4b4", Gold: "#e8c252",
  Platinum: "#4aa8a0", Diamond: "#b882ff", Ascendant: "#2dce89",
  Immortal: "#ff4655", Radiant: "#fffba8",
};

const RANK_BADGES = ["👑", "🥈", "🥉"];

export function LeaderboardPreview() {
  const [gameType, setGameType] = useState<GameType>("lol");
  const [entries, setEntries] = useState<LeaderboardEntry[]>(MOCK_DATA.lol);

  useEffect(() => {
    setEntries(MOCK_DATA[gameType]);
  }, [gameType]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold text-foreground/90">
          🏆 학교 랭킹
        </h2>
        {/* Game Toggle */}
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
        {/* Glass glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        {/* School label */}
        <div className="px-5 pt-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏫</span>
            <span className="text-sm text-muted-foreground">서울과학고등학교</span>
            <span className="text-xs text-muted-foreground/60 ml-auto">예시 데이터</span>
          </div>
        </div>

        {/* Entries */}
        <div className="divide-y divide-white/5">
          {entries.map((entry) => {
            const tierColor = TIER_COLORS[entry.tier] ?? "#888";
            const tierKorean = gameType === "lol"
              ? LOL_TIER_KOREAN[entry.tier] ?? entry.tier
              : VALORANT_TIER_KOREAN[entry.tier] ?? entry.tier;

            return (
              <div
                key={entry.rank}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {entry.rank <= 3 ? (
                    <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {entry.gameName}
                    <span className="text-muted-foreground/60 text-xs ml-1">
                      #{entry.tagLine}
                    </span>
                  </div>
                </div>

                {/* Tier badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{
                    color: tierColor,
                    backgroundColor: `${tierColor}15`,
                    border: `1px solid ${tierColor}25`,
                  }}
                >
                  {tierKorean} {entry.tierRank}
                </div>

                {/* Points */}
                <div className="text-xs text-muted-foreground w-16 text-right">
                  {entry.points}{gameType === "lol" ? "LP" : "RR"}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 border-t border-white/5 text-center">
          <p className="text-xs text-muted-foreground">
            위에서 검색하고 우리 학교 랭킹에 등록하세요!
          </p>
        </div>
      </div>

      {/* Region Rankings Teaser */}
      <div className="mt-6 relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 text-center">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <p className="text-sm text-muted-foreground mb-1 relative">📍 지역 랭킹</p>
        <p className="text-2xl font-bold relative">
          서울 · 경기 · 부산 · 대구 ...
        </p>
        <p className="text-xs text-muted-foreground mt-2 relative">
          우리 지역에서 몇 등인지도 곧 확인할 수 있어요
        </p>
        <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground relative">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
