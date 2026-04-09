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

// --- Components ---

function RankCard({ profile }: { profile: GameProfile }) {
  const tierIcon = getTierIcon(profile.gameType, profile.tier);
  const tierName = getTierKorean(profile.gameType, profile.tier);
  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
  const isUnranked = profile.tier === "UNRANKED" || profile.tier === "Unranked";

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="text-xs text-muted-foreground/60 mb-3 font-medium">개인/2인 랭크</div>
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

// --- Game Tab Data ---

interface GameData {
  profile: GameProfile | null;
  matches: MatchHistory[];
  loadingProfile: boolean;
  loadingMatches: boolean;
}

const GAMES: GameType[] = ["lol", "valorant"];

// --- Page ---

export default function PlayerPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const tag = decodeURIComponent(params.tag as string);

  const [activeTab, setActiveTab] = useState<GameType>("lol");
  const [gameData, setGameData] = useState<Record<GameType, GameData>>({
    lol: { profile: null, matches: [], loadingProfile: true, loadingMatches: false },
    valorant: { profile: null, matches: [], loadingProfile: true, loadingMatches: false },
  });
  const [matchesFetched, setMatchesFetched] = useState<Record<GameType, boolean>>({
    lol: false,
    valorant: false,
  });

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
            [game]: { ...prev[game], profile: data.data, loadingProfile: false },
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
          {current.profile && <RankCard profile={current.profile} />}

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
    </main>
  );
}
