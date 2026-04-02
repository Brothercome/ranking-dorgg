export type GameType = "valorant" | "lol";

export interface GameProfile {
  gameType: GameType;
  gameName: string;
  tagLine: string;
  puuid: string;
  tier: string;
  rank: string;
  points: number;
  wins: number;
  losses: number;
  tierNumeric: number;
  profileIconUrl?: string;
  raw: Record<string, unknown>;
}

export interface MatchParticipant {
  gameName: string;
  tagLine: string;
  champion?: string;    // LoL: champion name
  agent?: string;       // Valorant: agent name
  kills: number;
  deaths: number;
  assists: number;
  tier?: string;
}

export interface MatchHistory {
  matchId: string;
  gameType: GameType;
  queueType: string;       // "솔로랭크", "자유랭크", "일반", "경쟁전", etc.
  result: "win" | "loss" | "draw";
  gameDuration: number;    // seconds
  playedAt: Date;
  // 검색한 플레이어 정보
  player: {
    champion?: string;
    agent?: string;
    kills: number;
    deaths: number;
    assists: number;
    cs?: number;           // LoL only: creep score
    damage?: number;
    score?: number;        // Valorant: combat score
  };
  participants: MatchParticipant[];
  raw: Record<string, unknown>;
}

export interface GameApiAdapter {
  searchPlayer(gameName: string, tagLine: string): Promise<GameProfile | null>;
  getMatchHistory(
    puuid: string,
    gameName: string,
    tagLine: string,
    count?: number,
  ): Promise<MatchHistory[]>;
}

export const GAME_LABELS: Record<GameType, string> = {
  valorant: "발로란트",
  lol: "리그 오브 레전드",
};

export const GAME_ICONS: Record<GameType, string> = {
  valorant: "/icons/valorant.svg",
  lol: "/icons/lol.svg",
};

// Valorant Tiers
export const VALORANT_TIERS = [
  "Iron", "Bronze", "Silver", "Gold", "Platinum",
  "Diamond", "Ascendant", "Immortal", "Radiant",
] as const;

export const VALORANT_TIER_KOREAN: Record<string, string> = {
  Iron: "아이언", Bronze: "브론즈", Silver: "실버", Gold: "골드",
  Platinum: "플래티넘", Diamond: "다이아몬드", Ascendant: "어센던트",
  Immortal: "이모탈", Radiant: "레디언트",
};

// LoL Tiers
export const LOL_TIERS = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
] as const;

export const LOL_TIER_KOREAN: Record<string, string> = {
  IRON: "아이언", BRONZE: "브론즈", SILVER: "실버", GOLD: "골드",
  PLATINUM: "플래티넘", EMERALD: "에메랄드", DIAMOND: "다이아몬드",
  MASTER: "마스터", GRANDMASTER: "그랜드마스터", CHALLENGER: "챌린저",
};

export const LOL_RANKS = ["IV", "III", "II", "I"] as const;
