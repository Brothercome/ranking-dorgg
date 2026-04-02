"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const GAMES = [
  {
    id: "valorant" as const,
    name: "발로란트",
    nameEn: "VALORANT",
    color: "#ff4655",
    gradient: "from-red-600/20 to-red-900/20",
    borderColor: "border-red-500/30 hover:border-red-500/60",
  },
  {
    id: "lol" as const,
    name: "리그 오브 레전드",
    nameEn: "League of Legends",
    color: "#c89b3c",
    gradient: "from-yellow-600/20 to-yellow-900/20",
    borderColor: "border-yellow-500/30 hover:border-yellow-500/60",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16 max-w-2xl">
        <Image
          src="/dorranking.svg"
          alt="랭킹도르그"
          width={300}
          height={50}
          className="mx-auto mb-6"
          priority
        />
        <p className="text-xl md:text-2xl text-muted-foreground mb-4">
          우리 학교에서 내 게임 랭킹은 몇 등?
        </p>
        <p className="text-muted-foreground">
          게임 아이디를 검색하고, 학교를 선택하면
          <br />
          우리 학교에서 몇 등인지 바로 확인!
        </p>
      </div>

      {/* Game Selection */}
      <div className="w-full max-w-md space-y-4 mb-16">
        <p className="text-center text-sm text-muted-foreground mb-6">
          게임을 선택하세요
        </p>
        {GAMES.map((game) => (
          <Link key={game.id} href={`/search?game=${game.id}`} className="block">
            <div
              className={`relative overflow-hidden rounded-2xl border ${game.borderColor} bg-gradient-to-r ${game.gradient} p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold" style={{ color: game.color }}>
                    {game.nameEn}
                  </div>
                  <div className="text-sm text-muted-foreground">{game.name}</div>
                </div>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  시작 →
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats / Social proof */}
      <div className="flex gap-8 text-center text-muted-foreground">
        <div>
          <div className="text-2xl font-bold text-foreground">🎮</div>
          <div className="text-xs mt-1">2개 게임 지원</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">🏫</div>
          <div className="text-xs mt-1">전국 학교 검색</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">📱</div>
          <div className="text-xs mt-1">카톡/인스타 공유</div>
        </div>
      </div>
    </main>
  );
}
