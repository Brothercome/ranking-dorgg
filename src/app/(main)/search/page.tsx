import type { Metadata } from "next";
import SearchClient from "./search-client";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return {
      title: "검색",
      description: "학교 이름이나 롤·발로란트 게임 아이디로 우리 학교 교내 랭킹을 찾아보세요.",
      alternates: { canonical: "/search" },
    };
  }

  const title = `${query} 검색 결과`;
  const description = `${query}와(과) 일치하는 학교, 롤·발로란트 플레이어 랭킹을 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
    openGraph: { title, description, type: "website", siteName: "랭킹도르그", locale: "ko_KR" },
    twitter: { card: "summary", title, description },
    robots: { index: false, follow: true },
  };
}

export default function SearchPage() {
  return <SearchClient />;
}
