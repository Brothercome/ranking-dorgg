#!/usr/bin/env node
/**
 * NEIS API로 전국 중/고등학교를 organizations 테이블에 시딩
 *
 * Usage:
 *   node scripts/seed-schools.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const NEIS_KEY = env.NEIS_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !NEIS_KEY) {
  console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEIS_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// NEIS education office codes (시도교육청)
const EDU_OFFICES = [
  { code: "B10", name: "서울특별시" },
  { code: "C10", name: "부산광역시" },
  { code: "D10", name: "대구광역시" },
  { code: "E10", name: "인천광역시" },
  { code: "F10", name: "광주광역시" },
  { code: "G10", name: "대전광역시" },
  { code: "H10", name: "울산광역시" },
  { code: "I10", name: "세종특별자치시" },
  { code: "J10", name: "경기도" },
  { code: "K10", name: "강원특별자치도" },
  { code: "M10", name: "충청북도" },
  { code: "N10", name: "충청남도" },
  { code: "P10", name: "전북특별자치도" },
  { code: "Q10", name: "전라남도" },
  { code: "R10", name: "경상북도" },
  { code: "S10", name: "경상남도" },
  { code: "T10", name: "제주특별자치도" },
];

function normalizeName(name) {
  return name.replace(/\s+/g, "").toLowerCase();
}

function mapLevel(kind) {
  if (!kind) return null;
  if (kind.includes("중")) return "middle";
  if (kind.includes("고")) return "high";
  return null;
}

async function fetchOfficeSchools(officeCode, officeName) {
  const schools = [];
  let pIndex = 1;
  const pSize = 1000;

  while (true) {
    const url = new URL("https://open.neis.go.kr/hub/schoolInfo");
    url.searchParams.set("KEY", NEIS_KEY);
    url.searchParams.set("Type", "json");
    url.searchParams.set("pIndex", String(pIndex));
    url.searchParams.set("pSize", String(pSize));
    url.searchParams.set("ATPT_OFCDC_SC_CODE", officeCode);

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  [${officeName}] HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    const rows = json?.schoolInfo?.[1]?.row ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const level = mapLevel(row.SCHUL_KND_SC_NM);
      if (!level) continue; // Skip elementary (초등학교)
      schools.push({
        type: "school",
        name: row.SCHUL_NM,
        normalized_name: normalizeName(row.SCHUL_NM),
        school_code: row.SD_SCHUL_CODE,
        school_level: level,
        region_sido: row.LCTN_SC_NM || officeName,
        region_sigungu: row.ORG_RDNMA?.split(" ")[1] ?? null,
        member_count: 0,
      });
    }

    if (rows.length < pSize) break;
    pIndex++;
    // Rate limit safety
    await new Promise((r) => setTimeout(r, 100));
  }

  return schools;
}

async function main() {
  console.log("🏫 NEIS 학교 시딩 시작\n");

  let allSchools = [];
  for (const office of EDU_OFFICES) {
    process.stdout.write(`  ${office.name}... `);
    try {
      const schools = await fetchOfficeSchools(office.code, office.name);
      allSchools = allSchools.concat(schools);
      console.log(`${schools.length}개`);
    } catch (e) {
      console.log(`실패: ${e.message}`);
    }
  }

  console.log(`\n📊 총 ${allSchools.length}개 학교 수집 완료`);
  console.log(`   중학교: ${allSchools.filter((s) => s.school_level === "middle").length}`);
  console.log(`   고등학교: ${allSchools.filter((s) => s.school_level === "high").length}`);

  // Deduplicate by (type, normalized_name) - keep first occurrence
  // If duplicate, append region to normalized_name to disambiguate
  const seen = new Map();
  for (const school of allSchools) {
    const key = `${school.type}:${school.normalized_name}`;
    if (!seen.has(key)) {
      seen.set(key, school);
    } else {
      // Disambiguate by adding region
      const altKey = `${school.type}:${school.normalized_name}-${normalizeName(school.region_sido)}`;
      if (!seen.has(altKey)) {
        seen.set(altKey, { ...school, normalized_name: `${school.normalized_name}-${normalizeName(school.region_sido)}` });
      }
    }
  }
  const deduped = Array.from(seen.values());
  console.log(`   중복 제거 후: ${deduped.length}개`);

  // Batch upsert (500 at a time to avoid payload limits)
  console.log("\n💾 Supabase 업서트 시작...");
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH);
    const { error } = await supabase
      .from("organizations")
      .upsert(batch, { onConflict: "type,normalized_name", ignoreDuplicates: false });

    if (error) {
      console.error(`  배치 ${i / BATCH + 1} 실패:`, error.message);
      continue;
    }
    inserted += batch.length;
    process.stdout.write(`\r  진행: ${inserted}/${deduped.length}`);
  }
  console.log(`\n\n✅ 완료! ${inserted}개 학교 시딩`);
}

main().catch((e) => {
  console.error("❌ 에러:", e);
  process.exit(1);
});
