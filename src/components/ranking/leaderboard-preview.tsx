"use client";

import { useState } from "react";
import type { GameType } from "@/types/game";
import { GAME_LABELS, LOL_TIER_KOREAN, VALORANT_TIER_KOREAN } from "@/types/game";

type ScopeTab = "school" | "region";

interface LeaderboardEntry {
  rank: number;
  gameName: string;
  tagLine: string;
  tier: string;
  tierRank: string;
  points: number;
  gameType: GameType;
  label: string; // school name or region
}

const MOCK: Record<ScopeTab, Record<GameType, LeaderboardEntry[]>> = {
  school: {
    lol: [
      { rank: 1, gameName: "Hide on bush", tagLine: "KR1", tier: "CHALLENGER", tierRank: "", points: 1241, gameType: "lol", label: "서울과학고등학교" },
      { rank: 2, gameName: "T1 Gumayusi", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 987, gameType: "lol", label: "서울과학고등학교" },
      { rank: 3, gameName: "Deft", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 845, gameType: "lol", label: "서울과학고등학교" },
      { rank: 4, gameName: "Chovy", tagLine: "KR1", tier: "MASTER", tierRank: "", points: 523, gameType: "lol", label: "한국디지털미디어고" },
      { rank: 5, gameName: "Ruler", tagLine: "KR1", tier: "MASTER", tierRank: "", points: 412, gameType: "lol", label: "한국디지털미디어고" },
    ],
    valorant: [
      { rank: 1, gameName: "MaKo", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 487, gameType: "valorant", label: "서울과학고등학교" },
      { rank: 2, gameName: "Lakia", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 392, gameType: "valorant", label: "서울과학고등학교" },
      { rank: 3, gameName: "Rb", tagLine: "KR1", tier: "Immortal", tierRank: "3", points: 89, gameType: "valorant", label: "한국디지털미디어고" },
      { rank: 4, gameName: "k1Ng", tagLine: "KR1", tier: "Immortal", tierRank: "2", points: 76, gameType: "valorant", label: "한국디지털미디어고" },
      { rank: 5, gameName: "Estrella", tagLine: "KR1", tier: "Immortal", tierRank: "1", points: 52, gameType: "valorant", label: "경기과학고등학교" },
    ],
  },
  region: {
    lol: [
      { rank: 1, gameName: "Hide on bush", tagLine: "KR1", tier: "CHALLENGER", tierRank: "", points: 1241, gameType: "lol", label: "서울특별시" },
      { rank: 2, gameName: "T1 Zeus", tagLine: "KR1", tier: "CHALLENGER", tierRank: "", points: 1102, gameType: "lol", label: "서울특별시" },
      { rank: 3, gameName: "Canyon", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 934, gameType: "lol", label: "경기도" },
      { rank: 4, gameName: "ShowMaker", tagLine: "KR1", tier: "GRANDMASTER", tierRank: "", points: 876, gameType: "lol", label: "부산광역시" },
      { rank: 5, gameName: "Peyz", tagLine: "KR1", tier: "MASTER", tierRank: "", points: 654, gameType: "lol", label: "대구광역시" },
    ],
    valorant: [
      { rank: 1, gameName: "MaKo", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 487, gameType: "valorant", label: "서울특별시" },
      { rank: 2, gameName: "Lakia", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 392, gameType: "valorant", label: "서울특별시" },
      { rank: 3, gameName: "stax", tagLine: "KR1", tier: "Radiant", tierRank: "", points: 356, gameType: "valorant", label: "경기도" },
      { rank: 4, gameName: "Rb", tagLine: "KR1", tier: "Immortal", tierRank: "3", points: 89, gameType: "valorant", label: "인천광역시" },
      { rank: 5, gameName: "BuZz", tagLine: "KR1", tier: "Immortal", tierRank: "2", points: 78, gameType: "valorant", label: "부산광역시" },
    ],
  },
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
  const [scope, setScope] = useState<ScopeTab>("school");
  const [gameType, setGameType] = useState<GameType>("lol");

  const entries = MOCK[scope][gameType];

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      {/* Header with scope + game tabs */}
      <div className="flex items-center justify-between mb-4 px-1">
        {/* Scope tabs: 학교별 / 지역별 */}
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {([
            { id: "school" as ScopeTab, label: "🏫 학교별" },
            { id: "region" as ScopeTab, label: "📍 지역별" },
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

        {/* Game tabs */}
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
        {/* Glass glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Column header */}
        <div className="grid grid-cols-[40px_1fr_auto_80px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
          <span>#</span>
          <span>플레이어</span>
          <span>{scope === "school" ? "학교" : "지역"}</span>
          <span className="text-right">티어</span>
        </div>

        {/* Entries */}
        <div className="divide-y divide-white/5 relative">
          {entries.map((entry) => {
            const tierColor = TIER_COLORS[entry.tier] ?? "#888";
            const tierKorean = gameType === "lol"
              ? LOL_TIER_KOREAN[entry.tier] ?? entry.tier
              : VALORANT_TIER_KOREAN[entry.tier] ?? entry.tier;

            return (
              <div
                key={entry.rank}
                className="grid grid-cols-[40px_1fr_auto_80px] gap-2 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Rank */}
                <div className="text-center">
                  {entry.rank <= 3 ? (
                    <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                  )}
                </div>

                {/* Player */}
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {entry.gameName}
                    <span className="text-muted-foreground/50 text-xs ml-1">#{entry.tagLine}</span>
                  </span>
                </div>

                {/* School / Region */}
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-white/5 whitespace-nowrap">
                  {entry.label}
                </span>

                {/* Tier */}
                <div className="text-right">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                    style={{
                      color: tierColor,
                      backgroundColor: `${tierColor}15`,
                      border: `1px solid ${tierColor}25`,
                    }}
                  >
                    {tierKorean} {entry.tierRank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

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
