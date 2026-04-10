import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/db";
import { SchoolLeaderboard } from "@/components/ranking/school-leaderboard";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";

// ISR: 1시간마다 재생성 (DB 변경이 자주 없는 페이지)
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// React cache로 같은 요청 내에서 generateMetadata와 SchoolPage 쿼리 중복 제거
const getSchool = cache(async (id: string) => {
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();
  return data;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const school = await getSchool(id);

  const schoolName = school?.name ?? "학교";
  const region = school?.region_sido ?? "";

  return {
    title: `${schoolName} 게임 랭킹 - 랭킹도르그`,
    description: `${schoolName}${region ? ` (${region})` : ""} 학생들의 게임 랭킹을 확인하세요. 리그 오브 레전드, 발로란트 교내 순위!`,
    openGraph: {
      title: `${schoolName} 게임 랭킹 - 랭킹도르그`,
      description: `${schoolName} 학생들의 게임 랭킹을 확인하세요.`,
      siteName: "랭킹도르그",
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function SchoolPage({ params }: PageProps) {
  const { id } = await params;
  const school = await getSchool(id);

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

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
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
