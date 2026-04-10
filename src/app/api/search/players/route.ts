import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    if (!q) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search cached game accounts by name (case-insensitive prefix + contains)
    const { data, error } = await supabase
      .from("game_accounts")
      .select("id, game_type, game_name, tag_line, current_tier, current_rank, current_points, tier_numeric, wins, losses, raw_rank_data")
      .ilike("game_name", `${q}%`)
      .order("tier_numeric", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Player search error:", error);
      return NextResponse.json({ success: false, error: "검색 중 오류가 발생했습니다" }, { status: 500 });
    }

    const results = (data ?? []).map((row) => {
      // Extract profileIconId from raw data if available
      const raw = row.raw_rank_data as { summoner?: { profileIconId?: number } } | null;
      const profileIconId = raw?.summoner?.profileIconId;
      const profileIconUrl = profileIconId !== undefined
        ? `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${profileIconId}.png`
        : undefined;

      return {
        gameAccountId: row.id,
        gameType: row.game_type,
        gameName: row.game_name,
        tagLine: row.tag_line,
        tier: row.current_tier ?? "UNRANKED",
        rank: row.current_rank ?? "",
        points: row.current_points ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        tierNumeric: row.tier_numeric ?? 0,
        profileIconUrl,
      };
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Player search error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
