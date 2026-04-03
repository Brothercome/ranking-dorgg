import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/cache/rate-limit";
import type { GameType } from "@/types/game";

const VALID_GAMES: GameType[] = ["valorant", "lol"];
const VALID_TABS = ["schools", "players"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sido: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { sido: rawSido } = await params;
    const sido = decodeURIComponent(rawSido);

    const { searchParams } = new URL(request.url);
    const gameParam = searchParams.get("game") ?? "lol";
    if (!VALID_GAMES.includes(gameParam as GameType)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 게임입니다" },
        { status: 400 }
      );
    }
    const gameType = gameParam as GameType;

    const tab = searchParams.get("tab") ?? "schools";
    if (!VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 탭입니다" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    // Step 1: Get all orgs + all links in parallel
    const [orgsRes, allLinksRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, member_count")
        .eq("region_sido", sido)
        .gt("member_count", 0),
      supabase
        .from("account_organizations")
        .select("game_account_id, organization_id"),
    ]);

    const regionOrgs = orgsRes.data ?? [];
    if (regionOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          schoolRankings: tab === "schools" ? [] : undefined,
          playerRankings: tab === "players" ? [] : undefined,
          totalSchools: 0,
          totalPlayers: 0,
          hasMore: false,
          page,
          limit,
        },
      });
    }

    const orgIdSet = new Set(regionOrgs.map((o) => o.id));
    const links = (allLinksRes.data ?? []).filter((l) => orgIdSet.has(l.organization_id));
    const allAccountIds = [...new Set(links.map((l) => l.game_account_id))];

    if (allAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          schoolRankings: tab === "schools" ? [] : undefined,
          playerRankings: tab === "players" ? [] : undefined,
          totalSchools: regionOrgs.length,
          totalPlayers: 0,
          hasMore: false,
          page,
          limit,
        },
      });
    }

    // Step 2: Get ALL game accounts for this region + game type in ONE query
    const { data: allAccounts } = await supabase
      .from("game_accounts")
      .select("id, game_name, tag_line, current_tier, current_rank, current_points, tier_numeric")
      .eq("game_type", gameType)
      .in("id", allAccountIds)
      .order("tier_numeric", { ascending: false });

    const accounts = allAccounts ?? [];
    const totalPlayers = accounts.length;

    // Build account→org map
    const accountOrgMap = new Map<string, string>();
    const accountOrgIdMap = new Map<string, string>();
    for (const link of links) {
      const org = regionOrgs.find((o) => o.id === link.organization_id);
      if (org) {
        accountOrgMap.set(link.game_account_id, org.name);
        accountOrgIdMap.set(link.game_account_id, org.id);
      }
    }

    if (tab === "schools") {
      // Group accounts by org, calculate avg tier in memory
      const orgScores = new Map<string, { name: string; total: number; count: number }>();

      for (const account of accounts) {
        const orgId = accountOrgIdMap.get(account.id);
        if (!orgId) continue;
        const existing = orgScores.get(orgId);
        if (existing) {
          existing.total += account.tier_numeric ?? 0;
          existing.count++;
        } else {
          const org = regionOrgs.find((o) => o.id === orgId);
          orgScores.set(orgId, {
            name: org?.name ?? "",
            total: account.tier_numeric ?? 0,
            count: 1,
          });
        }
      }

      const sorted = Array.from(orgScores.entries())
        .map(([orgId, s]) => ({
          orgId,
          name: s.name,
          avgTier: s.total / s.count,
          memberCount: s.count,
        }))
        .sort((a, b) => b.avgTier - a.avgTier);

      const totalSchools = sorted.length;
      const paginated = sorted.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: {
          region: sido,
          schoolRankings: paginated.map((s, idx) => ({
            rank: offset + idx + 1,
            schoolId: s.orgId,
            schoolName: s.name,
            avgTier: Math.round(s.avgTier * 100) / 100,
            memberCount: s.memberCount,
          })),
          totalSchools,
          totalPlayers,
          hasMore: offset + limit < totalSchools,
          page,
          limit,
        },
      });
    }

    // tab === "players"
    const paginated = accounts.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        region: sido,
        playerRankings: paginated.map((p, idx) => ({
          rank: offset + idx + 1,
          gameAccountId: p.id,
          gameName: p.game_name,
          tagLine: p.tag_line,
          tier: p.current_tier ?? "UNRANKED",
          tierRank: p.current_rank ?? "",
          points: p.current_points ?? 0,
          tierNumeric: p.tier_numeric ?? 0,
          schoolName: accountOrgMap.get(p.id) ?? "",
        })),
        totalSchools: regionOrgs.length,
        totalPlayers,
        hasMore: offset + limit < totalPlayers,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Region detail error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
