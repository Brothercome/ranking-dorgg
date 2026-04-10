"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";
import { LOL_TIER_KOREAN, LOL_TIER_ICONS } from "@/types/game";
import Image from "next/image";
import Link from "next/link";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";
import { schoolHref } from "@/lib/seo/school-url";

interface SchoolResult {
  id: string;
  name: string;
  level: string;
  region: string;
  memberCount: number;
}

interface PlayerResult {
  gameAccountId: string;
  gameName: string;
  tagLine: string;
  tier: string;
  rank: string;
  points: number;
  wins: number;
  losses: number;
  gameType: GameType;
  profileIconUrl?: string;
}

function PlayerCard({ player }: { player: PlayerResult }) {
  const tierIcon = player.tier !== "UNRANKED" ? LOL_TIER_ICONS[player.tier] : null;
  const tierName = player.tier !== "UNRANKED" ? (LOL_TIER_KOREAN[player.tier] ?? player.tier) : "언랭";
  const total = player.wins + player.losses;
  const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;

  return (
    <Link
      href={`/player/${encodeURIComponent(player.gameName)}-${encodeURIComponent(player.tagLine)}`}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors"
    >
      {player.profileIconUrl && (
        <Image
          src={player.profileIconUrl}
          alt="프로필"
          width={48}
          height={48}
          className="rounded-lg border border-white/10 shrink-0"
          unoptimized
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {player.gameName}
          <span className="text-muted-foreground font-normal">#{player.tagLine}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {tierIcon && <Image src={tierIcon} alt={tierName} width={20} height={20} unoptimized />}
          <span className="text-sm text-muted-foreground">
            {tierName} {player.rank}
          </span>
          {player.tier !== "UNRANKED" && (
            <span className="text-xs text-muted-foreground/50">{player.points} LP</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">{GAME_LABELS[player.gameType]}</div>
        {total > 0 && (
          <div className="text-xs text-muted-foreground/60 mt-0.5">
            {player.wins}승 {player.losses}패
            <span className={`ml-1 font-medium ${winRate >= 50 ? "text-blue-400" : "text-red-400"}`}>{winRate}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function SchoolCard({ school }: { school: SchoolResult }) {
  const levelLabel = school.level === "high" ? "고등학교" : school.level === "middle" ? "중학교" : school.level === "university" ? "대학교" : "";
  return (
    <Link
      href={schoolHref(school.name)}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{school.name}</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {school.region} {levelLabel}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">{school.memberCount}명 참여</div>
      </div>
    </Link>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[76px] rounded-xl bg-white/[0.03] border border-white/5" />
      ))}
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);

    const schoolPromise = fetch(`/api/org/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => (data.success ? data.data : []))
      .catch(() => []);

    const hasHash = query.includes("#");
    let playerPromise: Promise<PlayerResult[]>;

    if (hasHash) {
      // Exact search: name#tag via Riot API (live)
      const gameName = query.split("#")[0].trim();
      const tagLine = query.split("#")[1]?.trim() || "kr1";

      playerPromise = Promise.allSettled([
        fetch("/api/search/lol", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameName, tagLine }),
        }).then((r) => r.json()),
        fetch("/api/search/valorant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameName, tagLine }),
        }).then((r) => r.json()),
      ]).then((results) =>
        results
          .filter((r): r is PromiseFulfilledResult<{ success: boolean; data: PlayerResult }> =>
            r.status === "fulfilled" && r.value.success
          )
          .map((r) => r.value.data)
      );
    } else {
      // Name-only search: query cached players in our DB
      playerPromise = fetch(`/api/search/players?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => (data.success ? data.data : []))
        .catch(() => []);
    }

    const [schoolResults, playerResults] = await Promise.all([schoolPromise, playerPromise]);

    setSchools(schoolResults);
    setPlayers(playerResults);
    setLoading(false);
    setSearched(true);
  }, []);

  useEffect(() => {
    if (q) doSearch(q);
  }, [q, doSearch]);

  // If no query, redirect to home
  if (!q) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">검색어를 입력해주세요</p>
        <Link href="/" className="text-sm text-primary hover:underline mt-2 inline-block">홈으로</Link>
      </div>
    );
  }

  const noResults = searched && players.length === 0 && schools.length === 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold">
        <span className="text-muted-foreground font-normal">검색 결과: </span>
        {q}
      </h1>

      {loading && <ResultSkeleton />}

      {/* Players */}
      {players.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            플레이어 <span className="text-muted-foreground/50">({players.length})</span>
          </h2>
          <div className="space-y-2">
            {players.map((p) => (
              <PlayerCard key={`${p.gameType}-${p.gameAccountId}`} player={p} />
            ))}
          </div>
        </div>
      )}

      {/* Schools */}
      {schools.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            학교 <span className="text-muted-foreground/50">({schools.length})</span>
          </h2>
          <div className="space-y-2">
            {schools.map((s) => (
              <SchoolCard key={s.id} school={s} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">검색 결과가 없습니다</p>
          <p className="text-sm text-muted-foreground/50 mt-1">닉네임#태그 형식으로 검색해보세요</p>
        </div>
      )}

      {/* dor.gg CTA */}
      {searched && !loading && (
        <DorggCtaBanner placement="search_results" />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <Suspense fallback={<ResultSkeleton />}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
