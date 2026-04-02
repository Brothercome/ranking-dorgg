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

    // Search our DB
    const { data: dbSchools } = await supabase
      .from("organizations")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(10);

    // Also search NEIS for new schools
    const neisResults = await searchSchools(query);

    // Merge: insert new schools from NEIS
    const dbNames = new Set((dbSchools ?? []).map((s) => s.normalized_name));
    const newSchools = neisResults.filter(
      (s) => !dbNames.has(s.name.replace(/\s+/g, "").toLowerCase())
    );

    for (const school of newSchools) {
      await supabase
        .from("organizations")
        .upsert({
          type: "school",
          name: school.name,
          normalized_name: school.name.replace(/\s+/g, "").toLowerCase(),
          school_code: school.schoolCode,
          school_level: school.level,
          region_sido: school.region,
        }, { onConflict: "type,normalized_name" });
    }

    // Re-fetch merged results
    let q = supabase
      .from("organizations")
      .select("id, name, school_level, region_sido, member_count")
      .ilike("name", `%${query}%`)
      .limit(20);

    if (level) {
      q = q.eq("school_level", level);
    }

    const { data: allSchools } = await q;

    return NextResponse.json({
      success: true,
      data: (allSchools ?? []).map((s) => ({
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
