"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SearchFlow } from "@/components/ranking/search-flow";

function SearchContent() {
  const searchParams = useSearchParams();
  const game = searchParams.get("game") as "valorant" | "lol" | null;

  return <SearchFlow initialGame={game} />;
}

export default function SearchPage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground">로딩 중...</div>}>
        <SearchContent />
      </Suspense>
    </main>
  );
}
