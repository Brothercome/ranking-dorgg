import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/db";
import { GAME_LABELS, LOL_TIER_KOREAN, VALORANT_TIER_KOREAN } from "@/types/game";
import type { GameType } from "@/types/game";
import PlayerClient from "./player-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function parseSlug(slug: string): { gameName: string; tagLine: string } | null {
  const decoded = decodeURIComponent(slug);
  const lastDash = decoded.lastIndexOf("-");
  if (lastDash <= 0) return null;
  return {
    gameName: decoded.slice(0, lastDash),
    tagLine: decoded.slice(lastDash + 1),
  };
}

interface PlayerMeta {
  gameName: string;
  tagLine: string;
  gameType: GameType;
  tier: string;
  tierRank: string | null;
  schoolName: string | null;
}

const getPlayerMeta = cache(async (gameName: string, tagLine: string): Promise<PlayerMeta[]> => {
  const { data: accounts } = await supabase
    .from("game_accounts")
    .select("id, game_type, game_name, tag_line, current_tier, current_rank")
    .eq("game_name", gameName)
    .eq("tag_line", tagLine);

  if (!accounts || accounts.length === 0) return [];

  const ids = accounts.map((a: { id: string }) => a.id);
  const { data: memberships } = await supabase
    .from("account_organizations")
    .select("game_account_id, organizations(name)")
    .in("game_account_id", ids);

  const orgByAccount = new Map<string, string>();
  (memberships ?? []).forEach((m: { game_account_id: string; organizations: { name: string } | { name: string }[] | null }) => {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    if (org?.name) orgByAccount.set(m.game_account_id, org.name);
  });

  return accounts.map((a: { id: string; game_type: string; game_name: string; tag_line: string; current_tier: string | null; current_rank: string | null }) => ({
    gameName: a.game_name,
    tagLine: a.tag_line,
    gameType: a.game_type as GameType,
    tier: a.current_tier ?? "UNRANKED",
    tierRank: a.current_rank,
    schoolName: orgByAccount.get(a.id) ?? null,
  }));
});

function koreanTier(gameType: GameType, tier: string): string {
  if (!tier || tier === "UNRANKED" || tier === "Unranked") return "언랭";
  return gameType === "lol"
    ? LOL_TIER_KOREAN[tier] ?? tier
    : VALORANT_TIER_KOREAN[tier] ?? tier;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) {
    return {
      title: "플레이어 찾기",
      description: "게임 아이디를 검색하고 우리 학교에서 내 등수를 확인하세요.",
    };
  }

  const { gameName, tagLine } = parsed;
  const metas = await getPlayerMeta(gameName, tagLine);
  const canonical = `/player/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;

  if (metas.length === 0) {
    const title = `${gameName}#${tagLine} 전적 조회`;
    const description = `${gameName}#${tagLine}의 롤·발로란트 전적과 학교 랭킹을 확인하세요.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: "profile" },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  const schoolName = metas.find((m) => m.schoolName)?.schoolName ?? null;
  const gameSummaries = metas
    .map((m) => `${GAME_LABELS[m.gameType]} ${koreanTier(m.gameType, m.tier)}${m.tierRank ? ` ${m.tierRank}` : ""}`)
    .join(" · ");

  const titleCore = `${gameName}#${tagLine} - ${gameSummaries}`;
  const title = schoolName ? `${titleCore} (${schoolName})` : titleCore;
  const description = schoolName
    ? `${schoolName} ${gameName}#${tagLine}의 ${gameSummaries} 전적과 교내 랭킹을 확인하세요.`
    : `${gameName}#${tagLine}의 ${gameSummaries} 전적과 학교 랭킹을 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      siteName: "랭킹도르그",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug } = await params;
  const parsed = parseSlug(slug);

  // JSON-LD for richer search results
  const jsonLd = parsed
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: `${parsed.gameName}#${parsed.tagLine}`,
          alternateName: parsed.gameName,
          identifier: `${parsed.gameName}#${parsed.tagLine}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PlayerClient />
    </>
  );
}
