/**
 * Tier normalization to a 0-10000 unified scale.
 * Higher = better rank.
 */

// --- Valorant ---
// competitiveTier: 3=Iron1 ... 27=Radiant
// ranking_in_tier (RR): 0-100
const VALORANT_TIER_BASE: Record<number, number> = {
  // Iron 1-3
  3: 300, 4: 500, 5: 700,
  // Bronze 1-3
  6: 1000, 7: 1300, 8: 1600,
  // Silver 1-3
  9: 2000, 10: 2300, 11: 2600,
  // Gold 1-3
  12: 3000, 13: 3300, 14: 3600,
  // Platinum 1-3
  15: 4000, 16: 4300, 17: 4600,
  // Diamond 1-3
  18: 5500, 19: 5900, 20: 6300,
  // Ascendant 1-3
  21: 7000, 22: 7400, 23: 7800,
  // Immortal 1-3
  24: 8200, 25: 8500, 26: 8800,
  // Radiant
  27: 9500,
};

export function normalizeValorantTier(competitiveTier: number, rr: number): number {
  const base = VALORANT_TIER_BASE[competitiveTier];
  if (base === undefined) return 0;
  const rrBonus = Math.floor((rr / 100) * 200);
  return Math.min(10000, base + rrBonus);
}

// --- League of Legends ---
const LOL_TIER_BASE: Record<string, number> = {
  IRON: 0,
  BRONZE: 1000,
  SILVER: 2000,
  GOLD: 3000,
  PLATINUM: 4000,
  EMERALD: 5000,
  DIAMOND: 6500,
  MASTER: 8000,
  GRANDMASTER: 8800,
  CHALLENGER: 9500,
};

const LOL_RANK_OFFSET: Record<string, number> = {
  IV: 0,
  III: 250,
  II: 500,
  I: 750,
};

export function normalizeLolTier(tier: string, rank: string, lp: number): number {
  const base = LOL_TIER_BASE[tier];
  if (base === undefined) return 0;

  // Master+ have no division, LP is the differentiator
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
    return Math.min(10000, base + Math.floor(lp * 2));
  }

  const rankOffset = LOL_RANK_OFFSET[rank] ?? 0;
  const lpBonus = Math.floor((lp / 100) * 250);
  return Math.min(10000, base + rankOffset + lpBonus);
}

// --- Generic ---
export function getTierDisplay(gameType: string, tier: string, rank: string, points: number): string {
  if (gameType === "valorant") {
    return rank ? `${tier} ${rank}` : tier;
  }
  if (gameType === "lol") {
    if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
      return `${tier} ${points}LP`;
    }
    return `${tier} ${rank} ${points}LP`;
  }
  return tier;
}
