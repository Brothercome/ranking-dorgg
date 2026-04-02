import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGameAdapter } from "@/lib/api/game-adapter";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const searchSchema = z.object({
  gameName: z.string().min(1).max(50),
  tagLine: z.string().min(1).max(10),
});

const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { game } = await params;
    if (!VALID_GAMES.includes(game as GameType)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 게임입니다" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "게임 닉네임과 태그를 입력해주세요" },
        { status: 400 }
      );
    }

    const { gameName, tagLine } = parsed.data;
    const gameType = game as GameType;
    const adapter = getGameAdapter(gameType);
    const profile = await adapter.searchPlayer(gameName, tagLine);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "플레이어를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Upsert game account in DB
    const { data: existing } = await supabase
      .from("game_accounts")
      .select("id")
      .eq("game_type", gameType)
      .eq("game_name", profile.gameName)
      .eq("tag_line", profile.tagLine)
      .limit(1);

    let gameAccountId: string;
    const winRate = profile.wins + profile.losses > 0
      ? profile.wins / (profile.wins + profile.losses)
      : 0;

    if (existing && existing.length > 0) {
      await supabase
        .from("game_accounts")
        .update({
          puuid: profile.puuid,
          current_tier: profile.tier,
          current_rank: profile.rank,
          current_points: profile.points,
          tier_numeric: profile.tierNumeric,
          wins: profile.wins,
          losses: profile.losses,
          win_rate: winRate,
          raw_rank_data: profile.raw,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
      gameAccountId = existing[0].id;
    } else {
      const { data: inserted } = await supabase
        .from("game_accounts")
        .insert({
          game_type: gameType,
          game_name: profile.gameName,
          tag_line: profile.tagLine,
          puuid: profile.puuid,
          current_tier: profile.tier,
          current_rank: profile.rank,
          current_points: profile.points,
          tier_numeric: profile.tierNumeric,
          wins: profile.wins,
          losses: profile.losses,
          win_rate: winRate,
          raw_rank_data: profile.raw,
        })
        .select("id")
        .single();
      gameAccountId = inserted!.id;
    }

    return NextResponse.json({
      success: true,
      data: { ...profile, gameAccountId },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
