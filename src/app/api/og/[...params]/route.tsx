import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TIER_COLORS: Record<string, string> = {
  // Valorant
  Iron: "#5e5e5e", Bronze: "#a8713a", Silver: "#b4b4b4", Gold: "#e8c252",
  Platinum: "#4aa8a0", Diamond: "#b882ff", Ascendant: "#2dce89",
  Immortal: "#ff4655", Radiant: "#fffba8",
  // LoL
  IRON: "#5e5e5e", BRONZE: "#a8713a", SILVER: "#b4b4b4", GOLD: "#e8c252",
  PLATINUM: "#4aa8a0", EMERALD: "#2dce89", DIAMOND: "#b882ff",
  MASTER: "#9d4dff", GRANDMASTER: "#ff4444", CHALLENGER: "#f4c874",
  UNRANKED: "#666666",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: segments } = await params;
  const searchParams = new URL(request.url).searchParams;

  const gameName = (searchParams.get("name") ?? segments[0] ?? "Player").slice(0, 32);
  const tierRaw = searchParams.get("tier") ?? segments[1] ?? "UNRANKED";
  const tier = TIER_COLORS[tierRaw] ? tierRaw : "UNRANKED";
  const rank = (searchParams.get("rank") ?? "1").slice(0, 6);
  const total = (searchParams.get("total") ?? "?").slice(0, 8);
  const school = (searchParams.get("school") ?? "학교").slice(0, 40);
  const game = searchParams.get("game") === "valorant" ? "valorant" : "lol";
  const tierRank = (searchParams.get("tierRank") ?? "").slice(0, 10);

  const tierColor = TIER_COLORS[tier] ?? "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
          fontFamily: "sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tierColor}22 0%, transparent 70%)`,
            top: "-100px",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            fontSize: "24px",
            color: "#888",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          랭킹 도르
        </div>

        {/* School name */}
        <div
          style={{
            fontSize: "28px",
            color: "#aaa",
            marginBottom: "16px",
            display: "flex",
          }}
        >
          {school}
        </div>

        {/* Rank number */}
        <div
          style={{
            fontSize: "120px",
            fontWeight: "bold",
            color: tierColor,
            lineHeight: "1",
            display: "flex",
            alignItems: "baseline",
          }}
        >
          #{rank}
        </div>

        {/* Out of total */}
        <div
          style={{
            fontSize: "24px",
            color: "#888",
            margin: "12px 0 24px",
            display: "flex",
          }}
        >
          {total}명 중
        </div>

        {/* Player info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              display: "flex",
            }}
          >
            {gameName}
          </div>
          <div
            style={{
              fontSize: "24px",
              color: tierColor,
              padding: "4px 16px",
              borderRadius: "8px",
              border: `2px solid ${tierColor}`,
              display: "flex",
            }}
          >
            {tier} {tierRank}
          </div>
        </div>

        {/* Game badge */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            right: "40px",
            fontSize: "18px",
            color: "#555",
            display: "flex",
          }}
        >
          {game === "valorant" ? "VALORANT" : "League of Legends"}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
