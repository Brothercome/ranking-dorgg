"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

type ScopeTab = "school" | "region";

interface SchoolRankEntry {
  rank: number;
  id: string;
  name: string;
  region: string | null;
  memberCount: number;
  score: number;
}

interface RegionRankEntry {
  rank: number;
  region: string;
  schoolCount: number;
  playerCount: number;
  score: number;
}

const RANK_BADGES = ["👑", "🥈", "🥉"];
const PAGE_SIZE = 10;

export function LeaderboardPreview() {
  const router = useRouter();
  const [scope, setScope] = useState<ScopeTab>("school");
  const [gameType, setGameType] = useState<GameType>("lol");
  const [schools, setSchools] = useState<SchoolRankEntry[]>([]);
  const [regions, setRegions] = useState<RegionRankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [gameType, scope]);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?game=${gameType}&scope=${scope}&limit=${PAGE_SIZE}&page=${page}`);
        const data = await res.json();
        if (data.success) {
          if (scope === "school") {
            setSchools(data.data);
          } else {
            setRegions(data.data);
          }
          setTotal(data.total ?? 0);
          setHasMore(data.hasMore ?? false);
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [gameType, scope, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 sm:mt-12">
      {/* Header with scope + game tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4 px-1">
        <div className="flex gap-1 bg-white/5 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
          {([
            { id: "school" as ScopeTab, label: "🏫 학교" },
            { id: "region" as ScopeTab, label: "📍 지역" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setScope(tab.id)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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

        {loading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="animate-pulse h-6 w-6 rounded-full bg-white/[0.06]" />
                <div className="animate-pulse h-4 w-32 rounded bg-white/[0.06]" />
                <div className="ml-auto animate-pulse h-4 w-16 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : scope === "school" ? (
          <>
            <div className="grid grid-cols-[32px_1fr_50px_70px] sm:grid-cols-[40px_1fr_80px_50px_70px] gap-2 px-3 sm:px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>학교</span>
              <span className="hidden sm:inline">지역</span>
              <span>참여</span>
              <span className="text-right">점수</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {schools.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/school/${entry.id}`)}
                  className="w-full grid grid-cols-[32px_1fr_50px_70px] sm:grid-cols-[40px_1fr_80px_50px_70px] gap-2 items-center px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer text-left group"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium truncate">{entry.name}</span>
                    <span className="block sm:hidden text-[10px] text-muted-foreground/70 truncate">{entry.region ?? "-"}</span>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground truncate">{entry.region ?? "-"}</span>
                  <span className="text-xs text-muted-foreground text-right sm:text-left">{entry.memberCount}명</span>
                  <span className="text-right text-sm font-bold text-primary">{entry.score.toLocaleString()}</span>
                </button>
              ))}
              {schools.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">등록된 학교가 없습니다</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[32px_1fr_50px_70px] sm:grid-cols-[40px_1fr_50px_50px_70px] gap-2 px-3 sm:px-5 py-2.5 border-b border-white/5 text-xs text-muted-foreground/60">
              <span>#</span>
              <span>지역</span>
              <span className="hidden sm:inline">학교</span>
              <span>참여</span>
              <span className="text-right">점수</span>
            </div>

            <div className="divide-y divide-white/5 relative">
              {regions.map((entry) => (
                <button
                  key={entry.region}
                  onClick={() => router.push(`/region/${encodeURIComponent(entry.region)}`)}
                  className="w-full grid grid-cols-[32px_1fr_50px_70px] sm:grid-cols-[40px_1fr_50px_50px_70px] gap-2 items-center px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer text-left group"
                >
                  <div className="text-center">
                    {entry.rank <= 3 ? (
                      <span className="text-lg">{RANK_BADGES[entry.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium truncate">{entry.region}</span>
                    <span className="block sm:hidden text-[10px] text-muted-foreground/70 truncate">{entry.schoolCount}개 학교</span>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground">{entry.schoolCount}개</span>
                  <span className="text-xs text-muted-foreground text-right sm:text-left">{entry.playerCount}명</span>
                  <span className="text-right text-sm font-bold text-primary">{entry.score.toLocaleString()}</span>
                </button>
              ))}
              {regions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">등록된 지역이 없습니다</div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 이전
            </button>
            <span className="text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음 →
            </button>
          </div>
        )}

        {/* Footer (only if single page) */}
        {totalPages <= 1 && (
          <div className="px-5 py-3 border-t border-white/5 text-center">
            <p className="text-xs text-muted-foreground/60">
              검색해서 랭킹에 등록하세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
