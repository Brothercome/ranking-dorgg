import type { GameApiAdapter, GameProfile, MatchHistory, MatchParticipant } from "@/types/game";
import { normalizeValorantTier } from "@/lib/ranking/normalize";
import { getCached, setCache, CACHE_TTL } from "@/lib/cache/redis";

const HENRIK_BASE = "https://api.henrikdev.xyz";

function henrikHeaders() {
  const headers: Record<string, string> = { "Accept": "application/json" };
  if (process.env.HENRIK_API_KEY) {
    headers["Authorization"] = process.env.HENRIK_API_KEY;
  }
  return headers;
}

interface HenrikAccount {
  puuid: string;
  name: string;
  tag: string;
  region: string;
  account_level: number;
  card?: { small: string; large: string };
}

interface HenrikMMR {
  currenttier: number;
  currenttierpatched: string;
  ranking_in_tier: number;
  elo: number;
  images?: { small: string; large: string };
}

interface HenrikMatchPlayer {
  name: string;
  tag: string;
  team: string;
  character: string;
  currenttier_patched?: string;
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    score: number;
  };
  damage_made?: number;
}

interface HenrikMatch {
  metadata: {
    matchid: string;
    mode: string;
    map: string;
    game_length: number;
    game_start_patched: string;
    game_start: number;
  };
  players: {
    all_players: HenrikMatchPlayer[];
    red: HenrikMatchPlayer[];
    blue: HenrikMatchPlayer[];
  };
  teams: {
    red: { rounds_won: number; rounds_lost: number; has_won: boolean };
    blue: { rounds_won: number; rounds_lost: number; has_won: boolean };
  };
}

async function henrikFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${HENRIK_BASE}${path}`, {
    headers: henrikHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Henrik API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export const henrikApiClient: GameApiAdapter = {
  async searchPlayer(gameName: string, tagLine: string): Promise<GameProfile | null> {
    const cacheKey = `search:valorant:${gameName}:${tagLine}`;
    const cached = await getCached<GameProfile>(cacheKey);
    if (cached) return cached;

    // Step 1: Get Account
    const account = await henrikFetch<HenrikAccount>(
      `/valorant/v1/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    if (!account) return null;

    // Step 2: Get MMR
    const mmr = await henrikFetch<HenrikMMR>(
      `/valorant/v1/mmr/kr/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    const tierPatched = mmr?.currenttierpatched ?? "Unranked";
    const tierParts = tierPatched.split(" ");
    const tier = tierParts[0] ?? "Unranked";
    const rank = tierParts[1] ?? "";

    const profile: GameProfile = {
      gameType: "valorant",
      gameName: account.name,
      tagLine: account.tag,
      puuid: account.puuid,
      tier,
      rank,
      points: mmr?.ranking_in_tier ?? 0,
      wins: 0,
      losses: 0,
      tierNumeric: mmr
        ? normalizeValorantTier(mmr.currenttier, mmr.ranking_in_tier)
        : 0,
      profileIconUrl: account.card?.small,
      raw: { account, mmr },
    };

    await setCache(cacheKey, profile, CACHE_TTL.SEARCH);
    return profile;
  },

  async getMatchHistory(puuid: string, gameName: string, tagLine: string, count = 10): Promise<MatchHistory[]> {
    const cacheKey = `matches:valorant:${puuid}:${count}`;
    const cached = await getCached<MatchHistory[]>(cacheKey);
    if (cached) return cached;

    const matchData = await henrikFetch<HenrikMatch[]>(
      `/valorant/v3/matches/kr/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?size=${count}`
    );
    if (!matchData || matchData.length === 0) return [];

    const nameLC = gameName.toLowerCase();
    const tagLC = tagLine.toLowerCase();

    const matches: MatchHistory[] = matchData.map((match) => {
      const allPlayers = match.players.all_players;

      // Find the searched player by name#tag
      const me = allPlayers.find(
        (p) => p.name.toLowerCase() === nameLC && p.tag.toLowerCase() === tagLC
      ) ?? allPlayers[0];

      const myTeam = me.team.toLowerCase() as "red" | "blue";
      const teamResult = match.teams[myTeam];
      const result: "win" | "loss" | "draw" = teamResult.has_won ? "win" : "loss";

      const VAL_MODE_MAP: Record<string, string> = {
        Competitive: "경쟁전",
        Unrated: "일반",
        Deathmatch: "데스매치",
        "Spike Rush": "스파이크 러시",
        Swiftplay: "스위프트플레이",
        "Team Deathmatch": "팀 데스매치",
      };
      const queueType = VAL_MODE_MAP[match.metadata.mode] ?? match.metadata.mode;

      const participants: MatchParticipant[] = allPlayers.map((p) => ({
        gameName: p.name,
        tagLine: p.tag,
        agent: p.character,
        kills: p.stats.kills,
        deaths: p.stats.deaths,
        assists: p.stats.assists,
        tier: p.currenttier_patched,
      }));

      return {
        matchId: match.metadata.matchid,
        gameType: "valorant" as const,
        queueType,
        result,
        gameDuration: match.metadata.game_length,
        playedAt: new Date(match.metadata.game_start * 1000),
        player: {
          agent: me.character,
          kills: me.stats.kills,
          deaths: me.stats.deaths,
          assists: me.stats.assists,
          score: me.stats.score,
          damage: me.damage_made,
        },
        participants,
        raw: match as unknown as Record<string, unknown>,
      };
    });

    await setCache(cacheKey, matches, CACHE_TTL.SEARCH);
    return matches;
  },
};
