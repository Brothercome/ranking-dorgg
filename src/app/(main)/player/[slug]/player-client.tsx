"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { GameProfile, MatchHistory, GameType } from "@/types/game";
import {
  LOL_TIER_KOREAN,
  LOL_TIER_ICONS,
  VALORANT_TIER_KOREAN,
  VALORANT_TIER_ICONS,
  GAME_LABELS,
} from "@/types/game";
import Image from "next/image";
import Link from "next/link";
import { SchoolRegisterModal } from "@/components/ranking/school-register-modal";
import { ShareButtons } from "@/components/share/share-buttons";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";
import type { RankEntry } from "@/types/ranking";
import { schoolHref } from "@/lib/seo/school-url";

// --- Helpers ---

function getTierKorean(gameType: GameType, tier: string): string {
  if (tier === "UNRANKED" || tier === "Unranked") return "언랭";
  return gameType === "lol"
    ? LOL_TIER_KOREAN[tier] ?? tier
    : VALORANT_TIER_KOREAN[tier] ?? tier;
}

function getTierIcon(gameType: GameType, tier: string): string | null {
  if (tier === "UNRANKED" || tier === "Unranked") return null;
  return gameType === "lol"
    ? LOL_TIER_ICONS[tier] ?? null
    : VALORANT_TIER_ICONS[tier] ?? null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function KDAText({ kills, deaths, assists }: { kills: number; deaths: number; assists: number }) {
  const kda = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);
  const kdaNum = deaths === 0 ? 99 : (kills + assists) / deaths;
  const color =
    kdaNum >= 5 ? "text-orange-400" :
    kdaNum >= 3 ? "text-blue-400" :
    kdaNum >= 2 ? "text-green-400" : "text-muted-foreground";
  return <span className={`text-xs font-semibold ${color}`}>{kda} KDA</span>;
}

// --- Refresh Button ---

const REFRESH_COOLDOWN_MS = 30 * 60 * 1000; // 30분

