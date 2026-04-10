import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGameAdapter } from "@/lib/api/game-adapter";
import { searchFromOpgg } from "@/lib/api/opgg";
import { henrikApiClient } from "@/lib/api/henrik";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import { invalidateCache } from "@/lib/cache/redis";
import type { GameType, GameProfile } from "@/types/game";

const searchSchema = z.object({
  gameName: z.string().min(1).max(50),
  tagLine: z.string().min(1).max(10),
  refresh: z.boolean().optional(),
});

const VALID_GAMES: GameType[] = ["valorant", "lol"];
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1시간
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000; // 30분

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

    const { gameName, tagLine, refresh } = parsed.data;
    const gameType = game as GameType;

    // Step 1: DB에서 기존 데이터 확인
    const { data: existing } = await supabase
      .from("game_accounts")
      .select("*")
      .eq("game_type", gameType)
      .ilike("game_name", gameName)
      .ilike("tag_line", tagLine)
      .limit(1);

    const dbRecord = existing?.[0];
    const now = Date.now();
    const lastUpdated = dbRecord?.last_updated_at
      ? new Date(dbRecord.last_updated_at).getTime()
      : 0;
    const isFresh = dbRecord && (now - lastUpdated) < STALE_THRESHOLD_MS;

    // Refresh 요청 시 쿨다운 검증 (30분)
    if (refresh && dbRecord) {
      const elapsed = now - lastUpdated;
      if (elapsed < REFRESH_COOLDOWN_MS) {
        return NextResponse.json(
          {
            success: false,
            error: "갱신 쿨다운 중입니다",
            cooldownRemaining: REFRESH_COOLDOWN_MS - elapsed,
          },
          { status: 429 }
        );
      }
      // Bypass fresh check by clearing in-memory cache
      await invalidateCache(`search:${gameType}:*`);
    }

    // Step 2: 1시간 이내 데이터 → DB에서 바로 반환 (단, refresh 요청이 아닐 때만)
    if (!refresh && isFresh && dbRecord) {
      return NextResponse.json({
        success: true,
        data: {
          gameType,
          gameName: dbRecord.game_name,
          tagLine: dbRecord.tag_line,
          puuid: dbRecord.puuid,
          tier: dbRecord.current_tier,
          rank: dbRecord.current_rank,
          points: dbRecord.current_points,
          wins: dbRecord.wins,
          losses: dbRecord.losses,
          tierNumeric: dbRecord.tier_numeric,
          raw: dbRecord.raw_rank_data,
          gameAccountId: dbRecord.id,
          lastUpdatedAt: dbRecord.last_updated_at,
          cached: true,
        },
      });
    }

    // Step 3: API로 최신 데이터 가져오기
    let profile: GameProfile | null = null;

    // 3a: 공식 API 시도
    try {
      const adapter = getGameAdapter(gameType);
      profile = await adapter.searchPlayer(gameName, tagLine);
    } catch (e) {
      console.warn(`[search] ${gameType} API failed:`, e);
    }

    // 3b: LoL이고 공식 API 실패 시 op.gg fallback
    if (!profile && gameType === "lol") {
      try {
        profile = await searchFromOpgg(gameName, tagLine);
        if (profile) console.log(`[search] op.gg fallback success: ${gameName}#${tagLine}`);
      } catch (e) {
        console.warn("[search] op.gg fallback failed:", e);
      }
    }

    // 3b-2: Valorant이고 Riot API 실패 시 Henrik fallback
    if (!profile && gameType === "valorant") {
      try {
        profile = await henrikApiClient.searchPlayer(gameName, tagLine);
        if (profile) console.log(`[search] henrik fallback success: ${gameName}#${tagLine}`);
      } catch (e) {
        console.warn("[search] henrik fallback failed:", e);
      }
    }

    // 3c: 모든 API 실패했지만 DB에 오래된 데이터가 있으면 반환
    if (!profile && dbRecord) {
      return NextResponse.json({
        success: true,
        data: {
          gameType,
          gameName: dbRecord.game_name,
          tagLine: dbRecord.tag_line,
          puuid: dbRecord.puuid,
          tier: dbRecord.current_tier,
          rank: dbRecord.current_rank,
          points: dbRecord.current_points,
          wins: dbRecord.wins,
          losses: dbRecord.losses,
          tierNumeric: dbRecord.tier_numeric,
          raw: dbRecord.raw_rank_data,
          gameAccountId: dbRecord.id,
          cached: true,
          stale: true,
        },
      });
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "플레이어를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Step 4: DB에 저장/갱신
    let gameAccountId: string;
    const winRate = profile.wins + profile.losses > 0
      ? profile.wins / (profile.wins + profile.losses)
      : 0;

    if (dbRecord) {
      await supabase
        .from("game_accounts")
        .update({
          puuid: profile.puuid,
          game_name: profile.gameName,
          tag_line: profile.tagLine,
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
        .eq("id", dbRecord.id);
      gameAccountId = dbRecord.id;
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
      data: { ...profile, gameAccountId, lastUpdatedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
