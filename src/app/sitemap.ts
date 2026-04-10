import type { MetadataRoute } from "next";
import { supabase } from "@/lib/db";
import { schoolHref } from "@/lib/seo/school-url";

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ];

  const [schoolsRes, playersRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, member_count")
      .order("member_count", { ascending: false })
      .limit(5000),
    supabase
      .from("game_accounts")
      .select("game_name, tag_line, last_updated_at, tier_numeric")
      .order("tier_numeric", { ascending: false })
      .limit(10000),
  ]);

  const schoolRoutes: MetadataRoute.Sitemap = (schoolsRes.data ?? []).map((s: { name: string }) => ({
    url: `${SITE_URL}${schoolHref(s.name)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const playerRoutes: MetadataRoute.Sitemap = (playersRes.data ?? []).map(
    (p: { game_name: string; tag_line: string; last_updated_at: string | null }) => ({
      url: `${SITE_URL}/player/${encodeURIComponent(p.game_name)}-${encodeURIComponent(p.tag_line)}`,
      lastModified: p.last_updated_at ? new Date(p.last_updated_at) : now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })
  );

  return [...staticRoutes, ...schoolRoutes, ...playerRoutes];
}
