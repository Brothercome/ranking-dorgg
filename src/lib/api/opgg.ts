import type { GameProfile } from "@/types/game";
import { normalizeLolTier } from "@/lib/ranking/normalize";

/**
 * op.gg 내부 API를 통해 LoL 플레이어 정보를 가져옵니다.
 * Riot API 실패 시 fallback으로 사용됩니다.
 */

const OPGG_API = "https://lol-web-api.op.gg/api/v1.0/internal/bypass";

interface OpggSummoner {
  id: string;
  summoner_id: string;
  acct_id: string;
  puuid: string;
  game_name: string;
  tagline: string;
  name: string;
  profile_image_url: string;
  level: number;
  league_stats: OpggLeagueStat[];
}

interface OpggLeagueStat {
  queue_info: {
    game_type: string; // "SOLORANKED" | "FLEXRANKED"
  };
  tier_info: {
    tier: string;      // "GOLD", "PLATINUM", etc.
    division: number;  // 1-4
    lp: number;
  };
  win: number;
  lose: number;
}

export async function searchFromOpgg(
  gameName: string,
  tagLine: string
): Promise<GameProfile | null> {
  try {
    const encodedName = encodeURIComponent(`${gameName}-${tagLine}`);
    const url = `${OPGG_API}/summoners/kr/${encodedName}`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const summoner: OpggSummoner = json.data;
    if (!summoner) return null;

    // 솔로랭크 데이터 찾기
    const soloRank = summoner.league_stats?.find(
      (s) => s.queue_info.game_type === "SOLORANKED"
    );

    const tier = soloRank?.tier_info.tier ?? "UNRANKED";
    const divisionMap: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };
    const rank = soloRank ? (divisionMap[soloRank.tier_info.division] ?? "") : "";
    const points = soloRank?.tier_info.lp ?? 0;
    const wins = soloRank?.win ?? 0;
    const losses = soloRank?.lose ?? 0;

    return {
      gameType: "lol",
      gameName: summoner.game_name || gameName,
      tagLine: summoner.tagline || tagLine,
      puuid: summoner.puuid,
      tier,
      rank,
      points,
      wins,
      losses,
      tierNumeric: soloRank
        ? normalizeLolTier(tier, rank, points)
        : 0,
      profileIconUrl: summoner.profile_image_url,
      raw: { source: "opgg", summoner },
    };
  } catch {
    return null;
  }
}
