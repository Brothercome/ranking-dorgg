import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGameAdapter } from "@/lib/api/game-adapter";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const matchSchema = z.object({
  puuid: z.string().min(1),
  gameName: z.string().min(1).max(50),
  tagLine: z.string().min(1).max(10),
  count: z.number().min(1).max(20).optional().default(10),
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
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

    const { puuid, gameName, tagLine, count } = parsed.data;
    const gameType = game as GameType;
    const adapter = getGameAdapter(gameType);

    try {
      const matches = await adapter.getMatchHistory(puuid, gameName, tagLine, count);
      return NextResponse.json({ success: true, data: matches });
    } catch (apiError) {
      // API 실패 시 빈 배열로 graceful degradation
      console.warn(`[matches] ${gameType} API failed:`, apiError);
      return NextResponse.json({ success: true, data: [], apiFailed: true });
    }
  } catch (error) {
    console.error("Match history error:", error);
    return NextResponse.json(
      { success: false, error: "전적 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
