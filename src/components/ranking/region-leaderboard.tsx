"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GameType } from "@/types/game";
import { GAME_LABELS, LOL_TIER_KOREAN, VALORANT_TIER_KOREAN } from "@/types/game";

const TIER_COLORS: Record<string, string> = {
  IRON: "#5e5e5e", BRONZE: "#a8713a", SILVER: "#b4b4b4", GOLD: "#e8c252",
  PLATINUM: "#4aa8a0", EMERALD: "#2dce89", DIAMOND: "#b882ff",
  MASTER: "#9d4dff", GRANDMASTER: "#ff4444", CHALLENGER: "#f4c874",
  Iron: "#5e5e5e", Bronze: "#a8713a", Silver: "#b4b4b4", Gold: "#e8c252",
  Platinum: "#4aa8a0", Diamond: "#b882ff", Ascendant: "#2dce89",
  Immortal: "#ff4655", Radiant: "#fffba8",
  UNRANKED: "#888888",
};

const RANK_BADGES = ["👑", "🥈", "🥉"];

type ContentTab = "schools" | "players";

interface SchoolRanking {
  rank: number;
  schoolId: string;
  schoolName: string;
  avgTier: number;
  memberCount: number;
}

interface PlayerRanking {
  rank: number;
  gameAccountId: string;
  gameName: string;
  tagLine: string;
  tier: string;
  tierRank: string;
  points: number;
  tierNumeric: number;
  schoolName: string;
}

interface RegionLeaderboardProps {
  region: string;
}

