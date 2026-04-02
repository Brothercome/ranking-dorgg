import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const VALID_GAMES: GameType[] = ["valorant", "lol"];
const VALID_TABS = ["schools", "players"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sido: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { sido: rawSido } = await params;
    const sido = decodeURIComponent(rawSido);

    const { searchParams } = new URL(request.url);
    const gameParam = searchParams.get("game") ?? "lol";
    if (!VALID_GAMES.includes(gameParam as GameType)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 게임입니다" },
        { status: 400 }
      );
    }
    const gameType = gameParam as GameType;

    const tab = searchParams.get("tab") ?? "schools";
    if (!VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 탭입니다" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    // Get all orgs in this region with members
    const { data: regionOrgs } = await supabase
      .from("organizations")
      .select("id, name, member_count")
      .eq("region_sido", sido)
      .gt("member_count", 0);

    if (!regionOrgs || regionOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          schoolRankings: tab === "schools" ? [] : undefined,
          playerRankings: tab === "players" ? [] : undefined,
          totalSchools: 0,
          totalPlayers: 0,
          hasMore: false,
          page,
          limit,
        },
      });
    }

    const orgIds = regionOrgs.map((o) => o.id);

    // Get all account links for orgs in this region
    const { data: allLinks } = await supabase
      .from("account_organizations")
      .select("game_account_id, organization_id")
      .in("organization_id", orgIds);

    const links = allLinks ?? [];
    const allAccountIds = links.map((l) => l.game_account_id);

    // Get total player count for this game type
    let totalPlayers = 0;
    if (allAccountIds.length > 0) {
      const { count } = await supabase
        .from("game_accounts")
        .select("id", { count: "exact", head: true })
        .eq("game_type", gameType)
        .in("id", allAccountIds);
      totalPlayers = count ?? 0;
    }

    if (tab === "schools") {
      // Calculate avg tier_numeric for each school
      const schoolScores: Array<{
        orgId: string;
        name: string;
        avgTier: number;
        memberCount: number;
      }> = [];

      for (const org of regionOrgs) {
        const orgAccountIds = links
          .filter((l) => l.organization_id === org.id)
          .map((l) => l.game_account_id);

        if (orgAccountIds.length === 0) continue;

        const { data: members } = await supabase
          .from("game_accounts")
          .select("tier_numeric")
          .eq("game_type", gameType)
          .in("id", orgAccountIds);

        if (members && members.length > 0) {
          const avg =
            members.reduce((sum, m) => sum + (m.tier_numeric ?? 0), 0) /
            members.length;
          schoolScores.push({
            orgId: org.id,
            name: org.name,
            avgTier: avg,
            memberCount: members.length,
          });
        }
      }

      // Sort by avgTier descending
      schoolScores.sort((a, b) => b.avgTier - a.avgTier);

      const totalSchools = schoolScores.length;
      const paginated = schoolScores.slice(offset, offset + limit);
      const hasMore = offset + limit < totalSchools;

      const schoolRankings = paginated.map((s, idx) => ({
        rank: offset + idx + 1,
        schoolId: s.orgId,
        schoolName: s.name,
        avgTier: Math.round(s.avgTier * 100) / 100,
        memberCount: s.memberCount,
      }));

      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          schoolRankings,
          totalSchools,
          totalPlayers,
          hasMore,
          page,
          limit,
        },
      });
    }

    // tab === "players"
    if (allAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          playerRankings: [],
          totalSchools: regionOrgs.length,
          totalPlayers: 0,
          hasMore: false,
          page,
          limit,
        },
      });
    }

    const { data: players } = await supabase
      .from("game_accounts")
      .select("id, game_name, tag_line, current_tier, current_rank, current_points, tier_numeric")
      .eq("game_type", gameType)
      .in("id", allAccountIds)
      .order("tier_numeric", { ascending: false })
      .range(offset, offset + limit - 1);

    // Build a map from account_id -> org name
    const accountOrgMap = new Map<string, string>();
    for (const link of links) {
      const org = regionOrgs.find((o) => o.id === link.organization_id);
      if (org) {
        accountOrgMap.set(link.game_account_id, org.name);
      }
    }

    const playerRankings = (players ?? []).map((p, idx) => ({
      rank: offset + idx + 1,
      gameAccountId: p.id,
      gameName: p.game_name,
      tagLine: p.tag_line,
      tier: p.current_tier ?? "UNRANKED",
      tierRank: p.current_rank ?? "",
      points: p.current_points ?? 0,
      tierNumeric: p.tier_numeric ?? 0,
      schoolName: accountOrgMap.get(p.id) ?? "",
    }));

    const hasMore = offset + limit < totalPlayers;

    return NextResponse.json({
      success: true,
      data: {
        region: sido,
        playerRankings,
        totalSchools: regionOrgs.length,
        totalPlayers,
        hasMore,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Region detail error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
