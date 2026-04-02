import { db } from "@/lib/db";
import { gameAccounts, accountOrganizations, organizations } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { RankEntry, RankingResult } from "@/types/ranking";
import type { GameType } from "@/types/game";

export async function computeRanking(
  organizationId: string,
  gameType: GameType,
  targetGameAccountId?: string
): Promise<RankingResult | null> {
  // Get all game accounts in this org for this game type
  const members = await db
    .select({
      gameAccountId: gameAccounts.id,
      gameName: gameAccounts.gameName,
      tagLine: gameAccounts.tagLine,
      gameType: gameAccounts.gameType,
      tier: gameAccounts.currentTier,
      rank: gameAccounts.currentRank,
      points: gameAccounts.currentPoints,
      tierNumeric: gameAccounts.tierNumeric,
    })
    .from(accountOrganizations)
    .innerJoin(gameAccounts, eq(accountOrganizations.gameAccountId, gameAccounts.id))
    .where(
      and(
        eq(accountOrganizations.organizationId, organizationId),
        eq(gameAccounts.gameType, gameType)
      )
    )
    .orderBy(desc(gameAccounts.tierNumeric));

  if (members.length === 0) return null;

  const org = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const orgName = org[0]?.name ?? "Unknown";

  const ranked: RankEntry[] = members.map((m, idx) => ({
    rank: idx + 1,
    totalParticipants: members.length,
    gameAccountId: m.gameAccountId,
    gameName: m.gameName,
    tagLine: m.tagLine,
    gameType: m.gameType as GameType,
    tier: m.tier ?? "UNRANKED",
    tierRank: m.rank ?? "",
    points: m.points ?? 0,
    tierNumeric: m.tierNumeric ?? 0,
    organizationName: orgName,
  }));

  const myEntry = targetGameAccountId
    ? ranked.find((r) => r.gameAccountId === targetGameAccountId)
    : ranked[0];

  if (!myEntry) return null;

  const myIdx = ranked.findIndex((r) => r.gameAccountId === myEntry.gameAccountId);
  const nearbyStart = Math.max(0, myIdx - 2);
  const nearbyEnd = Math.min(ranked.length, myIdx + 3);

  return {
    myRank: myEntry,
    topRanks: ranked.slice(0, 3),
    nearbyRanks: ranked.slice(nearbyStart, nearbyEnd),
    organizationName: orgName,
    organizationType: "school",
    totalParticipants: members.length,
    gameType,
    updatedAt: new Date().toISOString(),
  };
}
