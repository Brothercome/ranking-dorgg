import { NextRequest, NextResponse } from "next/server";
import { searchPlayersFromOpgg } from "@/lib/api/opgg";
import { checkRateLimit } from "@/lib/cache/rate-limit";

/**
 * 이름 기반 플레이어 검색 (tag 없이).
 * op.gg multisearch로 후보들을 가져옵니다.
 * DB에 저장하지 않고 후보 목록만 반환 — 실제 DB 저장은 유저가 후보를 선택했을 때 /api/search/lol 에서 처리.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const results = await searchPlayersFromOpgg(q, 5);
    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        gameType: "lol" as const,
        gameName: r.gameName,
        tagLine: r.tagLine,
        tier: r.tier,
        level: r.level,
      })),
    });
  } catch (error) {
    console.error("[search/lookup] error:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}
