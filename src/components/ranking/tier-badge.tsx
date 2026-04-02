import type { GameType } from "@/types/game";
import { getTierIconUrl, LOL_TIER_KOREAN, VALORANT_TIER_KOREAN } from "@/types/game";

const TIER_COLORS: Record<string, string> = {
  IRON: "#5e5e5e", BRONZE: "#a8713a", SILVER: "#b4b4b4", GOLD: "#e8c252",
  PLATINUM: "#4aa8a0", EMERALD: "#2dce89", DIAMOND: "#b882ff",
  MASTER: "#9d4dff", GRANDMASTER: "#ff4444", CHALLENGER: "#f4c874",
  Iron: "#5e5e5e", Bronze: "#a8713a", Silver: "#b4b4b4", Gold: "#e8c252",
  Platinum: "#4aa8a0", Diamond: "#b882ff", Ascendant: "#2dce89",
  Immortal: "#ff4655", Radiant: "#fffba8",
};

interface TierBadgeProps {
  gameType: GameType;
  tier: string;
  rank?: string;
  size?: "sm" | "md" | "lg";
}

export function TierBadge({ gameType, tier, rank, size = "sm" }: TierBadgeProps) {
  const iconUrl = getTierIconUrl(gameType, tier);
  const tierColor = TIER_COLORS[tier] ?? "#888";
  const tierKorean = gameType === "lol"
    ? LOL_TIER_KOREAN[tier] ?? tier
    : VALORANT_TIER_KOREAN[tier] ?? tier;

  const iconSize = size === "lg" ? 24 : size === "md" ? 18 : 14;

  return (
    <span
      className="inline-flex items-center gap-1 font-medium rounded-md whitespace-nowrap shrink-0"
      style={{
        color: tierColor,
        backgroundColor: `${tierColor}15`,
        border: `1px solid ${tierColor}25`,
        padding: size === "lg" ? "4px 10px" : size === "md" ? "3px 8px" : "2px 8px",
        fontSize: size === "lg" ? 14 : size === "md" ? 13 : 12,
      }}
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt={tierKorean}
          width={iconSize}
          height={iconSize}
          className="inline-block"
          loading="lazy"
        />
      )}
      {tierKorean} {rank}
    </span>
  );
}
