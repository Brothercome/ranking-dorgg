import type { Metadata } from "next";
import Link from "next/link";

interface SharePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string; game?: string; name?: string; tier?: string; rank?: string; total?: string; school?: string }>;
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const sp = await searchParams;
  const name = sp.name ?? "Player";
  const school = sp.school ?? "학교";
  const rank = sp.rank ?? "?";
  const total = sp.total ?? "?";
  const tier = sp.tier ?? "";
  const game = sp.game ?? "lol";

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";
  const ogUrl = `${baseUrl}/api/og/share?name=${encodeURIComponent(name)}&tier=${encodeURIComponent(tier)}&rank=${rank}&total=${total}&school=${encodeURIComponent(school)}&game=${game}`;

  return {
    title: `${name} - ${school}에서 ${rank}등! | 랭킹도르그`,
    description: `${name}님은 ${school}에서 ${total}명 중 ${rank}등! 나도 우리 학교 랭킹 확인하기`,
    openGraph: {
      title: `${school}에서 ${rank}등! 🎮`,
      description: `${name} | ${tier} | ${total}명 중 ${rank}등`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${school}에서 ${rank}등!`,
      description: `${name} | ${tier}`,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  void params; // id available for future use
  const sp = await searchParams;
  const name = sp.name ?? "Player";
  const school = sp.school ?? "학교";
  const rank = sp.rank ?? "?";
  const total = sp.total ?? "?";
  const tier = sp.tier ?? "";
  const game = sp.game ?? "lol";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          랭킹도르그
        </h1>
        <p className="text-muted-foreground mb-8">우리 학교에서 내 게임 랭킹은?</p>

        <div className="bg-gradient-to-b from-[#1a1a3e] to-[#0f0f23] rounded-2xl p-8 mb-8">
          <p className="text-muted-foreground mb-2">{school}</p>
          <div className="text-7xl font-bold text-purple-400 mb-2">#{rank}</div>
          <p className="text-muted-foreground">{total}명 중</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2">
            <span className="font-bold">{name}</span>
            <span className="text-sm text-muted-foreground">{tier}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {game === "valorant" ? "VALORANT" : "League of Legends"}
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          나도 랭킹 확인하기 →
        </Link>
      </div>
    </main>
  );
}
