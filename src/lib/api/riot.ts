import type { GameApiAdapter, GameProfile, MatchHistory, MatchParticipant } from "@/types/game";
import { normalizeLolTier } from "@/lib/ranking/normalize";
import { getCached, setCache, CACHE_TTL } from "@/lib/cache/redis";

const RIOT_BASE = "https://asia.api.riotgames.com";
const RIOT_KR_BASE = "https://kr.api.riotgames.com";

function riotHeaders() {
  return {
    "X-Riot-Token": process.env.RIOT_API_KEY!,
    "Accept": "application/json",
  };
}

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

interface RiotMatchParticipant {
  puuid: string;
  summonerName?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
}

interface RiotMatchDetail {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameDuration: number;
    gameEndTimestamp: number;
    participants: RiotMatchParticipant[];
  };
}

const LOL_QUEUE_TYPES: Record<number, string> = {
  420: "솔로랭크",
  440: "자유랭크",
  450: "칼바람 나락",
  400: "일반",
  490: "빠른 대전",
  700: "격전",
  1700: "아레나",
};

async function riotFetch<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: riotHeaders(), next: { revalidate: 300 } });
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) return null;
    throw new Error(`Riot API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const riotApiClient: GameApiAdapter = {
  async searchPlayer(gameName: string, tagLine: string): Promise<GameProfile | null> {
    const cacheKey = `search:lol:${gameName}:${tagLine}`;
    const cached = await getCached<GameProfile>(cacheKey);
    if (cached) return cached;

    // Step 1: Get PUUID from Riot ID
    const account = await riotFetch<RiotAccount>(
      `${RIOT_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    if (!account) return null;

    // Step 2: Get Summoner data
    const summoner = await riotFetch<RiotSummoner>(
      `${RIOT_KR_BASE}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
    );
    if (!summoner) return null;

    // Step 3: Get Ranked data (by PUUID - by-summoner is deprecated)
    const entries = await riotFetch<RiotLeagueEntry[]>(
      `${RIOT_KR_BASE}/lol/league/v4/entries/by-puuid/${account.puuid}`
    );

    const soloQueue = entries?.find((e) => e.queueType === "RANKED_SOLO_5x5");

    const profile: GameProfile = {
      gameType: "lol",
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      tier: soloQueue?.tier ?? "UNRANKED",
      rank: soloQueue?.rank ?? "",
      points: soloQueue?.leaguePoints ?? 0,
      wins: soloQueue?.wins ?? 0,
      losses: soloQueue?.losses ?? 0,
      tierNumeric: soloQueue
        ? normalizeLolTier(soloQueue.tier, soloQueue.rank, soloQueue.leaguePoints)
        : 0,
      profileIconUrl: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${summoner.profileIconId}.png`,
      raw: { account, summoner, soloQueue },
    };

    await setCache(cacheKey, profile, CACHE_TTL.SEARCH);
    return profile;
  },

  async getMatchHistory(puuid: string, _gameName: string, _tagLine: string, count = 10): Promise<MatchHistory[]> {
    const cacheKey = `matches:lol:${puuid}:${count}`;
    const cached = await getCached<MatchHistory[]>(cacheKey);
    if (cached) return cached;

    // Step 1: Get match IDs
    const matchIds = await riotFetch<string[]>(
      `${RIOT_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`
    );
    if (!matchIds || matchIds.length === 0) return [];

    // Step 2: Fetch match details in parallel (batch of 5 to respect rate limits)
    const matches: MatchHistory[] = [];
    for (let i = 0; i < matchIds.length; i += 5) {
      const batch = matchIds.slice(i, i + 5);
      const details = await Promise.all(
        batch.map((id) => riotFetch<RiotMatchDetail>(`${RIOT_BASE}/lol/match/v5/matches/${id}`))
      );

      for (const match of details) {
        if (!match) continue;
        const me = match.info.participants.find((p) => p.puuid === puuid);
        if (!me) continue;

        const queueType = LOL_QUEUE_TYPES[match.info.queueId] ?? "기타";

        const participants: MatchParticipant[] = match.info.participants.map((p) => ({
          gameName: p.riotIdGameName ?? p.summonerName ?? "",
          tagLine: p.riotIdTagline ?? "",
          champion: p.championName,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
        }));

        matches.push({
          matchId: match.metadata.matchId,
          gameType: "lol",
          queueType,
          result: me.win ? "win" : "loss",
          gameDuration: match.info.gameDuration,
          playedAt: new Date(match.info.gameEndTimestamp),
          player: {
            champion: me.championName,
            kills: me.kills,
            deaths: me.deaths,
            assists: me.assists,
            cs: me.totalMinionsKilled + me.neutralMinionsKilled,
            damage: me.totalDamageDealtToChampions,
            items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6].filter(id => id > 0),
          },
          participants,
          raw: match as unknown as Record<string, unknown>,
        });
      }
    }

    await setCache(cacheKey, matches, CACHE_TTL.SEARCH);
    return matches;
  },
};
