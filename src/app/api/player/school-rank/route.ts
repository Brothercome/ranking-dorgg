import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { computeRanking } from "@/lib/ranking/compute";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType");
    const gameName = searchParams.get("gameName");
    const tagLine = searchParams.get("tagLine");

    if (!gameType || !gameName || !tagLine) {
      return NextResponse.json(
        { success: false, error: "gameType, gameName, tagLine은 필수입니다" },
        { status: 400 }
      );
    }

    if (!VALID_GAMES.includes(gameType as GameType)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 게임입니다" },
        { status: 400 }
      );
    }

    // 1. Find the game_account by game_type + game_name + tag_line
    const { data: gameAccount } = await supabase
      .from("game_accounts")
      .select("id")
      .eq("game_type", gameType)
      .eq("game_name", gameName)
      .eq("tag_line", tagLine)
      .single();

    if (!gameAccount) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Find linked organizations via account_organizations
    const { data: links } = await supabase
      .from("account_organizations")
      .select("organization_id")
      .eq("game_account_id", gameAccount.id);

    if (!links || links.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const orgIds = links.map((l) => l.organization_id);

    // Fetch org metadata
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, school_level, region_sido")
      .in("id", orgIds);

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 3. Compute ranking for each org
    const results = await Promise.all(
      orgs.map(async (org) => {
        const ranking = await computeRanking(
          org.id,
          gameType as GameType,
          gameAccount.id
        );
        return {
          organizationId: org.id,
          organizationName: org.name,
          schoolLevel: org.school_level ?? null,
          region: org.region_sido ?? null,
          myRank: ranking?.myRank?.rank ?? null,
          totalParticipants: ranking?.totalParticipants ?? 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("School rank GET error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
