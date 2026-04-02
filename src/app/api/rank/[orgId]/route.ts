import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { computeRanking } from "@/lib/ranking/compute";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const registerSchema = z.object({
  gameAccountId: z.string().uuid(),
  gameType: z.enum(["valorant", "lol"]),
});

const orgIdSchema = z.string().uuid();
const VALID_GAMES: GameType[] = ["valorant", "lol"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { orgId } = await params;
    if (!orgIdSchema.safeParse(orgId).success) {
      return NextResponse.json(
        { success: false, error: "잘못된 학교 ID입니다" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다" },
        { status: 400 }
      );
    }

    const { gameAccountId, gameType } = parsed.data;

    // Check org exists
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .single();

    if (!org) {
      return NextResponse.json(
        { success: false, error: "학교를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Link account to org (upsert)
    await supabase
      .from("account_organizations")
      .upsert(
        { game_account_id: gameAccountId, organization_id: orgId },
        { onConflict: "game_account_id,organization_id" }
      );

    // Update member count atomically
    const { count } = await supabase
      .from("account_organizations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    await supabase
      .from("organizations")
      .update({ member_count: count ?? 0 })
      .eq("id", orgId);

    // Compute ranking
    const ranking = await computeRanking(orgId, gameType, gameAccountId);

    return NextResponse.json({ success: true, data: ranking });
  } catch (error) {
    console.error("Rank error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { orgId } = await params;
    if (!orgIdSchema.safeParse(orgId).success) {
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
    const gameAccountId = searchParams.get("accountId") ?? undefined;

    const ranking = await computeRanking(orgId, gameType, gameAccountId);

    if (!ranking) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "아직 등록된 플레이어가 없습니다",
      });
    }

    return NextResponse.json({ success: true, data: ranking });
  } catch (error) {
    console.error("Rank GET error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