export function RegionLeaderboard({ region }: RegionLeaderboardProps) {
  const router = useRouter();
  const [gameType, setGameType] = useState<GameType>("lol");
  const [contentTab, setContentTab] = useState<ContentTab>("schools");
  const [schoolRankings, setSchoolRankings] = useState<SchoolRanking[]>([]);
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [totalSchools, setTotalSchools] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchData = useCallback(async (game: GameType, tab: ContentTab, pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(
        `/api/region/${encodeURIComponent(region)}?game=${game}&tab=${tab}&page=${pageNum}&limit=20`
      );
      const data = await res.json();

      if (data.success && data.data) {
        setTotalSchools(data.data.totalSchools);
        setTotalPlayers(data.data.totalPlayers);
        setHasMore(data.data.hasMore);

        if (tab === "schools" && data.data.schoolRankings) {
          setSchoolRankings((prev) =>
            append ? [...prev, ...data.data.schoolRankings] : data.data.schoolRankings
          );
        } else if (tab === "players" && data.data.playerRankings) {
          setPlayerRankings((prev) =>
            append ? [...prev, ...data.data.playerRankings] : data.data.playerRankings
          );
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [region]);

  useEffect(() => {
    setPage(1);
    setSchoolRankings([]);
    setPlayerRankings([]);
    fetchData(gameType, contentTab, 1, false);
  }, [gameType, contentTab, fetchData]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(gameType, contentTab, nextPage, true);
  };

  const getTierDisplay = (tier: string) => {
    if (gameType === "lol") return LOL_TIER_KOREAN[tier] ?? tier;
    return VALORANT_TIER_KOREAN[tier] ?? tier;
  };

  const getTierColor = (tier: string) => TIER_COLORS[tier] ?? "#888";

  // Approximate tier name from avgTier numeric value
  const getAvgTierDisplay = (avgTier: number) => {
    if (gameType === "lol") {
      const tiers = [
        { min: 2800, label: "챌린저" },
        { min: 2600, label: "그랜드마스터" },
        { min: 2400, label: "마스터" },
        { min: 2000, label: "다이아몬드" },
        { min: 1600, label: "에메랄드" },
        { min: 1200, label: "플래티넘" },
        { min: 800, label: "골드" },
        { min: 400, label: "실버" },
        { min: 200, label: "브론즈" },
        { min: 0, label: "아이언" },
      ];
      for (const t of tiers) {
        if (avgTier >= t.min) return t.label;
      }
      return "아이언";
    }
    const tiers = [
      { min: 2400, label: "레디언트" },
      { min: 2100, label: "이모탈" },
      { min: 1800, label: "어센던트" },
      { min: 1500, label: "다이아몬드" },
      { min: 1200, label: "플래티넘" },
      { min: 900, label: "골드" },
      { min: 600, label: "실버" },
      { min: 300, label: "브론즈" },
      { min: 0, label: "아이언" },
    ];
    for (const t of tiers) {
      if (avgTier >= t.min) return t.label;
    }
    return "아이언";
  };

  const getAvgTierColor = (avgTier: number) => {
    if (gameType === "lol") {
      if (avgTier >= 2800) return TIER_COLORS.CHALLENGER;
      if (avgTier >= 2600) return TIER_COLORS.GRANDMASTER;
      if (avgTier >= 2400) return TIER_COLORS.MASTER;
      if (avgTier >= 2000) return TIER_COLORS.DIAMOND;
      if (avgTier >= 1600) return TIER_COLORS.EMERALD;
      if (avgTier >= 1200) return TIER_COLORS.PLATINUM;
      if (avgTier >= 800) return TIER_COLORS.GOLD;
      if (avgTier >= 400) return TIER_COLORS.SILVER;
      if (avgTier >= 200) return TIER_COLORS.BRONZE;
      return TIER_COLORS.IRON;
    }
    if (avgTier >= 2400) return TIER_COLORS.Radiant;
    if (avgTier >= 2100) return TIER_COLORS.Immortal;
    if (avgTier >= 1800) return TIER_COLORS.Ascendant;
    if (avgTier >= 1500) return TIER_COLORS.Diamond;
    if (avgTier >= 1200) return TIER_COLORS.Platinum;
    if (avgTier >= 900) return TIER_COLORS.Gold;
    if (avgTier >= 600) return TIER_COLORS.Silver;
    if (avgTier >= 300) return TIER_COLORS.Bronze;
    return TIER_COLORS.Iron;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold">📍 {region}</h1>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            🏫 {totalSchools}개 학교
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            👥 {totalPlayers}명 플레이어
          </span>
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {([
            { key: "schools" as ContentTab, label: "학교 랭킹" },
            { key: "players" as ContentTab, label: "개인 랭킹" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setContentTab(key)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                contentTab === key
                  ? "bg-white/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Game tabs */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {(["lol", "valorant"] as GameType[]).map((game) => (
            <button
              key={game}
              onClick={() => setGameType(game)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
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

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-0 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0">
              <div className="animate-pulse h-6 w-6 rounded-full bg-white/[0.06]" />
              <div className="animate-pulse h-4 w-36 rounded bg-white/[0.06]" />
              <div className="animate-pulse h-3 w-12 rounded bg-white/[0.06] ml-auto" />
              <div className="animate-pulse h-5 w-20 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && contentTab === "schools" && schoolRankings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🏫</p>
          <p className="text-muted-foreground text-sm">
            아직 {region} 지역에 {GAME_LABELS[gameType]} 등록 학교가 없습니다
          </p>
        </div>
      )}

      {!loading && contentTab === "players" && playerRankings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🎮</p>
          <p className="text-muted-foreground text-sm">
            아직 {region} 지역에 {GAME_LABELS[gameType]} 등록 플레이어가 없습니다
          </p>
        </div>
      )}

      {/* School Rankings */}
      {!loading && contentTab === "schools" && schoolRankings.length > 0 && (
        <>
          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {schoolRankings.slice(0, 3).map((school) => {
              const tierColor = getAvgTierColor(school.avgTier);
              return (
                <button
                  key={school.schoolId}
                  onClick={() => router.push(`/school/${school.schoolId}`)}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 text-center hover:bg-white/[0.06] transition-colors"
                  style={{ boxShadow: `0 0 20px ${tierColor}15` }}
                >
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-20"
                    style={{ backgroundColor: tierColor }}
                  />
                  <div className="relative">
                    <div className="text-2xl mb-1">{RANK_BADGES[school.rank - 1]}</div>
                    <div className="text-sm font-semibold truncate">{school.schoolName}</div>
                    <div className="mt-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                        style={{
                          color: tierColor,
                          backgroundColor: `${tierColor}15`,
                          border: `1px solid ${tierColor}25`,
                        }}
                      >
                        {getAvgTierDisplay(school.avgTier)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {school.memberCount}명
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rest of schools */}
          {schoolRankings.length > 3 && (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <div className="grid grid-cols-[40px_1fr_auto_70px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
                <span>#</span>
                <span>학교</span>
                <span>평균 티어</span>
                <span className="text-right">인원</span>
              </div>
              <div className="divide-y divide-white/5">
                {schoolRankings.slice(3).map((school) => {
                  const tierColor = getAvgTierColor(school.avgTier);
                  return (
                    <button
                      key={school.schoolId}
                      onClick={() => router.push(`/school/${school.schoolId}`)}
                      className="w-full grid grid-cols-[40px_1fr_auto_70px] gap-2 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <span className="text-sm font-bold text-muted-foreground text-center">
                        {school.rank}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {school.schoolName}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block whitespace-nowrap"
                        style={{
                          color: tierColor,
                          backgroundColor: `${tierColor}15`,
                          border: `1px solid ${tierColor}25`,
                        }}
                      >
                        {getAvgTierDisplay(school.avgTier)}
                      </span>
                      <span className="text-xs text-muted-foreground text-right">
                        {school.memberCount}명
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasMore && (
                <div className="px-5 py-3 border-t border-white/5 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "불러오는 중..." : "더 보기"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Load more when 3 or fewer schools but hasMore */}
          {schoolRankings.length <= 3 && hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Player Rankings */}
      {!loading && contentTab === "players" && playerRankings.length > 0 && (
        <>
          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {playerRankings.slice(0, 3).map((entry) => {
              const tierColor = getTierColor(entry.tier);
              return (
                <div
                  key={entry.gameAccountId}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 text-center"
                  style={{ boxShadow: `0 0 20px ${tierColor}15` }}
                >
                  <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-20"
                    style={{ backgroundColor: tierColor }}
                  />
                  <div className="relative">
                    <div className="text-2xl mb-1">{RANK_BADGES[entry.rank - 1]}</div>
                    <div className="text-sm font-semibold truncate">{entry.gameName}</div>
                    <div className="text-xs text-muted-foreground/60 truncate">#{entry.tagLine}</div>
                    {entry.schoolName && (
                      <div className="text-xs text-muted-foreground/40 truncate mt-0.5">{entry.schoolName}</div>
                    )}
                    <div className="mt-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                        style={{
                          color: tierColor,
                          backgroundColor: `${tierColor}15`,
                          border: `1px solid ${tierColor}25`,
                        }}
                      >
                        {getTierDisplay(entry.tier)} {entry.tierRank}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {entry.points}{gameType === "lol" ? "LP" : "RR"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rest of players */}
          {playerRankings.length > 3 && (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <div className="grid grid-cols-[40px_1fr_auto_auto_70px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
                <span>#</span>
                <span>플레이어</span>
                <span>학교</span>
                <span>티어</span>
                <span className="text-right">포인트</span>
              </div>
              <div className="divide-y divide-white/5">
                {playerRankings.slice(3).map((entry) => {
                  const tierColor = getTierColor(entry.tier);
                  return (
                    <div
                      key={entry.gameAccountId}
                      className="grid grid-cols-[40px_1fr_auto_auto_70px] gap-2 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm font-bold text-muted-foreground text-center">
                        {entry.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {entry.gameName}
                          <span className="text-muted-foreground/50 text-xs ml-1">#{entry.tagLine}</span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/60 truncate max-w-[100px]">
                        {entry.schoolName}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block whitespace-nowrap"
                        style={{
                          color: tierColor,
                          backgroundColor: `${tierColor}15`,
                          border: `1px solid ${tierColor}25`,
                        }}
                      >
                        {getTierDisplay(entry.tier)} {entry.tierRank}
                      </span>
                      <span className="text-xs text-muted-foreground text-right">
                        {entry.points}{gameType === "lol" ? "LP" : "RR"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="px-5 py-3 border-t border-white/5 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "불러오는 중..." : "더 보기"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Load more when 3 or fewer players but hasMore */}
          {playerRankings.length <= 3 && hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Total info */}
      {!loading && (totalSchools > 0 || totalPlayers > 0) && (
        <p className="text-center text-xs text-muted-foreground/60">
          {region} 지역 · {totalSchools}개 학교 · {totalPlayers}명의 {GAME_LABELS[gameType]} 플레이어
        </p>
      )}
    </div>
  );
}
