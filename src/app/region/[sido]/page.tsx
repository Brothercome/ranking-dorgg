import type { Metadata } from "next";
import { RegionLeaderboard } from "@/components/ranking/region-leaderboard";

interface PageProps {
  params: Promise<{ sido: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sido } = await params;
  const region = decodeURIComponent(sido);

  return {
    title: `${region} 게임 랭킹 - 랭킹도르그`,
    description: `${region} 지역 학교 및 플레이어 게임 랭킹을 확인하세요. 리그 오브 레전드, 발로란트 지역 순위!`,
    openGraph: {
      title: `${region} 게임 랭킹 - 랭킹도르그`,
      description: `${region} 지역 학교 및 플레이어 게임 랭킹을 확인하세요.`,
      siteName: "랭킹도르그",
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function RegionPage({ params }: PageProps) {
  const { sido } = await params;
  const region = decodeURIComponent(sido);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <RegionLeaderboard region={region} />
    </main>
  );
}
