"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RankingResult } from "@/types/ranking";
import { GAME_LABELS } from "@/types/game";
import { TierBadge } from "./tier-badge";

const TIER_COLORS: Record<string, string> = {
  Iron: "text-gray-400", Bronze: "text-amber-700", Silver: "text-gray-300", Gold: "text-yellow-400",
  Platinum: "text-teal-400", Diamond: "text-purple-400", Ascendant: "text-green-400",
  Immortal: "text-red-400", Radiant: "text-yellow-200",
  IRON: "text-gray-400", BRONZE: "text-amber-700", SILVER: "text-gray-300", GOLD: "text-yellow-400",
  PLATINUM: "text-teal-400", EMERALD: "text-green-400", DIAMOND: "text-purple-400",
  MASTER: "text-purple-500", GRANDMASTER: "text-red-500", CHALLENGER: "text-yellow-300",
};

interface RankingCardProps {
  ranking: RankingResult;
}

export function RankingCard({ ranking }: RankingCardProps) {
  const { myRank, organizationName, totalParticipants, gameType } = ranking;
  const tierColor = TIER_COLORS[myRank.tier] ?? "text-white";
  const isTop3 = myRank.rank <= 3;
  const percentile = Math.round((myRank.rank / totalParticipants) * 100);

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-b from-[#1a1a3e] to-[#0f0f23]">
      <CardContent className="pt-8 pb-8 text-center">
        {/* School name */}
        <p className="text-muted-foreground mb-2">{organizationName}</p>
        <Badge variant="secondary" className="mb-6">
          {GAME_LABELS[gameType]}
        </Badge>

        {/* Rank display */}
        {isTop3 && (
          <div className="text-5xl mb-2">
            {myRank.rank === 1 ? "👑" : myRank.rank === 2 ? "🥈" : "🥉"}
          </div>
        )}
        <div className={`text-8xl font-bold mb-2 ${tierColor}`}>
          #{myRank.rank}
        </div>
        <p className="text-lg text-muted-foreground mb-6">
          {totalParticipants}명 중 <span className="text-foreground font-semibold">{myRank.rank}등</span>
          {percentile <= 10 && <span className="text-green-400 ml-2">상위 {percentile}%</span>}
        </p>

        {/* Player info */}
        <div className="inline-flex items-center gap-3 bg-white/5 rounded-xl px-6 py-3">
          <div className="text-left">
            <div className="font-bold text-lg">{myRank.gameName}</div>
            <div className="flex items-center gap-2">
              <TierBadge gameType={gameType} tier={myRank.tier} rank={myRank.tierRank} size="md" />
              <span className={`text-sm ${tierColor}`}>
                {myRank.points}{gameType === "valorant" ? "RR" : "LP"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
