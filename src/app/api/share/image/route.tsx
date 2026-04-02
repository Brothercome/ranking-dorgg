import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TIER_COLORS: Record<string, string> = {
  Iron: "#5e5e5e", Bronze: "#a8713a", Silver: "#b4b4b4", Gold: "#e8c252",
  Platinum: "#4aa8a0", Diamond: "#b882ff", Ascendant: "#2dce89",
  Immortal: "#ff4655", Radiant: "#fffba8",
  IRON: "#5e5e5e", BRONZE: "#a8713a", SILVER: "#b4b4b4", GOLD: "#e8c252",
  PLATINUM: "#4aa8a0", EMERALD: "#2dce89", DIAMOND: "#b882ff",
  MASTER: "#9d4dff", GRANDMASTER: "#ff4444", CHALLENGER: "#f4c874",
  UNRANKED: "#666666",
};

// Instagram Stories optimized: 1080x1920
export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;

  const gameName = (searchParams.get("name") ?? "Player").slice(0, 32);
  const tierRaw = searchParams.get("tier") ?? "UNRANKED";
  const tier = TIER_COLORS[tierRaw] ? tierRaw : "UNRANKED";
  const tierRank = (searchParams.get("tierRank") ?? "").slice(0, 10);
  const rank = (searchParams.get("rank") ?? "1").slice(0, 6);
  const total = (searchParams.get("total") ?? "?").slice(0, 8);
  const school = (searchParams.get("school") ?? "학교").slice(0, 40);
  const game = searchParams.get("game") === "valorant" ? "valorant" : "lol";
  const points = (searchParams.get("points") ?? "0").slice(0, 8);

  const tierColor = TIER_COLORS[tier] ?? "#ffffff";
  const isTop3 = parseInt(rank) <= 3;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #0a0a1a 0%, #151530 30%, #1a1045 60%, #0a0a1a 100%)",
          fontFamily: "sans-serif",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tierColor}15 0%, transparent 70%)`,
            top: "300px",
            display: "flex",
          }}
        />

        {/* Top: Logo */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            fontSize: "36px",
            color: "#666",
            letterSpacing: "4px",
            display: "flex",
          }}
        >
          랭킹도르그
        </div>

        {/* Game type */}
        <div
          style={{
            position: "absolute",
            top: "140px",
            fontSize: "24px",
            color: "#888",
            display: "flex",
          }}
        >
          {game === "valorant" ? "VALORANT" : "LEAGUE OF LEGENDS"}
        </div>

        {/* School */}
        <div
          style={{
            fontSize: "42px",
            color: "#ccc",
            marginBottom: "30px",
            display: "flex",
          }}
        >
          🏫 {school}
        </div>

        {/* Rank - Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          {isTop3 && (
            <div style={{ fontSize: "80px", marginBottom: "10px", display: "flex" }}>
              {rank === "1" ? "👑" : rank === "2" ? "🥈" : "🥉"}
            </div>
          )}
          <div
            style={{
              fontSize: "180px",
              fontWeight: "bold",
              color: tierColor,
              lineHeight: "1",
              display: "flex",
              textShadow: `0 0 60px ${tierColor}44`,
            }}
          >
            #{rank}
          </div>
          <div
            style={{
              fontSize: "36px",
              color: "#888",
              marginTop: "16px",
              display: "flex",
            }}
          >
            {total}명 중 {rank}등
          </div>
        </div>

        {/* Player card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "24px",
            padding: "40px 60px",
            border: `2px solid ${tierColor}33`,
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "12px",
              display: "flex",
            }}
          >
            {gameName}
          </div>
          <div
            style={{
              fontSize: "36px",
              color: tierColor,
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {tier} {tierRank} · {points}
            {game === "valorant" ? "RR" : "LP"}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "120px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "28px", color: "#666", display: "flex" }}>
            나도 우리 학교 랭킹 확인하기
          </div>
          <div style={{ fontSize: "24px", color: tierColor, display: "flex" }}>
            ranking-dorgg.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
