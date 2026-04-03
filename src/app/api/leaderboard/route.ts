import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getTierScore } from "@/lib/ranking/normalize";
import type { GameType } from "@/types/game";

const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameParam = searchParams.get("game") ?? "lol";
  const scope = searchParams.get("scope") ?? "school"; // "school" | "region"
  const limitParam = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * limitParam;

  if (!VALID_GAMES.includes(gameParam as GameType)) {
    return NextResponse.json({ success: false, error: "지원하지 않는 게임입니다" }, { status: 400 });
  }
  const gameType = gameParam as GameType;

  if (scope === "school") {
    // Get all schools
    const { data: schools } = await supabase
      .from("organizations")
      .select("id, name, school_level, region_sido, member_count")
      .eq("type", "school")
      .order("member_count", { ascending: false })
      .limit(500);

    if (!schools) {
      return NextResponse.json({ success: true, data: [] });
    }

    // For schools with members, compute tier score
    const schoolsWithMembers = schools.filter((s) => (s.member_count ?? 0) > 0);
    const schoolScores: Array<{
      id: string;
      name: string;
      schoolLevel: string | null;
      region: string | null;
      memberCount: number;
      score: number;
    }> = [];

    // Batch: get all account_organizations for schools with members
    const schoolIds = schoolsWithMembers.map((s) => s.id);

    if (schoolIds.length > 0) {
      const { data: allLinks } = await supabase
        .from("account_organizations")
        .select("organization_id, game_account_id")
        .in("organization_id", schoolIds);

      // Group by org
      const orgAccountMap = new Map<string, string[]>();
      for (const link of allLinks ?? []) {
        const list = orgAccountMap.get(link.organization_id) ?? [];
        list.push(link.game_account_id);
        orgAccountMap.set(link.organization_id, list);
      }

      // Get all game accounts for this game type
      const allAccountIds = [...new Set((allLinks ?? []).map((l) => l.game_account_id))];

      if (allAccountIds.length > 0) {
        const { data: accounts } = await supabase
          .from("game_accounts")
          .select("id, current_tier")
          .eq("game_type", gameType)
          .in("id", allAccountIds);

        const accountTierMap = new Map<string, string>();
        for (const acc of accounts ?? []) {
          accountTierMap.set(acc.id, acc.current_tier ?? "");
        }

        for (const school of schoolsWithMembers) {
          const accIds = orgAccountMap.get(school.id) ?? [];
          const score = accIds.reduce(
            (sum, id) => sum + getTierScore(gameType, accountTierMap.get(id) ?? ""),
            0
          );
          schoolScores.push({
            id: school.id,
            name: school.name,
            schoolLevel: school.school_level,
            region: school.region_sido,
            memberCount: school.member_count ?? 0,
            score,
          });
        }
      }
    }

    // Add schools with 0 members (score = 0)
    const scoredIds = new Set(schoolScores.map((s) => s.id));
    for (const school of schools) {
      if (!scoredIds.has(school.id)) {
        schoolScores.push({
          id: school.id,
          name: school.name,
          schoolLevel: school.school_level,
          region: school.region_sido,
          memberCount: school.member_count ?? 0,
          score: 0,
        });
      }
    }

    // Sort by score desc, then by name
    schoolScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    const total = schoolScores.length;
    const result = schoolScores.slice(offset, offset + limitParam).map((s, idx) => ({
      rank: offset + idx + 1,
      ...s,
    }));

    return NextResponse.json({ success: true, data: result, total, page, limit: limitParam, hasMore: offset + limitParam < total });
  }

  // scope === "region" — batched: 3 queries total instead of N+1
  const [allOrgsRes, allLinksRes, allAccountsRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, region_sido, member_count")
      .eq("type", "school")
      .not("region_sido", "is", null),
    supabase
      .from("account_organizations")
      .select("organization_id, game_account_id"),
    supabase
      .from("game_accounts")
      .select("id, current_tier")
      .eq("game_type", gameType),
  ]);

  const allOrgs = allOrgsRes.data ?? [];
  const allLinks = allLinksRes.data ?? [];
  const allAccounts = allAccountsRes.data ?? [];

  // Build lookup maps
  const orgToAccounts = new Map<string, string[]>();
  for (const link of allLinks) {
    const list = orgToAccounts.get(link.organization_id) ?? [];
    list.push(link.game_account_id);
    orgToAccounts.set(link.organization_id, list);
  }

  const accountTierMap = new Map<string, string>();
  for (const acc of allAccounts) {
    accountTierMap.set(acc.id, acc.current_tier ?? "");
  }

  // Group orgs by region and compute scores
  const regionMap = new Map<string, { schoolCount: number; playerCount: number; score: number }>();

  for (const org of allOrgs) {
    const region = org.region_sido!;
    const entry = regionMap.get(region) ?? { schoolCount: 0, playerCount: 0, score: 0 };
    entry.schoolCount++;
    entry.playerCount += org.member_count ?? 0;

    const accIds = orgToAccounts.get(org.id) ?? [];
    for (const accId of accIds) {
      entry.score += getTierScore(gameType, accountTierMap.get(accId) ?? "");
    }

    regionMap.set(region, entry);
  }

  const regionScores = Array.from(regionMap.entries()).map(([region, data]) => ({
    region,
    ...data,
  }));

  regionScores.sort((a, b) => b.score - a.score);

  const total = regionScores.length;
  const result = regionScores.slice(offset, offset + limitParam).map((r, idx) => ({
    rank: offset + idx + 1,
    ...r,
  }));

  return NextResponse.json({ success: true, data: result, total, page, limit: limitParam, hasMore: offset + limitParam < total });
}
