import type { GameType } from "./game";

export interface Organization {
  id: string;
  type: "school";
  name: string;
  normalizedName: string;
  schoolCode?: string;
  schoolLevel?: "middle" | "high" | "university";
  regionSido?: string;
  regionSigungu?: string;
  memberCount: number;
}

export interface RankEntry {
  rank: number;
  totalParticipants: number;
  gameAccountId: string;
  gameName: string;
  tagLine: string;
  gameType: GameType;
  tier: string;
  tierRank: string;
  points: number;
  tierNumeric: number;
  organizationName: string;
}

export interface RankingResult {
  myRank: RankEntry;
  topRanks: RankEntry[];
  nearbyRanks: RankEntry[];
  organizationName: string;
  organizationType: "school";
  totalParticipants: number;
  gameType: GameType;
  updatedAt: string;
}

export interface ShareData {
  rankEntry: RankEntry;
  organizationName: string;
  shareUrl: string;
  imageUrl: string;
}