function RefreshButton({
  lastUpdatedAt,
  onRefresh,
  refreshing,
}: {
  lastUpdatedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  // Tick every second while cooldown is active
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const elapsed = Date.now() - new Date(lastUpdatedAt).getTime();
    if (elapsed >= REFRESH_COOLDOWN_MS) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt, now]);

  const elapsed = lastUpdatedAt ? now - new Date(lastUpdatedAt).getTime() : Infinity;
  const canRefresh = elapsed >= REFRESH_COOLDOWN_MS;
  const remainingMs = Math.max(0, REFRESH_COOLDOWN_MS - elapsed);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  return (
    <button
      onClick={onRefresh}
      disabled={!canRefresh || refreshing}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        canRefresh && !refreshing
          ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
          : "bg-white/[0.03] border border-white/10 text-muted-foreground/50 cursor-not-allowed"
      }`}
    >
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className={refreshing ? "animate-spin" : ""}
      >
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
      </svg>
      {refreshing
        ? "갱신 중..."
        : canRefresh
        ? "전적 갱신"
        : `${remainingMin > 0 ? `${remainingMin}분 ` : ""}${remainingSec}초 후`}
    </button>
  );
}

// --- Components ---

function RankCard({
  profile,
  lastUpdatedAt,
  onRefresh,
  refreshing,
}: {
  profile: GameProfile;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const tierIcon = getTierIcon(profile.gameType, profile.tier);
  const tierName = getTierKorean(profile.gameType, profile.tier);
  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
  const isUnranked = profile.tier === "UNRANKED" || profile.tier === "Unranked";

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground/60 font-medium">개인/2인 랭크</div>
        <RefreshButton lastUpdatedAt={lastUpdatedAt} onRefresh={onRefresh} refreshing={refreshing} />
      </div>
      <div className="flex items-center gap-5">
        {/* Tier Emblem - large */}
        <div className="shrink-0">
          {tierIcon ? (
            <Image src={tierIcon} alt={tierName} width={72} height={72} unoptimized />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-white/[0.05] flex items-center justify-center text-muted-foreground/30 text-2xl">?</div>
          )}
        </div>

        {/* Tier Info */}
        <div className="flex-1 min-w-0">
          {isUnranked ? (
            <div className="text-lg font-semibold text-muted-foreground/50">Unranked</div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {tierName} {profile.rank}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {profile.points} LP
              </div>
            </>
          )}
          {totalGames > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm">
                {profile.wins}승 {profile.losses}패
              </span>
              <span className={`text-sm font-semibold ${winRate >= 50 ? "text-blue-400" : "text-red-400"}`}>
                승률 {winRate}%
              </span>
            </div>
          )}
        </div>

        {/* Win rate ring */}
        {totalGames > 0 && (
          <div className="shrink-0 hidden sm:block">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={winRate >= 50 ? "text-blue-500" : "text-red-500"}
                strokeDasharray={`${(winRate / 100) * 150.8} 150.8`}
                transform="rotate(-90 28 28)"
              />
              <text x="28" y="30" textAnchor="middle" className="fill-current text-[11px] font-bold">{winRate}%</text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: MatchHistory }) {
  const isWin = match.result === "win";
  const { player } = match;

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${
        isWin
          ? "bg-blue-500/[0.04] border-blue-500/20"
          : "bg-red-500/[0.04] border-red-500/20"
      }`}
    >
      {/* Result bar */}
      <div className={`w-1 h-12 rounded-full shrink-0 ${isWin ? "bg-blue-500" : "bg-red-500"}`} />

      {/* Champion / Agent icon */}
      {player.champion && (
        <Image
          src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${player.champion}.png`}
          alt={player.champion}
          width={40}
          height={40}
          className="rounded-lg shrink-0"
          unoptimized
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${isWin ? "text-blue-400" : "text-red-400"}`}>
            {isWin ? "승리" : "패배"}
          </span>
          <span className="text-xs text-muted-foreground">{match.queueType}</span>
          <span className="text-xs text-muted-foreground">{formatDuration(match.gameDuration)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium">
            {player.kills}/{player.deaths}/{player.assists}
          </span>
          <KDAText kills={player.kills} deaths={player.deaths} assists={player.assists} />
        </div>
        {player.items && player.items.length > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            {player.items.map((itemId, i) => (
              <Image
                key={i}
                src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`}
                alt={`item ${itemId}`}
                width={20}
                height={20}
                className="rounded"
                unoptimized
              />
            ))}
          </div>
        )}
      </div>

      {/* CS & Damage */}
      <div className="text-right shrink-0 hidden sm:block">
        {player.cs !== undefined && (
          <div className="text-xs text-muted-foreground">CS {player.cs}</div>
        )}
        {player.damage !== undefined && (
          <div className="text-xs text-muted-foreground">
            {player.damage.toLocaleString()} DMG
          </div>
        )}
      </div>

      {/* Time ago */}
      <div className="text-xs text-muted-foreground/50 shrink-0 text-right">
        {formatTimeAgo(match.playedAt)}
      </div>
    </div>
  );
}

// --- Skeletons ---

function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-white/[0.06]" />
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 h-[120px]" />
    </div>
  );
}

function MatchSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[68px] rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
      ))}
    </div>
  );
}

// --- School Ranking ---

interface SchoolRankInfo {
  organizationId: string;
  organizationName: string;
  schoolLevel: string | null;
  region: string | null;
  myRank: number | null;
  totalParticipants: number;
}

function SchoolRankBadge({
  ranks,
  onRegisterClick,
}: {
  ranks: SchoolRankInfo[];
  gameType: GameType;
  onRegisterClick: () => void;
}) {
  if (ranks.length === 0) {
    return (
      <button
        onClick={onRegisterClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/[0.06] to-purple-500/[0.06] hover:border-blue-500/50 hover:from-blue-500/[0.10] hover:to-purple-500/[0.10] transition-all text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 text-lg shrink-0">
          🏫
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">내 학교 등록하고 등수 보기</div>
          <div className="text-xs text-muted-foreground/70">등록하면 학교 친구들 중 내 랭킹이 바로 떠요</div>
        </div>
        <span className="text-xs font-bold text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
          등록 →
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {ranks.map((r) => {
        const pct = r.totalParticipants > 0 && r.myRank
          ? Math.round((r.myRank / r.totalParticipants) * 100)
          : null;
        const isTop3 = r.myRank !== null && r.myRank <= 3;
        const isTop10Pct = pct !== null && pct <= 10;
        const crown = r.myRank === 1 ? "👑" : r.myRank === 2 ? "🥈" : r.myRank === 3 ? "🥉" : null;
        const badgeBg = isTop3
          ? "bg-gradient-to-br from-yellow-400/30 to-orange-500/20 ring-2 ring-yellow-400/50"
          : isTop10Pct
          ? "bg-gradient-to-br from-orange-400/25 to-pink-500/20 ring-1 ring-orange-400/40"
          : "bg-gradient-to-br from-blue-500/20 to-purple-500/20";
        const containerGlow = isTop3
          ? "bg-gradient-to-r from-yellow-500/[0.08] to-orange-500/[0.05] border-yellow-400/30 hover:border-yellow-400/50"
          : isTop10Pct
          ? "bg-gradient-to-r from-orange-500/[0.06] to-pink-500/[0.04] border-orange-400/25 hover:border-orange-400/40"
          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.05]";
        return (
          <Link
            key={r.organizationId}
            href={schoolHref(r.organizationName)}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${containerGlow}`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${badgeBg}`}>
              {crown ? (
                <span className="text-xl">{crown}</span>
              ) : (
                <span className="text-lg font-bold text-blue-300">
                  {r.myRank ?? "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                {r.organizationName}
                {isTop3 && <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-1.5 py-0.5">TOP {r.myRank}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {r.region && <span>{r.region} </span>}
                {r.schoolLevel && <span>{r.schoolLevel === "high" ? "고등학교" : r.schoolLevel === "middle" ? "중학교" : "대학교"}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              {r.myRank && (
                <div className="text-sm font-semibold">{r.myRank}등 <span className="text-muted-foreground font-normal">/ {r.totalParticipants}명</span></div>
              )}
              {pct !== null && (
                <div className={`text-xs font-bold ${pct <= 10 ? "text-orange-300" : pct <= 30 ? "text-blue-400" : "text-muted-foreground"}`}>
                  {pct <= 10 ? "🔥 " : ""}상위 {pct}%
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// --- Game Tab Data ---

interface GameData {
  profile: (GameProfile & { gameAccountId?: string }) | null;
  matches: MatchHistory[];
  loadingProfile: boolean;
  loadingMatches: boolean;
  lastUpdatedAt: string | null;
  refreshing: boolean;
}

const GAMES: GameType[] = ["lol", "valorant"];

// --- Page ---

export default function PlayerPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug as string);
  // Parse "강타갭-KR1" → name="강타갭", tag="KR1"
  const lastDash = slug.lastIndexOf("-");
  const name = lastDash > 0 ? slug.slice(0, lastDash) : slug;
  const tag = lastDash > 0 ? slug.slice(lastDash + 1) : "kr1";

  const [activeTab, setActiveTab] = useState<GameType>("lol");
  const [gameData, setGameData] = useState<Record<GameType, GameData>>({
    lol: { profile: null, matches: [], loadingProfile: true, loadingMatches: false, lastUpdatedAt: null, refreshing: false },
    valorant: { profile: null, matches: [], loadingProfile: true, loadingMatches: false, lastUpdatedAt: null, refreshing: false },
  });
  const [matchesFetched, setMatchesFetched] = useState<Record<GameType, boolean>>({
    lol: false,
    valorant: false,
  });
  const [schoolRanks, setSchoolRanks] = useState<SchoolRankInfo[]>([]);
  const [schoolRankLoading, setSchoolRankLoading] = useState(false);
  const [schoolRankFetched, setSchoolRankFetched] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fetch both profiles in parallel
  useEffect(() => {
    async function fetchProfile(game: GameType) {
      try {
        const res = await fetch(`/api/search/${game}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameName: name, tagLine: tag }),
        });
        const data = await res.json();
        if (data.success) {
          setGameData((prev) => ({
            ...prev,
            [game]: {
              ...prev[game],
              profile: data.data,
              lastUpdatedAt: data.data.lastUpdatedAt ?? null,
              loadingProfile: false,
            },
          }));
          return;
        }
      } catch {
        // silent
      }
      setGameData((prev) => ({
        ...prev,
        [game]: { ...prev[game], loadingProfile: false },
      }));
    }

    fetchProfile("lol");
    fetchProfile("valorant");
  }, [name, tag]);

  // Fetch matches for active tab (lazy)
  useEffect(() => {
    const current = gameData[activeTab];
    if (!current.profile || matchesFetched[activeTab]) return;

    async function fetchMatches() {
      const profile = gameData[activeTab].profile!;
      setGameData((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], loadingMatches: true },
      }));
      try {
        const res = await fetch(`/api/matches/${activeTab}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puuid: profile.puuid,
            gameName: profile.gameName,
            tagLine: profile.tagLine,
            count: 10,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setGameData((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], matches: data.data, loadingMatches: false },
          }));
          setMatchesFetched((prev) => ({ ...prev, [activeTab]: true }));
          return;
        }
      } catch {
        // silent
      }
      setGameData((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], loadingMatches: false },
      }));
      setMatchesFetched((prev) => ({ ...prev, [activeTab]: true }));
    }

    fetchMatches();
  }, [activeTab, gameData, matchesFetched]);

  // Fetch school ranking for active tab
  useEffect(() => {
    const current = gameData[activeTab];
    if (!current.profile || schoolRankFetched) return;

    async function fetchSchoolRank() {
      setSchoolRankLoading(true);
      try {
        const profile = gameData[activeTab].profile!;
        const params = new URLSearchParams({
          gameType: activeTab,
          gameName: profile.gameName,
          tagLine: profile.tagLine,
        });
        const res = await fetch(`/api/player/school-rank?${params}`);
        const data = await res.json();
        if (data.success) {
          setSchoolRanks(data.data);
        }
      } catch {
        // silent
      } finally {
        setSchoolRankLoading(false);
        setSchoolRankFetched(true);
      }
    }

    fetchSchoolRank();
  }, [activeTab, gameData, schoolRankFetched]);

  // Refresh handler
  const handleRefresh = async () => {
    const profile = gameData[activeTab].profile;
    if (!profile) return;

    setGameData((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], refreshing: true },
    }));

    try {
      const res = await fetch(`/api/search/${activeTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameName: profile.gameName,
          tagLine: profile.tagLine,
          refresh: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGameData((prev) => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            profile: data.data,
            lastUpdatedAt: data.data.lastUpdatedAt ?? new Date().toISOString(),
            refreshing: false,
          },
        }));
        // Also refetch matches
        setMatchesFetched((prev) => ({ ...prev, [activeTab]: false }));
      } else {
        setGameData((prev) => ({
          ...prev,
          [activeTab]: { ...prev[activeTab], refreshing: false },
        }));
      }
    } catch {
      setGameData((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], refreshing: false },
      }));
    }
  };

  // Auto-select first available game
  useEffect(() => {
    const lol = gameData.lol;
    const val = gameData.valorant;
    if (!lol.loadingProfile && !val.loadingProfile) {
      if (!lol.profile && val.profile) setActiveTab("valorant");
    }
  }, [gameData]);

  const current = gameData[activeTab];
  const anyProfile = gameData.lol.profile || gameData.valorant.profile;
  const allDoneLoading = !gameData.lol.loadingProfile && !gameData.valorant.loadingProfile;
  const displayProfile = current.profile ?? gameData.lol.profile ?? gameData.valorant.profile;

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Profile Header - shared */}
      {(!allDoneLoading) && <ProfileSkeleton />}

      {allDoneLoading && !anyProfile && (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">플레이어를 찾을 수 없습니다</p>
          <Link href="/" className="text-sm text-primary hover:underline">돌아가기</Link>
        </div>
      )}

      {allDoneLoading && displayProfile && (
        <>
          {/* Name Header */}
          <div className="flex items-center gap-4">
            {displayProfile.profileIconUrl && (
              <Image
                src={displayProfile.profileIconUrl}
                alt="프로필"
                width={64}
                height={64}
                className="rounded-xl border border-white/10"
                unoptimized
              />
            )}
            <div>
              <h1 className="text-xl font-bold">
                {name}
                <span className="text-muted-foreground font-normal">#{tag}</span>
              </h1>
            </div>
          </div>

          {/* Game Tabs */}
          <div className="flex gap-2">
            {GAMES.map((game) => {
              const data = gameData[game];
              const hasData = !!data.profile;
              const isUnranked = data.profile?.tier === "UNRANKED" || data.profile?.tier === "Unranked";
              return (
                <button
                  key={game}
                  onClick={() => setActiveTab(game)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === game
                      ? "bg-white/10 text-foreground"
                      : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
                  } ${!hasData ? "opacity-40" : ""}`}
                  disabled={!hasData}
                >
                  {GAME_LABELS[game]}
                  {hasData && isUnranked && (
                    <span className="text-[10px] text-muted-foreground/50">언랭</span>
                  )}
                  {!hasData && !data.loadingProfile && (
                    <span className="text-[10px] text-muted-foreground/50">없음</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Rank Card - prominent */}
          {current.profile && (
            <RankCard
              profile={current.profile}
              lastUpdatedAt={current.lastUpdatedAt}
              onRefresh={handleRefresh}
              refreshing={current.refreshing}
            />
          )}

          {/* School Ranking */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">학교 랭킹</h2>
            {schoolRankLoading ? (
              <div className="h-[60px] rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ) : (
              <SchoolRankBadge
                ranks={schoolRanks}
                gameType={activeTab}
                onRegisterClick={() => setShowRegisterModal(true)}
              />
            )}
          </div>

          {/* Share CTA — only show if user has school rank */}
          {!schoolRankLoading && schoolRanks.length > 0 && current.profile && (() => {
            const topRank = schoolRanks[0];
            const profile = current.profile;
            const rankEntry: RankEntry = {
              rank: topRank.myRank ?? 0,
              totalParticipants: topRank.totalParticipants,
              gameAccountId: (profile as GameProfile & { gameAccountId?: string }).gameAccountId ?? "",
              gameName: profile.gameName,
              tagLine: profile.tagLine,
              gameType: activeTab,
              tier: profile.tier,
              tierRank: profile.rank,
              points: profile.points,
              tierNumeric: profile.tierNumeric,
              organizationName: topRank.organizationName,
            };
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const shareUrl = `${origin}/share/${rankEntry.gameAccountId || "p"}?name=${encodeURIComponent(profile.gameName)}&tag=${encodeURIComponent(profile.tagLine)}&tier=${encodeURIComponent(profile.tier)}&tierRank=${encodeURIComponent(profile.rank)}&rank=${rankEntry.rank}&total=${rankEntry.totalParticipants}&school=${encodeURIComponent(topRank.organizationName)}&game=${activeTab}`;
            return (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.06] p-4 sm:p-5">
                <ShareButtons rankEntry={rankEntry} shareUrl={shareUrl} />
              </div>
            );
          })()}

          {/* dor.gg CTA Banner */}
          <DorggCtaBanner placement="player_profile" />


          {/* Match History */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">최근 전적</h2>
            {current.loadingMatches ? (
              <MatchSkeleton />
            ) : current.matches.length > 0 ? (
              <div className="space-y-2">
                {current.matches.map((match) => (
                  <MatchCard key={match.matchId} match={match} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 text-center py-8">
                최근 전적이 없습니다
              </p>
            )}
          </div>
        </>
      )}

      {/* School Register Modal */}
      {current.profile && (
        <SchoolRegisterModal
          open={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          gameAccountId={(current.profile as GameProfile & { gameAccountId: string }).gameAccountId}
          gameType={activeTab}
          onRegistered={() => {
            setSchoolRankFetched(false);
            setSchoolRanks([]);
          }}
        />
      )}
    </main>
  );
}
