import { NextRequest, NextResponse } from "next/server";
import { searchSchools } from "@/lib/api/neis";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";
import { checkRateLimit } from "@/lib/cache/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").replace(/[^가-힣a-zA-Z0-9\s]/g, "").slice(0, 30);
    const level = searchParams.get("level") as "middle" | "high" | "university" | null;

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // First check our DB for existing schools
    const dbSchools = await db
      .select()
      .from(organizations)
      .where(ilike(organizations.name, `%${query}%`))
      .limit(10);

    // Also search NEIS for new schools
    const neisResults = await searchSchools(query);

    // Merge: DB results first, then NEIS results not already in DB
    const dbNames = new Set(dbSchools.map((s) => s.normalizedName));
    const newSchools = neisResults.filter(
      (s) => !dbNames.has(s.name.replace(/\s+/g, "").toLowerCase())
    );

    // Insert new schools into DB
    for (const school of newSchools) {
      try {
        await db
          .insert(organizations)
          .values({
            type: "school",
            name: school.name,
            normalizedName: school.name.replace(/\s+/g, "").toLowerCase(),
            schoolCode: school.schoolCode,
            schoolLevel: school.level,
            regionSido: school.region,
          })
          .onConflictDoNothing();
      } catch {
        // ignore duplicate conflicts
      }
    }

    // Re-fetch merged results
    const allSchools = await db
      .select()
      .from(organizations)
      .where(ilike(organizations.name, `%${query}%`))
      .limit(20);

    const filtered = level
      ? allSchools.filter((s) => s.schoolLevel === level)
      : allSchools;

    return NextResponse.json({
      success: true,
      data: filtered.map((s) => ({
        id: s.id,
        name: s.name,
        level: s.schoolLevel,
        region: s.regionSido,
        memberCount: s.memberCount,
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
