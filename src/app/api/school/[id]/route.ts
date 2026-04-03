import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import { getTierScore } from "@/lib/ranking/normalize";
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

    // Fetch school + linked accounts in parallel
    const [schoolRes, linksRes] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", id).single(),
      supabase.from("account_organizations").select("game_account_id").eq("organization_id", id),
    ]);

    if (schoolRes.error || !schoolRes.data) {
      return NextResponse.json(
        { success: false, error: "학교를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const school = schoolRes.data;
    const accountIds = (linksRes.data ?? []).map((l) => l.game_account_id);

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
    let schoolScore = 0;

    if (accountIds.length > 0) {
      // Fetch count + leaderboard + all tiers in parallel
      const [countRes, membersRes, allTiersRes] = await Promise.all([
        supabase
          .from("game_accounts")
          .select("id", { count: "exact", head: true })
          .eq("game_type", gameType)
          .in("id", accountIds),
        supabase
          .from("game_accounts")
          .select("id, game_name, tag_line, current_tier, current_rank, current_points, tier_numeric")
          .eq("game_type", gameType)
          .in("id", accountIds)
          .order("tier_numeric", { ascending: false })
          .range(offset, offset + limit - 1),
        supabase
          .from("game_accounts")
          .select("current_tier")
          .eq("game_type", gameType)
          .in("id", accountIds),
      ]);

      totalMembers = countRes.count ?? 0;

      leaderboard = (membersRes.data ?? []).map((m, idx) => ({
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

      schoolScore = (allTiersRes.data ?? []).reduce(
        (sum, m) => sum + getTierScore(gameType, m.current_tier ?? ""),
        0
      );
    }

    // Region ranking: simple count of schools with more members (no N+1 loop)
    let regionRanking: { rank: number; total: number; region: string } | null = null;

    if (school.region_sido && school.member_count > 0) {
      const [higherRes, totalRes] = await Promise.all([
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("region_sido", school.region_sido)
          .gt("member_count", school.member_count),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("region_sido", school.region_sido)
          .gt("member_count", 0),
      ]);

      regionRanking = {
        rank: (higherRes.count ?? 0) + 1,
        total: totalRes.count ?? 0,
        region: school.region_sido,
      };
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
        schoolScore,
        leaderboard,
        totalMembers,
        hasMore,
        page,
        limit,
        regionRanking,
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
