import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getTierScore } from "@/lib/ranking/normalize";
import type { GameType } from "@/types/game";

const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameParam = searchParams.get("game") ?? "lol";
  const scope = searchParams.get("scope") ?? "school"; // "school" | "region"
  const limitParam = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

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

    const result = schoolScores.slice(0, limitParam).map((s, idx) => ({
      rank: idx + 1,
      ...s,
    }));

    return NextResponse.json({ success: true, data: result });
  }

  // scope === "region"
  const { data: regions } = await supabase
    .from("organizations")
    .select("region_sido")
    .eq("type", "school")
    .not("region_sido", "is", null);

  const uniqueRegions = [...new Set((regions ?? []).map((r) => r.region_sido).filter(Boolean))];

  const regionScores: Array<{
    region: string;
    schoolCount: number;
    playerCount: number;
    score: number;
  }> = [];

  for (const region of uniqueRegions) {
    const { data: regionSchools } = await supabase
      .from("organizations")
      .select("id, member_count")
      .eq("type", "school")
      .eq("region_sido", region);

    const schoolCount = regionSchools?.length ?? 0;
    const playerCount = (regionSchools ?? []).reduce((sum, s) => sum + (s.member_count ?? 0), 0);

    let score = 0;
    const schoolIds = (regionSchools ?? []).filter((s) => (s.member_count ?? 0) > 0).map((s) => s.id);

    if (schoolIds.length > 0) {
      const { data: links } = await supabase
        .from("account_organizations")
        .select("game_account_id")
        .in("organization_id", schoolIds);

      const accIds = [...new Set((links ?? []).map((l) => l.game_account_id))];

      if (accIds.length > 0) {
        const { data: accounts } = await supabase
          .from("game_accounts")
          .select("current_tier")
          .eq("game_type", gameType)
          .in("id", accIds);

        score = (accounts ?? []).reduce(
          (sum, a) => sum + getTierScore(gameType, a.current_tier ?? ""),
          0
        );
      }
    }

    regionScores.push({ region: region!, schoolCount, playerCount, score });
  }

  regionScores.sort((a, b) => b.score - a.score);

  const result = regionScores.slice(0, limitParam).map((r, idx) => ({
    rank: idx + 1,
    ...r,
  }));

  return NextResponse.json({ success: true, data: result });
}
