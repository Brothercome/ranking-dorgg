import type { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/db";
import { SchoolLeaderboard } from "@/components/ranking/school-leaderboard";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";
import { isUuid, schoolHref } from "@/lib/seo/school-url";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

type School = {
  id: string;
  name: string;
  school_level: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  member_count: number | null;
};

const getSchoolByIdOrSlug = cache(async (idOrSlug: string): Promise<School | null> => {
  if (isUuid(idOrSlug)) {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, school_level, region_sido, region_sigungu, member_count")
      .eq("id", idOrSlug)
      .single();
    return data as School | null;
  }

  // Next.js already decodes dynamic route params, so idOrSlug is the raw name.
  const { data } = await supabase
    .from("organizations")
    .select("id, name, school_level, region_sido, region_sigungu, member_count")
    .eq("name", idOrSlug)
    .order("member_count", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as School | null;
});

const LEVEL_LABEL: Record<string, string> = {
  middle: "중학교",
  high: "고등학교",
  university: "대학교",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const school = await getSchoolByIdOrSlug(id);

  if (!school) {
    return { title: "학교 찾기" };
  }

  const levelLabel = school.school_level ? LEVEL_LABEL[school.school_level] ?? "" : "";
  const regionFull = [school.region_sido, school.region_sigungu].filter(Boolean).join(" ");
  const regionTag = regionFull ? `(${regionFull})` : "";

  const title = `${school.name} ${levelLabel} 랭킹 ${regionTag}`.trim();
  const description = `${regionFull} ${school.name} ${levelLabel} 학생들의 실시간 롤·발로란트 교내 랭킹. 친구들과 티어·점수를 비교해보세요.`.trim();
  const canonical = schoolHref(school.name);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "랭킹 도르",
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SchoolPage({ params }: PageProps) {
  const { id } = await params;
  const school = await getSchoolByIdOrSlug(id);

  // Redirect legacy UUID URLs → canonical slug URL
  if (school && isUuid(id)) {
    redirect(schoolHref(school.name));
  }

  if (!school) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <p className="text-4xl mb-4">🏫</p>
        <p className="text-muted-foreground mb-4">학교를 찾을 수 없습니다</p>
        <a href="/" className="text-primary hover:underline text-sm">
          처음으로 돌아가기
        </a>
      </main>
    );
  }

  const regionFull = [school.region_sido, school.region_sigungu].filter(Boolean).join(" ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.name,
    address: regionFull
      ? {
          "@type": "PostalAddress",
          addressRegion: school.region_sido ?? undefined,
          addressLocality: school.region_sigungu ?? undefined,
          addressCountry: "KR",
        }
      : undefined,
  };

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SchoolLeaderboard
        schoolId={school.id}
        schoolName={school.name}
        schoolLevel={school.school_level}
        regionSido={school.region_sido}
        regionSigungu={school.region_sigungu}
        memberCount={school.member_count ?? 0}
      />
      <div className="w-full max-w-4xl mt-6">
        <DorggCtaBanner
          placement="school_page"
          headline={`${school.name} 공식 커뮤니티`}
          sub="학교 친구들이랑 실시간 채팅 · 전교 랭킹 · 대항전"
        />
      </div>
    </main>
  );
}
