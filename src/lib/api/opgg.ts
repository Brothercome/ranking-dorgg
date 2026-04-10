import type { GameProfile } from "@/types/game";
import { normalizeLolTier } from "@/lib/ranking/normalize";

/**
 * op.gg 페이지에서 LoL 플레이어 랭크 정보를 추출합니다.
 * Riot API 실패 시 fallback으로 사용됩니다.
 */

const OPGG_BASE = "https://www.op.gg/summoners/kr";
const OPGG_MULTISEARCH = "https://www.op.gg/multisearch/kr";

export interface OpggSearchResult {
  gameName: string;
  tagLine: string;
  tier: string;
  level: number;
}

/**
 * op.gg multisearch로 이름 기반 플레이어 검색 (최대 여러 명).
 * tag가 없을 때 사용 — 유사 이름의 후보들을 반환합니다.
 */
export async function searchPlayersFromOpgg(
  keyword: string,
  limit = 5
): Promise<OpggSearchResult[]> {
  try {
    const url = `${OPGG_MULTISEARCH}?summoners=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return [];

    const html = (await res.text()).replace(/\\"/g, '"');

    const results: OpggSearchResult[] = [];
    let idx = 0;
    while (results.length < limit) {
      idx = html.indexOf('"game_name":"', idx + 1);
      if (idx < 0) break;
      const chunk = html.slice(idx, idx + 1500);

      const nameMatch = chunk.match(/"game_name":"([^"]+)"/);
      const tagMatch = chunk.match(/"tagline":"([^"]+)"/);
      if (!nameMatch || !tagMatch) continue;

      // 템플릿 문자열은 제외 ("Game name + <span>#{region}</span>")
      if (nameMatch[1].includes("\\u003c") || nameMatch[1].includes("{region}")) continue;

      const tierMatch = chunk.match(/medals(?:_new|_mini)?\/(\w+)\.png/);
      const lvlMatch = chunk.match(/"level":(\d+)/);

      results.push({
        gameName: nameMatch[1],
        tagLine: tagMatch[1],
        tier: tierMatch ? tierMatch[1].toUpperCase() : "UNRANKED",
        level: lvlMatch ? parseInt(lvlMatch[1], 10) : 0,
      });
    }
    return results;
  } catch {
    return [];
  }
}

// "grandmaster" → "GRANDMASTER", "diamond 2" → tier=DIAMOND, rank=II
const DIVISION_MAP: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

function parseTier(raw: string): { tier: string; rank: string } {
  const lower = raw.toLowerCase().trim();
  const parts = lower.split(/\s+/);
  const tierName = (parts[0] ?? "").toUpperCase();
  const division = parts[1] ? (DIVISION_MAP[parts[1]] ?? "") : "";
  return { tier: tierName || "UNRANKED", rank: division };
}

export async function searchFromOpgg(
  gameName: string,
  tagLine: string
): Promise<GameProfile | null> {
  try {
    const url = `${OPGG_BASE}/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = (await res.text()).replace(/\\"/g, '"').replace(/\\n/g, "\n");

    // 첫 번째 medals_new 이미지 = 현재 솔로랭크 티어
    const medalIdx = html.indexOf("medals_new/");
    if (medalIdx === -1) return null;

    // 메달 근처 800자에서 데이터 추출
    const chunk = html.slice(medalIdx, medalIdx + 800);

    // 티어: medals_new/{tier}.png
    const tierMatch = chunk.match(/medals_new\/(\w+)\.png/);
    if (!tierMatch) return null;

    const { tier, rank } = parseTier(tierMatch[1]);

    // 티어 텍스트에서 디비전 확인 (예: "diamond 2")
    const tierTextMatch = chunk.match(
      /first-letter:uppercase">([^<]+)<\/strong>/
    );
    let finalTier = tier;
    let finalRank = rank;
    if (tierTextMatch) {
      const parsed = parseTier(tierTextMatch[1]);
      finalTier = parsed.tier;
      finalRank = parsed.rank;
    }

    // LP: "1,573<!-- --> LP" or "31<!-- --> LP"
    const lpMatch = chunk.match(/([\d,]+)(?:<!-- -->)?\s*LP/);
    const points = lpMatch ? parseInt(lpMatch[1].replace(/,/g, ""), 10) : 0;

    // W/L: "172<!-- -->W<!-- --> <!-- -->133<!-- -->L"
    const wlMatch = chunk.match(
      /(\d+)(?:<!-- -->)?W(?:<!-- -->)?\s*(?:<!-- -->)?(\d+)(?:<!-- -->)?L/
    );
    const wins = wlMatch ? parseInt(wlMatch[1], 10) : 0;
    const losses = wlMatch ? parseInt(wlMatch[2], 10) : 0;

    // game_name, tagline 추출
    const nameMatch = html.match(/\"game_name\":\"([^"\\]+)\"/);
    const tagMatch = html.match(/\"tagline\":\"([^"\\]+)\"/);
    const actualName = nameMatch ? nameMatch[1] : gameName;
    const actualTag = tagMatch ? tagMatch[1] : tagLine;

    return {
      gameType: "lol",
      gameName: actualName,
      tagLine: actualTag,
      puuid: "",
      tier: finalTier,
      rank: finalRank,
      points,
      wins,
      losses,
      tierNumeric: normalizeLolTier(finalTier, finalRank, points),
      raw: { source: "opgg" },
    };
  } catch {
    return null;
  }
}
