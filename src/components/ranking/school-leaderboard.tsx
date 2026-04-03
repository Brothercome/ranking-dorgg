"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";
import { TierBadge } from "./tier-badge";

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

interface LeaderboardEntry {
  rank: number;
  gameAccountId: string;
  gameName: string;
  tagLine: string;
  tier: string;
  tierRank: string;
  points: number;
  tierNumeric: number;
  isCelebrity?: boolean;
  celebrityName?: string | null;
  celebrityCategory?: string | null;
}

interface RegionRanking {
  rank: number;
  total: number;
  region: string;
}

interface SchoolLeaderboardProps {
  schoolId: string;
  schoolName: string;
  schoolLevel: string | null;
  regionSido: string | null;
  regionSigungu: string | null;
  memberCount: number;
}

export function SchoolLeaderboard({
  schoolId,
  schoolName,
  schoolLevel,
  regionSido,
  regionSigungu,
  memberCount,
}: SchoolLeaderboardProps) {
  const [gameType, setGameType] = useState<GameType>("lol");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [schoolScore, setSchoolScore] = useState(0);
  const [regionRanking, setRegionRanking] = useState<RegionRanking | null>(null);

  const fetchLeaderboard = useCallback(async (gameParam: GameType, pageParam: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(
        `/api/school/${schoolId}?game=${gameParam}&page=${pageParam}&limit=20`
      );
      const data = await res.json();

      if (data.success && data.data) {
        const newEntries = data.data.leaderboard as LeaderboardEntry[];
        setEntries((prev) => append ? [...prev, ...newEntries] : newEntries);
        setHasMore(data.data.hasMore);
        setTotalMembers(data.data.totalMembers);
        setSchoolScore(data.data.schoolScore ?? 0);
        setRegionRanking(data.data.regionRanking);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [schoolId]);

  useEffect(() => {
    setPage(1);
    fetchLeaderboard(gameType, 1, false);
  }, [gameType, fetchLeaderboard]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeaderboard(gameType, nextPage, true);
  };

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const getTierColor = (tier: string) => TIER_COLORS[tier] ?? "#888";

  const levelLabel: Record<string, string> = {
    middle: "중학교",
    high: "고등학교",
    university: "대학교",
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold">{schoolName}</h1>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {regionSido && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              📍 {regionSido}{regionSigungu ? ` ${regionSigungu}` : ""}
            </span>
          )}
          {schoolLevel && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
              🏫 {levelLabel[schoolLevel] ?? schoolLevel}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            👥 {memberCount}명 등록
          </span>
        </div>
        {!loading && schoolScore > 0 && (
          <div className="mt-2">
            <span className="text-3xl font-bold text-primary">{schoolScore.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground ml-1">점</span>
          </div>
        )}
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

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-3xl mb-3 animate-bounce">🎮</div>
          <p className="text-sm text-muted-foreground animate-pulse">랭킹 불러오는 중...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🏫</p>
          <p className="text-muted-foreground text-sm">
            아직 {GAME_LABELS[gameType]} 등록자가 없습니다
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            게임 아이디를 검색해서 첫 번째로 등록하세요!
          </p>
        </div>
      )}

      {/* Top 3 Grid */}
      {!loading && top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {top3.map((entry) => {
            const tierColor = getTierColor(entry.tier);
            return (
              <div
                key={entry.gameAccountId}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 text-center"
                style={{
                  boxShadow: `0 0 20px ${tierColor}15`,
                }}
              >
                {/* Glow */}
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-20"
                  style={{ backgroundColor: tierColor }}
                />
                <div className="relative">
                  <div className="text-2xl mb-1">{RANK_BADGES[entry.rank - 1]}</div>
                  <div className="text-sm font-semibold truncate">
                    {entry.gameName}
                    {entry.isCelebrity && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 align-middle">
                        {entry.celebrityCategory === "현역" ? "PRO" : entry.celebrityCategory === "크리에이터" ? "BJ" : "PRO"}
                      </span>
                    )}
                  </div>
                  {entry.isCelebrity && entry.celebrityName ? (
                    <div className="text-xs text-yellow-400/70 truncate">{entry.celebrityName}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground/60 truncate">#{entry.tagLine}</div>
                  )}
                  <div className="mt-2">
                    <TierBadge gameType={gameType} tier={entry.tier} rank={entry.tierRank} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.points}{gameType === "lol" ? "LP" : "RR"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard List (rank 4+) */}
      {!loading && rest.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          {/* Column header */}
          <div className="grid grid-cols-[40px_1fr_auto_70px] gap-2 px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
            <span>#</span>
            <span>플레이어</span>
            <span>티어</span>
            <span className="text-right">포인트</span>
          </div>

          <div className="divide-y divide-white/5">
            {rest.map((entry) => {
              const tierColor = getTierColor(entry.tier);
              return (
                <div
                  key={entry.gameAccountId}
                  className="grid grid-cols-[40px_1fr_auto_70px] gap-2 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-bold text-muted-foreground text-center">
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {entry.gameName}
                      {entry.isCelebrity ? (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">PRO</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs ml-1">#{entry.tagLine}</span>
                      )}
                    </span>
                    {entry.isCelebrity && entry.celebrityName && (
                      <span className="text-xs text-yellow-400/70 truncate block">{entry.celebrityName}</span>
                    )}
                  </div>
                  <TierBadge gameType={gameType} tier={entry.tier} rank={entry.tierRank} />
                  <span className="text-xs text-muted-foreground text-right">
                    {entry.points}{gameType === "lol" ? "LP" : "RR"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Load more */}
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

      {/* Total members info */}
      {!loading && totalMembers > 0 && (
        <p className="text-center text-xs text-muted-foreground/60">
          총 {totalMembers}명의 {GAME_LABELS[gameType]} 플레이어
        </p>
      )}

      {/* Region Ranking */}
      {!loading && regionRanking && (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 text-center">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative">
            <p className="text-xs text-muted-foreground/60 mb-1">지역 학교 랭킹</p>
            <p className="text-lg font-bold">
              <span className="text-blue-400">{regionRanking.region}</span>에서{" "}
              <span className="text-primary">{regionRanking.rank}등</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {regionRanking.region} 내 {regionRanking.total}개 학교 중
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
