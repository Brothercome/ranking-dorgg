import type { GameApiAdapter, GameProfile, MatchHistory, MatchParticipant } from "@/types/game";
import { normalizeValorantTier } from "@/lib/ranking/normalize";
import { getCached, setCache, CACHE_TTL } from "@/lib/cache/redis";

/**
 * Riot 공식 Valorant API 어댑터.
 * 현재 랭크는 직접 조회 엔드포인트가 없어서 최근 경쟁전 매치에서 티어를 추출합니다.
 * Henrik은 백업 fallback으로 사용됩니다.
 */

const RIOT_ASIA = "https://asia.api.riotgames.com";
const RIOT_KR = "https://kr.api.riotgames.com";

function riotValHeaders() {
  return {
    "X-Riot-Token": process.env.VALORANT_API_KEY || process.env.RIOT_API_KEY || "",
    "Accept": "application/json",
  };
}

interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface ValMatchlistEntry {
  matchId: string;
  gameStartTimeMillis: number;
  queueId: string; // "competitive" | "unrated" | ...
}

interface ValMatchlist {
  puuid: string;
  history: ValMatchlistEntry[];
}

interface ValMatchPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  characterId: string;
  competitiveTier: number;
  stats: {
    score: number;
    roundsPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
  };
}

interface ValMatchTeam {
  teamId: string;
  won: boolean;
  roundsPlayed: number;
  roundsWon: number;
}

interface ValMatchDetail {
  matchInfo: {
    matchId: string;
    gameStartMillis: number;
    gameLengthMillis: number;
    queueId: string;
    mapId: string;
  };
  players: ValMatchPlayer[];
  teams: ValMatchTeam[];
}

async function riotValFetch<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: riotValHeaders(), next: { revalidate: 300 } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Riot Valorant API: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// competitiveTier → 티어 이름 매핑
const VAL_TIER_NAMES: Record<number, string> = {
  0: "Unranked", 3: "Iron", 4: "Iron", 5: "Iron",
  6: "Bronze", 7: "Bronze", 8: "Bronze",
  9: "Silver", 10: "Silver", 11: "Silver",
  12: "Gold", 13: "Gold", 14: "Gold",
  15: "Platinum", 16: "Platinum", 17: "Platinum",
  18: "Diamond", 19: "Diamond", 20: "Diamond",
  21: "Ascendant", 22: "Ascendant", 23: "Ascendant",
  24: "Immortal", 25: "Immortal", 26: "Immortal",
  27: "Radiant",
};

function tierDivision(tier: number): string {
  if (tier < 3 || tier >= 27) return "";
  const offset = (tier - 3) % 3; // 0,1,2
  return ["1", "2", "3"][offset];
}

const VAL_MODE_MAP: Record<string, string> = {
  competitive: "경쟁전",
  unrated: "일반",
  deathmatch: "데스매치",
  spikerush: "스파이크 러시",
  swiftplay: "스위프트플레이",
  ggteam: "팀 데스매치",
};

export const riotValorantClient: GameApiAdapter = {
  async searchPlayer(gameName: string, tagLine: string): Promise<GameProfile | null> {
    const cacheKey = `search:riot-val:${gameName}:${tagLine}`;
    const cached = await getCached<GameProfile>(cacheKey);
    if (cached) return cached;

    // Step 1: Account-v1로 puuid 조회
    const account = await riotValFetch<RiotAccount>(
      `${RIOT_ASIA}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    if (!account) return null;

    // Step 2: 매치 리스트 조회 (경쟁전만)
    const matchlist = await riotValFetch<ValMatchlist>(
      `${RIOT_KR}/val/match/v1/matchlists/by-puuid/${account.puuid}`
    );

    // 경쟁전 매치 중 가장 최근 것을 찾음
    const recentComp = matchlist?.history.find((m) => m.queueId === "competitive");

    let competitiveTier = 0;
    if (recentComp) {
      const match = await riotValFetch<ValMatchDetail>(
        `${RIOT_KR}/val/match/v1/matches/${recentComp.matchId}`
      );
      const me = match?.players.find((p) => p.puuid === account.puuid);
      if (me) competitiveTier = me.competitiveTier;
    }

    const tier = VAL_TIER_NAMES[competitiveTier] ?? "Unranked";
    const division = tierDivision(competitiveTier);

    const profile: GameProfile = {
      gameType: "valorant",
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      tier,
      rank: division,
      points: 0, // Riot API는 RR을 직접 제공하지 않음
      wins: 0,
      losses: 0,
      tierNumeric: competitiveTier > 0
        ? normalizeValorantTier(competitiveTier, 50)
        : 0,
      raw: { source: "riot-valorant", account, competitiveTier },
    };

    await setCache(cacheKey, profile, CACHE_TTL.SEARCH);
    return profile;
  },

  async getMatchHistory(puuid: string, _gameName: string, _tagLine: string, count = 10): Promise<MatchHistory[]> {
    const cacheKey = `matches:riot-val:${puuid}:${count}`;
    const cached = await getCached<MatchHistory[]>(cacheKey);
    if (cached) return cached;

    const matchlist = await riotValFetch<ValMatchlist>(
      `${RIOT_KR}/val/match/v1/matchlists/by-puuid/${puuid}`
    );
    if (!matchlist || matchlist.history.length === 0) return [];

    const entries = matchlist.history.slice(0, count);
    const matches: MatchHistory[] = [];

    // Riot API rate limit 고려: 배치 5개씩
    for (let i = 0; i < entries.length; i += 5) {
      const batch = entries.slice(i, i + 5);
      const details = await Promise.all(
        batch.map((e) =>
          riotValFetch<ValMatchDetail>(`${RIOT_KR}/val/match/v1/matches/${e.matchId}`)
        )
      );

      for (const match of details) {
        if (!match) continue;
        const me = match.players.find((p) => p.puuid === puuid);
        if (!me) continue;

        const myTeam = match.teams.find((t) => t.teamId === me.teamId);
        const result: "win" | "loss" | "draw" = myTeam?.won ? "win" : "loss";
        const queueType = VAL_MODE_MAP[match.matchInfo.queueId] ?? match.matchInfo.queueId;

        const participants: MatchParticipant[] = match.players.map((p) => ({
          gameName: p.gameName,
          tagLine: p.tagLine,
          agent: p.characterId,
          kills: p.stats.kills,
          deaths: p.stats.deaths,
          assists: p.stats.assists,
          tier: VAL_TIER_NAMES[p.competitiveTier],
        }));

        matches.push({
          matchId: match.matchInfo.matchId,
          gameType: "valorant",
          queueType,
          result,
          gameDuration: Math.floor(match.matchInfo.gameLengthMillis / 1000),
          playedAt: new Date(match.matchInfo.gameStartMillis),
          player: {
            agent: me.characterId,
            kills: me.stats.kills,
            deaths: me.stats.deaths,
            assists: me.stats.assists,
            score: me.stats.score,
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
