import { getCached, setCache, CACHE_TTL } from "@/lib/cache/redis";

const NEIS_BASE = "https://open.neis.go.kr/hub";

interface NeisSchool {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  SCHUL_KND_SC_NM: string; // "중학교" | "고등학교"
  LCTN_SC_NM: string;      // 시도명
  ORG_RDNMA: string;       // 도로명주소
}

export interface SchoolSearchResult {
  schoolCode: string;
  name: string;
  level: "middle" | "high" | "university";
  region: string;
  address: string;
}

function mapSchoolLevel(kind: string): "middle" | "high" | "university" {
  if (kind.includes("중")) return "middle";
  if (kind.includes("고")) return "high";
  return "university";
}

export async function searchSchools(query: string): Promise<SchoolSearchResult[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `neis:search:${query}`;
  const cached = await getCached<SchoolSearchResult[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.NEIS_API_KEY;
  const params = new URLSearchParams({
    KEY: apiKey || "",
    Type: "json",
    pIndex: "1",
    pSize: "20",
    SCHUL_NM: query,
  });

  try {
    const res = await fetch(`${NEIS_BASE}/schoolInfo?${params}`);
    if (!res.ok) return [];

    const json = await res.json();
    const rows: NeisSchool[] = json?.schoolInfo?.[1]?.row ?? [];

    const results: SchoolSearchResult[] = rows.map((s) => ({
      schoolCode: s.SD_SCHUL_CODE,
      name: s.SCHUL_NM,
      level: mapSchoolLevel(s.SCHUL_KND_SC_NM),
      region: s.LCTN_SC_NM,
      address: s.ORG_RDNMA,
    }));

    await setCache(cacheKey, results, CACHE_TTL.SCHOOL_LIST);
    return results;
  } catch {
    return [];
  }
}
