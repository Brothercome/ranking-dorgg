import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const idSchema = z.string().uuid();
const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: "잘못된 학교 ID입니다" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gameParam = searchParams.get("game") ?? "lol";
    if (!VALID_GAMES.includes(gameParam as GameType)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 게임입니다" },
        { status: 400 }
      );
    }
    const gameType = gameParam as GameType;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    // Get school info
    const { data: school, error: schoolError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { success: false, error: "학교를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Get linked account IDs for this org
    const { data: links } = await supabase
      .from("account_organizations")
      .select("game_account_id")
      .eq("organization_id", id);

    const accountIds = (links ?? []).map((l) => l.game_account_id);

    let leaderboard: Array<{
      rank: number;
      gameAccountId: string;
      gameName: string;
      tagLine: string;
      tier: string;
      tierRank: string;
      points: number;
      tierNumeric: number;
    }> = [];
    let totalMembers = 0;
    let hasMore = false;

    if (accountIds.length > 0) {
      // Get total count for this game type
      const { count } = await supabase
        .from("game_accounts")
        .select("id", { count: "exact", head: true })
        .eq("game_type", gameType)
        .in("id", accountIds);

      totalMembers = count ?? 0;

      // Get paginated leaderboard
      const { data: members } = await supabase
        .from("game_accounts")
        .select("id, game_name, tag_line, current_tier, current_rank, current_points, tier_numeric")
        .eq("game_type", gameType)
        .in("id", accountIds)
        .order("tier_numeric", { ascending: false })
        .range(offset, offset + limit - 1);

      leaderboard = (members ?? []).map((m, idx) => ({
        rank: offset + idx + 1,
        gameAccountId: m.id,
        gameName: m.game_name,
        tagLine: m.tag_line,
        tier: m.current_tier ?? "UNRANKED",
        tierRank: m.current_rank ?? "",
        points: m.current_points ?? 0,
        tierNumeric: m.tier_numeric ?? 0,
      }));

      hasMore = offset + limit < totalMembers;
    }

    // Region ranking: count schools in same region with higher avg tier_numeric
    let regionRank: number | null = null;
    let regionTotal: number | null = null;

    if (school.region_sido) {
      // Get all orgs in same region that have members
      const { data: regionOrgs } = await supabase
        .from("organizations")
        .select("id, member_count")
        .eq("region_sido", school.region_sido)
        .gt("member_count", 0);

      if (regionOrgs && regionOrgs.length > 0) {
        regionTotal = regionOrgs.length;

        // Calculate avg tier_numeric for each org
        const orgScores: Array<{ orgId: string; avgTier: number }> = [];

        for (const org of regionOrgs) {
          const { data: orgLinks } = await supabase
            .from("account_organizations")
            .select("game_account_id")
            .eq("organization_id", org.id);

          if (orgLinks && orgLinks.length > 0) {
            const orgAccountIds = orgLinks.map((l) => l.game_account_id);
            const { data: orgMembers } = await supabase
              .from("game_accounts")
              .select("tier_numeric")
              .eq("game_type", gameType)
              .in("id", orgAccountIds);

            if (orgMembers && orgMembers.length > 0) {
              const avg = orgMembers.reduce((sum, m) => sum + (m.tier_numeric ?? 0), 0) / orgMembers.length;
              orgScores.push({ orgId: org.id, avgTier: avg });
            }
          }
        }

        // Sort by avgTier descending
        orgScores.sort((a, b) => b.avgTier - a.avgTier);
        const myIndex = orgScores.findIndex((o) => o.orgId === id);
        regionRank = myIndex >= 0 ? myIndex + 1 : null;
        regionTotal = orgScores.length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        school: {
          id: school.id,
          name: school.name,
          type: school.type,
          schoolLevel: school.school_level,
          regionSido: school.region_sido,
          regionSigungu: school.region_sigungu,
          memberCount: school.member_count,
        },
        leaderboard,
        totalMembers,
        hasMore,
        page,
        limit,
        regionRanking: regionRank !== null ? {
          rank: regionRank,
          total: regionTotal,
          region: school.region_sido,
        } : null,
      },
    });
  } catch (error) {
    console.error("School detail error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
