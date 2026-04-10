import type { Metadata } from "next";
import Link from "next/link";
import { DorggCtaBanner } from "@/components/layout/dorgg-cta-banner";

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
    title: `${name} - ${school}에서 ${rank}등! | 랭킹 도르`,
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

  const rankNum = parseInt(rank, 10);
  const totalNum = parseInt(total, 10);
  const percentile = !Number.isNaN(rankNum) && !Number.isNaN(totalNum) && totalNum > 0
    ? Math.max(1, Math.round((rankNum / totalNum) * 100))
    : null;

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/dorranking.svg" alt="랭킹 도르" width={180} height={30} className="mx-auto mb-1.5" />
          <p className="text-xs sm:text-sm text-muted-foreground">친구가 자랑한 학교 랭킹</p>
        </div>

        {/* Rank Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1a3e] via-[#15153a] to-[#0f0f23] p-7 sm:p-8 mb-5 shadow-2xl">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="relative text-center">
            <p className="text-sm text-muted-foreground mb-1">{school}</p>
            <div className="text-7xl sm:text-8xl font-black bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent mb-1">
              #{rank}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{total}명 중</p>
            {percentile !== null && (
              <div className="inline-block text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1 mb-4">
                🔥 상위 {percentile}%
              </div>
            )}
            <div className="flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5">
              <span className="font-bold text-base">{name}</span>
              {tier && <span className="text-xs text-muted-foreground">· {tier}</span>}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-wider">
              {game === "valorant" ? "VALORANT" : "League of Legends"}
            </p>
          </div>
        </div>

        {/* Primary CTA — Search */}
        <Link
          href="/"
          className="block w-full text-center bg-white text-black px-6 py-4 rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-transform mb-2.5 shadow-lg"
        >
          내 학교에서 난 몇 등? →
        </Link>

        <p className="text-center text-[11px] text-muted-foreground/50 mb-5">
          닉네임#태그 입력 3초면 확인
        </p>

        {/* Secondary CTA — dor.gg */}
        <DorggCtaBanner
          placement="share_landing"
          headline={`${school} 공식 커뮤니티 가기`}
          sub="학교 친구들이랑 실시간 랭킹 & 채팅"
        />
      </div>
    </main>
  );
}
