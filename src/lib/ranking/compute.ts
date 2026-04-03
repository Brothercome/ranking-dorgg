import { supabase } from "@/lib/db";
import type { RankEntry, RankingResult } from "@/types/ranking";
import type { GameType } from "@/types/game";

export async function computeRanking(
  organizationId: string,
  gameType: GameType,
  targetGameAccountId?: string
): Promise<RankingResult | null> {
  // Fetch links + org name in parallel
  const [linksRes, orgRes] = await Promise.all([
    supabase
      .from("account_organizations")
      .select("game_account_id")
      .eq("organization_id", organizationId),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single(),
  ]);

  if (!linksRes.data || linksRes.data.length === 0) return null;

  const accountIds = linksRes.data.map((l) => l.game_account_id);
  const orgName = orgRes.data?.name ?? "Unknown";

  const { data: members } = await supabase
    .from("game_accounts")
    .select("id, game_name, tag_line, game_type, current_tier, current_rank, current_points, tier_numeric")
    .eq("game_type", gameType)
    .in("id", accountIds)
    .order("tier_numeric", { ascending: false });

  if (!members || members.length === 0) return null;

  const ranked: RankEntry[] = members.map((m, idx) => ({
    rank: idx + 1,
    totalParticipants: members.length,
    gameAccountId: m.id,
    gameName: m.game_name,
    tagLine: m.tag_line,
    gameType: m.game_type as GameType,
    tier: m.current_tier ?? "UNRANKED",
    tierRank: m.current_rank ?? "",
    points: m.current_points ?? 0,
    tierNumeric: m.tier_numeric ?? 0,
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
