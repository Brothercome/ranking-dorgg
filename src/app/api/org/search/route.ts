import { NextRequest, NextResponse } from "next/server";
import { searchSchools } from "@/lib/api/neis";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s]/g, "").slice(0, 30);
    const level = searchParams.get("level") as "middle" | "high" | "university" | null;

    if (query.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search DB first (fast)
    let q = supabase
      .from("organizations")
      .select("id, name, school_level, region_sido, member_count")
      .ilike("name", `%${query}%`)
      .limit(10);

    if (level) {
      q = q.eq("school_level", level);
    }

    const { data: allSchools } = await q;

    // Sort: exact match → starts with → contains
    const queryLower = query.toLowerCase();
    const sorted = (allSchools ?? []).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aExact = aName === queryLower ? 0 : 1;
      const bExact = bName === queryLower ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = aName.startsWith(queryLower) ? 0 : 1;
      const bStarts = bName.startsWith(queryLower) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      // Shorter names first (more relevant)
      return a.name.length - b.name.length;
    });

    return NextResponse.json({
      success: true,
      data: sorted.slice(0, 10).map((s) => ({
        id: s.id,
        name: s.name,
        level: s.school_level,
        region: s.region_sido,
        memberCount: s.member_count,
      })),
    });
  } catch (error) {
    console.error("Org search error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
