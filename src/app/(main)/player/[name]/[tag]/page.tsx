"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { GameProfile, MatchHistory, GameType } from "@/types/game";
import {
  LOL_TIER_KOREAN,
  LOL_TIER_ICONS,
  VALORANT_TIER_KOREAN,
  VALORANT_TIER_ICONS,
} from "@/types/game";
import Image from "next/image";
import Link from "next/link";

interface ProfileData {
  profile: GameProfile;
  gameAccountId: string;
}

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

function KDAColor({ kills, deaths, assists }: { kills: number; deaths: number; assists: number }) {
  const kda = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);
  const kdaNum = deaths === 0 ? 99 : (kills + assists) / deaths;
  const color =
    kdaNum >= 5 ? "text-orange-400" :
    kdaNum >= 3 ? "text-blue-400" :
    kdaNum >= 2 ? "text-green-400" : "text-muted-foreground";
  return <span className={`text-xs font-semibold ${color}`}>{kda} KDA</span>;
}

function ChampionIcon({ champion }: { champion: string }) {
  return (
    <Image
      src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champion}.png`}
      alt={champion}
      width={40}
      height={40}
      className="rounded-lg"
      unoptimized
    />
  );
}

// Profile Header
function ProfileHeader({ profile }: { profile: GameProfile }) {
  const tierIcon = getTierIcon(profile.gameType, profile.tier);
  const tierName = getTierKorean(profile.gameType, profile.tier);
  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
  const isUnranked = profile.tier === "UNRANKED" || profile.tier === "Unranked";

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-5">
        {/* Profile Icon */}
        {profile.profileIconUrl && (
          <div className="relative">
            <Image
              src={profile.profileIconUrl}
              alt="프로필"
              width={80}
              height={80}
              className="rounded-xl border border-white/10"
              unoptimized
            />
          </div>
        )}

        {/* Name & Tier */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">
            {profile.gameName}
            <span className="text-muted-foreground font-normal">#{profile.tagLine}</span>
          </h1>

          <div className="flex items-center gap-3 mt-2">
            {tierIcon && (
              <Image src={tierIcon} alt={tierName} width={32} height={32} unoptimized />
            )}
            <div>
              {isUnranked ? (
                <span className="text-sm text-muted-foreground">Unranked</span>
              ) : (
                <>
                  <span className="text-sm font-semibold">
                    {tierName} {profile.rank}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {profile.points} LP
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {totalGames > 0 && (
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">전적</span>
            <span className="text-sm font-medium">
              {profile.wins}승 {profile.losses}패
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">승률</span>
            <span className={`text-sm font-semibold ${winRate >= 50 ? "text-blue-400" : "text-red-400"}`}>
              {winRate}%
            </span>
          </div>
          {/* Win rate bar */}
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Match Card
function MatchCard({ match }: { match: MatchHistory }) {
  const isWin = match.result === "win";
  const { player } = match;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        isWin
          ? "bg-blue-500/[0.04] border-blue-500/20"
          : "bg-red-500/[0.04] border-red-500/20"
      }`}
    >
      {/* Result indicator */}
      <div
        className={`w-1 h-12 rounded-full shrink-0 ${isWin ? "bg-blue-500" : "bg-red-500"}`}
      />

      {/* Champion */}
      {player.champion && <ChampionIcon champion={player.champion} />}

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
          <KDAColor kills={player.kills} deaths={player.deaths} assists={player.assists} />
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
      <div className="text-xs text-muted-foreground/50 shrink-0 w-16 text-right">
        {formatTimeAgo(match.playedAt)}
      </div>
    </div>
  );
}

// Skeleton loaders
function ProfileSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-xl bg-white/[0.06]" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 rounded bg-white/[0.06]" />
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

function MatchSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[72px] rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
      ))}
    </div>
  );
}

export default function PlayerPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const tag = decodeURIComponent(params.tag as string);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      setLoadingProfile(true);
      setError(null);

      // Try LoL first, then Valorant
      for (const game of ["lol", "valorant"] as const) {
        try {
          const res = await fetch(`/api/search/${game}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameName: name, tagLine: tag }),
          });
          const data = await res.json();
          if (data.success) {
            setProfileData({ profile: data.data, gameAccountId: data.data.gameAccountId });
            setLoadingProfile(false);
            return;
          }
        } catch {
          // try next
        }
      }

      setError("플레이어를 찾을 수 없습니다");
      setLoadingProfile(false);
    }

    fetchProfile();
  }, [name, tag]);

  // Fetch matches after profile
  useEffect(() => {
    if (!profileData) return;

    async function fetchMatches() {
      setLoadingMatches(true);
      try {
        const { profile } = profileData!;
        const res = await fetch(`/api/matches/${profile.gameType}`, {
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
          setMatches(data.data);
        }
      } catch {
        // silent
      } finally {
        setLoadingMatches(false);
      }
    }

    fetchMatches();
  }, [profileData]);

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Error */}
      {error && (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            돌아가기
          </Link>
        </div>
      )}

      {/* Profile */}
      {loadingProfile && <ProfileSkeleton />}
      {profileData && <ProfileHeader profile={profileData.profile} />}

      {/* Match History */}
      {profileData && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">최근 전적</h2>
          {loadingMatches ? (
            <MatchSkeleton />
          ) : matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((match) => (
                <MatchCard key={match.matchId} match={match} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50 text-center py-8">
              최근 전적이 없습니다
            </p>
          )}
        </div>
      )}
    </main>
  );
}
