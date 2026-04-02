import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGameAdapter } from "@/lib/api/game-adapter";
import { db } from "@/lib/db";
import { gameAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    const existing = await db
      .select()
      .from(gameAccounts)
      .where(
        and(
          eq(gameAccounts.gameType, gameType),
          eq(gameAccounts.gameName, profile.gameName),
          eq(gameAccounts.tagLine, profile.tagLine)
        )
      )
      .limit(1);

    let gameAccountId: string;

    if (existing.length > 0) {
      await db
        .update(gameAccounts)
        .set({
          puuid: profile.puuid,
          currentTier: profile.tier,
          currentRank: profile.rank,
          currentPoints: profile.points,
          tierNumeric: profile.tierNumeric,
          wins: profile.wins,
          losses: profile.losses,
          winRate: profile.wins + profile.losses > 0
            ? profile.wins / (profile.wins + profile.losses)
            : 0,
          rawRankData: profile.raw,
          lastUpdatedAt: new Date(),
        })
        .where(eq(gameAccounts.id, existing[0].id));
      gameAccountId = existing[0].id;
    } else {
      const inserted = await db
        .insert(gameAccounts)
        .values({
          gameType,
          gameName: profile.gameName,
          tagLine: profile.tagLine,
          puuid: profile.puuid,
          currentTier: profile.tier,
          currentRank: profile.rank,
          currentPoints: profile.points,
          tierNumeric: profile.tierNumeric,
          wins: profile.wins,
          losses: profile.losses,
          winRate: profile.wins + profile.losses > 0
            ? profile.wins / (profile.wins + profile.losses)
            : 0,
          rawRankData: profile.raw,
        })
        .returning({ id: gameAccounts.id });
      gameAccountId = inserted[0].id;
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
