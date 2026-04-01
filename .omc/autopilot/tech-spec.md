# 랭킹도르그 (Ranking Dorgg) - 기술 사양서 v1.0

> **문서 버전**: 1.0 (MVP)
> **작성일**: 2026-04-02
> **목적**: 한국 게이머 대상 학교/직장별 게임 랭킹 바이럴 서비스의 기술 아키텍처 정의

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [기술 스택](#2-기술-스택)
3. [게임 API 연동 상세](#3-게임-api-연동-상세)
4. [데이터베이스 설계](#4-데이터베이스-설계)
5. [API 설계](#5-api-설계)
6. [랭킹 계산 엔진](#6-랭킹-계산-엔진)
7. [공유 이미지 생성 시스템](#7-공유-이미지-생성-시스템)
8. [캐싱 및 Rate Limiting 전략](#8-캐싱-및-rate-limiting-전략)
9. [한국 로컬라이제이션](#9-한국-로컬라이제이션)
10. [인프라 및 배포](#10-인프라-및-배포)
11. [MVP 범위 정의](#11-mvp-범위-정의)
12. [바이럴 성장 전략 기술 요소](#12-바이럴-성장-전략-기술-요소)

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                             │
│  Next.js App Router (SSR/SSG) + Tailwind + shadcn/ui        │
│  - 게임 ID 검색 페이지                                        │
│  - 학교/직장 선택 페이지                                       │
│  - 랭킹 결과 + 공유 페이지                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│                   Next.js API Routes                         │
│  /api/search/[game]     - 게임 ID 조회                       │
│  /api/org/search        - 학교/직장 검색                      │
│  /api/rank/[type]/[id]  - 랭킹 조회                          │
│  /api/share/[userId]    - 공유 이미지 생성                     │
│  /api/og/[userId]       - OG 이미지 (Satori)                 │
└────┬──────────┬──────────┬──────────┬───────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│Riot API│ │PUBG API│ │OW 크롤링│ │ Supabase │
│ KR서버  │ │ Kakao  │ │fallback│ │PostgreSQL│
└────────┘ └────────┘ └────────┘ │ + Auth   │
                                  │ + Storage│
                                  └──────────┘
```

### 핵심 데이터 흐름

1. **유저 검색**: 클라이언트 → `/api/search/[game]` → 게임 API → 응답 캐싱 → DB 저장
2. **소속 등록**: 클라이언트 → `/api/org/search` → 학교/직장 DB 검색 → 소속 연결
3. **랭킹 조회**: 클라이언트 → `/api/rank/[type]/[id]` → 캐시 확인 → 재계산 or 캐시 반환
4. **공유**: 클라이언트 → `/api/og/[userId]` (OG 메타) + `/api/share/[userId]` (이미지 생성)

---

## 2. 기술 스택

### 프론트엔드
| 기술 | 선택 근거 |
|------|----------|
| **Next.js 14+ (App Router)** | SSR/SSG로 네이버 SEO 최적화, Route Handler로 API 구현 |
| **TypeScript 5.x** | 전체 코드베이스 타입 안전성 |
| **Tailwind CSS 3.x** | 유틸리티 기반 빠른 UI 개발 |
| **shadcn/ui** | 커스터마이징 가능한 컴포넌트 (Radix UI 기반) |
| **Zustand** | 클라이언트 상태 관리 (가볍고 보일러플레이트 최소) |
| **React Query (TanStack Query)** | 서버 상태 관리, 캐싱, 재시도 로직 |

### 백엔드
| 기술 | 선택 근거 |
|------|----------|
| **Next.js Route Handlers** | 프론트엔드와 동일 리포지토리, 배포 단순화 |
| **Supabase** | PostgreSQL + Auth + Storage + Realtime 통합 |
| **Drizzle ORM** | 타입 안전 SQL 빌더, 경량 |
| **Upstash Redis** | 서버리스 Redis (캐싱, rate limiting) |
| **@vercel/og (Satori)** | Edge에서 OG 이미지 생성 |

### 인프라
| 기술 | 선택 근거 |
|------|----------|
| **Vercel** | Next.js 최적 호스팅, Edge Functions, 한국 CDN PoP |
| **Supabase Cloud** | Singapore 리전 (한국 가장 가까운 리전) |
| **Upstash** | ap-northeast-2 (서울) 리전 지원 |
| **Vercel Cron** | 랭킹 재계산 스케줄링 |

---

## 3. 게임 API 연동 상세

### 3.1 Riot Games API (발로란트 + 롤)

#### API 키 종류
- **Development Key**: 초당 20회, 2분 100회 (개발용)
- **Personal Key**: 신청 후 발급, 비상업적 사용
- **Production Key**: Riot 심사 필요 (2-4주 소요), 앱 등록 필수
  - **MVP에서는 Production Key 심사가 병목** → 개발 초기에 즉시 신청

#### 발로란트 (VALORANT)

```typescript
// 엔드포인트 구조
const RIOT_BASE = 'https://ap.api.riotgames.com'; // 아시아 리전
const VAL_KR = 'https://kr.api.riotgames.com';    // 한국 서버

// 1단계: Riot ID로 계정 검색 (gameName + tagLine)
// GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// 2단계: 발로란트 MMR/랭크 조회
// GET /val/ranked/v1/leaderboards/by-act/{actId}
// 주의: 리더보드는 Immortal+ 만 조회 가능
// 대안: 매치 히스토리에서 competitive 매치의 tier 정보 추출

// 3단계: 매치 히스토리로 현재 티어 확인
// GET /val/match/v1/matchlists/by-puuid/{puuid}
// GET /val/match/v1/matches/{matchId}
interface ValMatchInfo {
  competitiveTier: number; // 0-27 (Iron1 ~ Radiant)
  rankingInTier: number;   // RR (0-100)
}

// 발로란트 티어 매핑
const VAL_TIERS: Record<number, string> = {
  3: '아이언 1', 4: '아이언 2', 5: '아이언 3',
  6: '브론즈 1', 7: '브론즈 2', 8: '브론즈 3',
  9: '실버 1', 10: '실버 2', 11: '실버 3',
  12: '골드 1', 13: '골드 2', 14: '골드 3',
  15: '플래티넘 1', 16: '플래티넘 2', 17: '플래티넘 3',
  18: '다이아몬드 1', 19: '다이아몬드 2', 20: '다이아몬드 3',
  21: '어센던트 1', 22: '어센던트 2', 23: '어센던트 3',
  24: '이모탈 1', 25: '이모탈 2', 26: '이모탈 3',
  27: '레디언트',
};
```

#### 리그 오브 레전드 (LoL)

```typescript
const LOL_KR = 'https://kr.api.riotgames.com';

// 1단계: Riot ID → PUUID (동일)
// 2단계: PUUID → Summoner ID
// GET /lol/summoner/v4/summoners/by-puuid/{puuid}
interface Summoner {
  id: string;          // encrypted summoner ID
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

// 3단계: Ranked 정보
// GET /lol/league/v4/entries/by-summoner/{encryptedSummonerId}
interface LeagueEntry {
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';
  tier: string;        // IRON ~ CHALLENGER
  rank: string;        // I, II, III, IV
  leaguePoints: number;
  wins: number;
  losses: number;
}

// LoL 티어 순서 (정규화 점수 계산용)
const LOL_TIER_ORDER = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'
];
```

#### Riot API Rate Limit 처리

```typescript
// Production Key 기준 rate limit
// - 20 requests / 1 second
// - 100 requests / 2 minutes
// 주의: 각 리전별 개별 카운팅

// rate limiter 구현 (Upstash Redis 활용)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const riotRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(18, '1 s'), // 여유분 2 확보
  analytics: true,
  prefix: 'riot-api',
});

// 큐 기반 요청 관리
interface ApiRequest {
  endpoint: string;
  priority: number; // 1: 실시간 검색, 2: 백그라운드 갱신
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}
```

### 3.2 PUBG API

```typescript
const PUBG_BASE = 'https://api.pubg.com';

// 한국 배그는 Kakao 플랫폼이었으나 Steam으로 통합됨
// platform: 'steam' (글로벌 통합 후)
// shard: 'steam' (매치 데이터용)

// 1단계: 플레이어 검색
// GET /shards/steam/players?filter[playerNames]={playerName}
interface PubgPlayer {
  id: string;
  attributes: {
    name: string;
    stats: null; // 별도 조회 필요
    patchVersion: string;
  };
}

// 2단계: 시즌 랭크 스탯
// GET /shards/steam/players/{playerId}/seasons/{seasonId}/ranked
interface PubgRankedStats {
  currentTier: {
    tier: string;     // 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master'
    subTier: string;  // '1' | '2' | '3' | '4' | '5'
  };
  currentRankPoint: number;
  bestTier: { tier: string; subTier: string; };
  bestRankPoint: number;
  roundsPlayed: number;
  avgRank: number;
  winRatio: number;
  kda: number;
}

// PUBG API Rate Limit: 10 requests / 1 minute (매우 엄격!)
// → 적극적 캐싱 필수 (최소 10분 캐시)

const pubgRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(8, '60 s'), // 여유분 2
  prefix: 'pubg-api',
});
```

### 3.3 오버워치 (Overwatch 2)

**주의**: Blizzard 공식 API가 2023년에 사실상 중단됨. 대안 전략:

```typescript
// 방안 1: 커뮤니티 API 활용 (MVP 추천)
// overfast-api (https://overfast-api.tekrop.fr/)
// - Blizzard 커리어 프로필 페이지 스크래핑 기반
// - 무료, 오픈소스, 셀프 호스팅 가능
// - 안정성 리스크 존재 → fallback 필수

const OVERFAST_BASE = 'https://overfast-api.tekrop.fr';

// 플레이어 검색
// GET /players/{player_id} (BattleTag: Name-1234)
interface OverwatchPlayer {
  username: string;
  avatar: string;
  title: string;
  competitive: {
    pc: {
      season: number;
      rank: {
        role: 'tank' | 'damage' | 'support';
        division: string;  // 'bronze' ~ 'champion'
        tier: number;       // 1-5
        roleIcon: string;
      }[];
    };
  };
}

// 방안 2: 자체 스크래핑 (fallback)
// Blizzard 커리어 프로필: https://overwatch.blizzard.com/career/{BattleTag}/
// Cheerio로 서버사이드 파싱
// 장점: 외부 의존성 제거
// 단점: Blizzard UI 변경 시 깨짐, 유지보수 비용

// MVP 결정: overfast-api 우선 사용 + 자체 스크래핑 fallback
// 반드시 circuit breaker 패턴 적용

interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: Date | null;
  threshold: number;     // 5회 실패 시 open
  resetTimeout: number;  // 30초 후 half-open
}
```

### 3.4 게임 API 통합 인터페이스

```typescript
// 모든 게임 API를 통합하는 공통 인터페이스
interface GameProfile {
  game: 'valorant' | 'lol' | 'pubg' | 'overwatch';
  gameId: string;           // 게임 내 표시 이름
  puuid?: string;           // Riot 계열 PUUID
  tier: string;             // 정규화된 티어 문자열
  tierNumeric: number;      // 정규화 점수 (0-10000)
  rank: string;             // 세부 랭크 (I, II 등)
  leaguePoints: number;     // LP/RR/RP
  wins: number;
  losses: number;
  winRate: number;
  profileIconUrl: string;
  lastUpdated: Date;
}

// 각 게임별 어댑터 구현
interface GameApiAdapter {
  searchPlayer(query: string): Promise<GameProfile | null>;
  getPlayerStats(playerId: string): Promise<GameProfile>;
  getRankInfo(playerId: string): Promise<RankInfo>;
}
```

---

## 4. 데이터베이스 설계

### Supabase PostgreSQL 스키마

```sql
-- ============================================
-- 1. 사용자 테이블
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 인증 (Supabase Auth 연동)
  auth_id UUID REFERENCES auth.users(id),
  
  -- 기본 정보
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 소속 정보
  organization_id UUID REFERENCES organizations(id),
  organization_verified BOOLEAN DEFAULT FALSE,
  
  -- 공유 설정
  share_slug TEXT UNIQUE, -- 공유 URL용 짧은 슬러그
  share_count INTEGER DEFAULT 0,
  
  -- 메타데이터
  last_rank_refresh TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_share_slug ON users(share_slug);
CREATE INDEX idx_users_auth ON users(auth_id);

-- ============================================
-- 2. 게임 계정 연동 테이블
-- ============================================
CREATE TABLE game_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 게임 정보
  game TEXT NOT NULL CHECK (game IN ('valorant', 'lol', 'pubg', 'overwatch')),
  game_username TEXT NOT NULL,       -- 게임 내 이름
  game_tag TEXT,                     -- Riot Tag (#KR1 등)
  game_player_id TEXT NOT NULL,      -- 게임사 고유 ID (PUUID 등)
  platform TEXT DEFAULT 'pc',        -- pc, console, mobile
  
  -- 현재 랭크 정보 (캐싱)
  current_tier TEXT,                 -- 'Gold', 'Diamond' 등
  current_rank TEXT,                 -- 'I', 'II', '3' 등
  current_points INTEGER DEFAULT 0,  -- LP, RR, RP
  tier_numeric INTEGER DEFAULT 0,    -- 정규화 점수 (0-10000)
  
  -- 스탯
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  
  -- 메타
  last_api_fetch TIMESTAMPTZ,
  api_fetch_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 한 유저당 같은 게임 계정 하나만
  UNIQUE(user_id, game)
);

CREATE INDEX idx_game_accounts_user ON game_accounts(user_id);
CREATE INDEX idx_game_accounts_game ON game_accounts(game);
CREATE INDEX idx_game_accounts_tier ON game_accounts(game, tier_numeric DESC);
CREATE INDEX idx_game_accounts_player_id ON game_accounts(game_player_id);

-- ============================================
-- 3. 조직(학교/직장) 테이블
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  name TEXT NOT NULL,                -- '서울대학교', '삼성전자'
  name_en TEXT,                      -- 영문명
  type TEXT NOT NULL CHECK (type IN ('school', 'university', 'company', 'military', 'other')),
  
  -- 위치 정보
  region TEXT NOT NULL,              -- '서울특별시'
  sub_region TEXT,                   -- '관악구'
  address TEXT,
  
  -- 정규화된 지역 코드 (시/도 + 시/군/구)
  region_code TEXT NOT NULL,         -- 'SEOUL', 'BUSAN', 'GYEONGGI' 등
  sub_region_code TEXT,              -- 'GANGNAM', 'GWANAK' 등
  
  -- 통계
  member_count INTEGER DEFAULT 0,
  
  -- 검색 최적화
  search_vector TSVECTOR,           -- Full-text search
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT TRUE   -- 관리자 인증된 조직
);

CREATE INDEX idx_org_type ON organizations(type);
CREATE INDEX idx_org_region ON organizations(region_code);
CREATE INDEX idx_org_search ON organizations USING GIN(search_vector);
CREATE INDEX idx_org_name_trgm ON organizations USING GIN(name gin_trgm_ops);

-- Full-text search 트리거
CREATE OR REPLACE FUNCTION org_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.name_en, '') || ' ' || COALESCE(NEW.region, '') || ' ' || COALESCE(NEW.sub_region, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_search_trigger
  BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION org_search_update();

-- ============================================
-- 4. 랭킹 캐시 테이블
-- ============================================
CREATE TABLE rankings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 랭킹 범위
  scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'region', 'sub_region', 'national')),
  scope_id TEXT NOT NULL,            -- org UUID or region_code
  game TEXT NOT NULL CHECK (game IN ('valorant', 'lol', 'pubg', 'overwatch', 'combined')),
  
  -- 랭킹 데이터 (JSONB로 유연하게)
  rankings JSONB NOT NULL,
  /*
    rankings 구조:
    [
      {
        "userId": "uuid",
        "gameAccountId": "uuid",
        "displayName": "유저명",
        "gameName": "Hide on bush",
        "tier": "Challenger",
        "tierNumeric": 9800,
        "rank": 1,
        "previousRank": 2,
        "rankChange": 1
      },
      ...
    ]
  */
  
  -- 통계
  total_participants INTEGER DEFAULT 0,
  
  -- 캐시 관리
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  is_stale BOOLEAN DEFAULT FALSE,
  
  UNIQUE(scope_type, scope_id, game)
);

CREATE INDEX idx_rankings_scope ON rankings_cache(scope_type, scope_id, game);
CREATE INDEX idx_rankings_expires ON rankings_cache(expires_at);

-- ============================================
-- 5. 공유 이력 테이블 (바이럴 추적)
-- ============================================
CREATE TABLE share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- 공유 정보
  platform TEXT NOT NULL CHECK (platform IN ('kakao', 'instagram', 'discord', 'twitter', 'link_copy', 'other')),
  share_type TEXT NOT NULL CHECK (share_type IN ('image', 'link', 'og_preview')),
  
  -- 추적
  referral_code TEXT,
  click_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_user ON share_events(user_id);
CREATE INDEX idx_share_platform ON share_events(platform, created_at);

-- ============================================
-- 6. 한국 학교/직장 시드 데이터
-- ============================================
-- 초기 데이터는 아래 공공데이터 API에서 수집:
-- - 학교: 교육부 나이스(NEIS) 학교기본정보 API
--   https://open.neis.go.kr/hub/schoolInfo
--   전국 초/중/고/대학 약 20,000+ 학교
-- - 직장: 국세청 사업자등록 기반은 부적절
--   → 사용자 입력 + 검증 방식 (MVP)
--   → 추후 잡코리아/사람인 크롤링 또는 공공데이터 활용

-- 지역 코드 테이블
CREATE TABLE regions (
  code TEXT PRIMARY KEY,           -- 'SEOUL', 'BUSAN'
  name TEXT NOT NULL,              -- '서울특별시', '부산광역시'
  sub_regions JSONB DEFAULT '[]'   -- [{"code": "GANGNAM", "name": "강남구"}, ...]
);
```

### Drizzle ORM 스키마 정의

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, integer, real, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id'),
  displayName: text('display_name').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  organizationVerified: boolean('organization_verified').default(false),
  shareSlug: text('share_slug').unique(),
  shareCount: integer('share_count').default(0),
  lastRankRefresh: timestamp('last_rank_refresh', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  orgIdx: index('idx_users_org').on(table.organizationId),
  shareIdx: uniqueIndex('idx_users_share_slug').on(table.shareSlug),
}));

export const gameAccounts = pgTable('game_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  game: text('game').notNull(), // 'valorant' | 'lol' | 'pubg' | 'overwatch'
  gameUsername: text('game_username').notNull(),
  gameTag: text('game_tag'),
  gamePlayerId: text('game_player_id').notNull(),
  platform: text('platform').default('pc'),
  currentTier: text('current_tier'),
  currentRank: text('current_rank'),
  currentPoints: integer('current_points').default(0),
  tierNumeric: integer('tier_numeric').default(0),
  wins: integer('wins').default(0),
  losses: integer('losses').default(0),
  winRate: real('win_rate').default(0),
  lastApiFetch: timestamp('last_api_fetch', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userGameUnique: uniqueIndex('idx_game_accounts_unique').on(table.userId, table.game),
  tierIdx: index('idx_game_accounts_tier').on(table.game, table.tierNumeric),
}));

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  type: text('type').notNull(), // 'school' | 'university' | 'company' | 'military'
  region: text('region').notNull(),
  subRegion: text('sub_region'),
  regionCode: text('region_code').notNull(),
  subRegionCode: text('sub_region_code'),
  memberCount: integer('member_count').default(0),
  isVerified: boolean('is_verified').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const rankingsCache = pgTable('rankings_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  scopeType: text('scope_type').notNull(),
  scopeId: text('scope_id').notNull(),
  game: text('game').notNull(),
  rankings: jsonb('rankings').notNull(),
  totalParticipants: integer('total_participants').default(0),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isStale: boolean('is_stale').default(false),
}, (table) => ({
  scopeUnique: uniqueIndex('idx_rankings_scope_unique').on(table.scopeType, table.scopeId, table.game),
}));
```

---

## 5. API 설계

### 5.1 Route Handler 구조

```
src/app/
├── api/
│   ├── search/
│   │   └── [game]/
│   │       └── route.ts          # GET: 게임 ID 검색
│   ├── org/
│   │   ├── search/
│   │   │   └── route.ts          # GET: 학교/직장 검색
│   │   └── [orgId]/
│   │       └── route.ts          # GET: 조직 상세
│   ├── rank/
│   │   └── [scopeType]/
│   │       └── [scopeId]/
│   │           └── route.ts      # GET: 랭킹 조회
│   ├── user/
│   │   ├── register/
│   │   │   └── route.ts          # POST: 유저 등록 + 게임 계정 연동
│   │   └── [userId]/
│   │       └── route.ts          # GET: 유저 프로필
│   ├── share/
│   │   └── [userId]/
│   │       └── route.ts          # GET: 공유 이미지 생성
│   └── og/
│       └── [userId]/
│           └── route.ts          # GET: OG 이미지 (Edge Runtime)
├── (main)/
│   ├── page.tsx                   # 메인 (게임 선택 + 검색)
│   ├── search/
│   │   └── [game]/
│   │       └── page.tsx           # 검색 결과
│   ├── register/
│   │   └── page.tsx               # 소속 등록
│   ├── rank/
│   │   └── [slug]/
│   │       └── page.tsx           # 랭킹 보기
│   └── profile/
│       └── [shareSlug]/
│           └── page.tsx           # 공유 프로필 (SSR with OG)
└── layout.tsx
```

### 5.2 API 엔드포인트 상세

#### `GET /api/search/[game]?q={query}`

```typescript
// src/app/api/search/[game]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const searchSchema = z.object({
  game: z.enum(['valorant', 'lol', 'pubg', 'overwatch']),
  q: z.string().min(2).max(30),
  tag: z.string().optional(), // Riot Tag (예: KR1)
});

export async function GET(
  request: NextRequest,
  { params }: { params: { game: string } }
) {
  // 1. 파라미터 검증
  // 2. Redis 캐시 확인 (key: `search:${game}:${query}`)
  // 3. 캐시 미스 → 게임 API 호출
  // 4. 결과 캐싱 (TTL: 5분)
  // 5. 응답 반환
}

// 응답 형태
interface SearchResponse {
  success: boolean;
  data: {
    player: {
      id: string;
      name: string;
      tag?: string;
      profileIcon?: string;
    };
    rank: {
      tier: string;
      rank: string;
      points: number;
      tierNumeric: number;
      tierIcon: string;
    };
    stats: {
      wins: number;
      losses: number;
      winRate: number;
    };
  } | null;
  error?: string;
}
```

#### `GET /api/rank/[scopeType]/[scopeId]?game={game}`

```typescript
// 랭킹 조회 API
// scopeType: 'org' | 'region' | 'sub_region' | 'national'
// scopeId: organization UUID or region code
// game: 'valorant' | 'lol' | 'pubg' | 'overwatch' | 'combined'

interface RankingResponse {
  success: boolean;
  data: {
    scope: {
      type: string;
      name: string;        // '서울대학교' or '서울특별시'
      totalMembers: number;
    };
    rankings: {
      rank: number;
      userId: string;
      displayName: string;
      gameName: string;
      game: string;
      tier: string;
      tierNumeric: number;
      rankChange: number;   // +2, -1, 0
      isCurrentUser: boolean;
    }[];
    currentUserRank?: {
      rank: number;
      totalInScope: number;
      percentile: number;   // 상위 몇 %
      message: string;      // "서울대학교에서 상위 5%!"
    };
    lastUpdated: string;
  };
}
```

#### `POST /api/user/register`

```typescript
// 유저 등록 및 게임 계정 연동
interface RegisterRequest {
  // 게임 계정 (최소 1개)
  gameAccounts: {
    game: 'valorant' | 'lol' | 'pubg' | 'overwatch';
    username: string;
    tag?: string;
  }[];
  // 소속
  organizationId: string;
  // 표시 이름
  displayName: string;
}

// 처리 흐름:
// 1. 각 게임 API로 실제 존재하는 계정인지 검증
// 2. 이미 다른 유저가 등록한 게임 계정이면 거부
// 3. 유저 생성 + 게임 계정 연동
// 4. 해당 소속의 랭킹 캐시 무효화
// 5. share_slug 자동 생성 (nanoid, 8자)
```

---

## 6. 랭킹 계산 엔진

### 6.1 게임 간 티어 정규화

서로 다른 게임의 랭크를 공정하게 비교하기 위한 정규화 점수 체계 (0-10000):

```typescript
// src/lib/ranking/normalize.ts

// 각 게임의 티어를 0-10000 사이 점수로 정규화
// 원칙: 각 게임의 상위 백분위를 기준으로 매핑
// 예: 각 게임에서 상위 1% = 약 9000점, 상위 10% = 약 7000점

// === 발로란트 (0-27 competitiveTier + RR) ===
function normalizeValorant(tier: number, rr: number): number {
  // Iron 1 (3) = 300, Iron 2 (4) = 500, Iron 3 (5) = 700
  // Bronze 1 (6) = 1000, ..., Bronze 3 (8) = 1600
  // Silver 1 (9) = 2000, ..., Silver 3 (11) = 2600
  // Gold 1 (12) = 3000, ..., Gold 3 (14) = 3600
  // Platinum 1 (15) = 4000, ..., Platinum 3 (17) = 4600
  // Diamond 1 (18) = 5500, ..., Diamond 3 (20) = 6500
  // Ascendant 1 (21) = 7000, ..., Ascendant 3 (23) = 7800
  // Immortal 1 (24) = 8200, Immortal 2 (25) = 8600, Immortal 3 (26) = 9000
  // Radiant (27) = 9500 + (RR-based bonus up to 500)

  const BASE_SCORES: Record<number, number> = {
    3: 300, 4: 500, 5: 700,           // Iron
    6: 1000, 7: 1300, 8: 1600,        // Bronze
    9: 2000, 10: 2300, 11: 2600,      // Silver
    12: 3000, 13: 3300, 14: 3600,     // Gold
    15: 4000, 16: 4300, 17: 4600,     // Platinum
    18: 5500, 19: 6000, 20: 6500,     // Diamond
    21: 7000, 22: 7400, 23: 7800,     // Ascendant
    24: 8200, 25: 8600, 26: 9000,     // Immortal
    27: 9500,                          // Radiant
  };

  const base = BASE_SCORES[tier] ?? 0;
  const rrBonus = Math.floor((rr / 100) * 200); // RR 0-100 → 0-200 보너스
  return Math.min(10000, base + rrBonus);
}

// === 리그 오브 레전드 (Tier + Rank + LP) ===
function normalizeLoL(tier: string, rank: string, lp: number): number {
  const TIER_BASE: Record<string, number> = {
    'IRON': 0, 'BRONZE': 1000, 'SILVER': 2000, 'GOLD': 3000,
    'PLATINUM': 4000, 'EMERALD': 5000, 'DIAMOND': 6500,
    'MASTER': 8000, 'GRANDMASTER': 9000, 'CHALLENGER': 9500,
  };
  const RANK_OFFSET: Record<string, number> = {
    'IV': 0, 'III': 250, 'II': 500, 'I': 750,
  };

  const base = TIER_BASE[tier] ?? 0;
  const rankOffset = RANK_OFFSET[rank] ?? 0;
  const lpBonus = Math.floor((Math.min(lp, 100) / 100) * 250);
  
  // Master+ 는 LP가 계속 올라감 → 별도 처리
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) {
    return Math.min(10000, base + Math.floor(lp / 5)); // LP/5 보너스
  }
  
  return Math.min(10000, base + rankOffset + lpBonus);
}

// === PUBG (Tier + SubTier + RP) ===
function normalizePubg(tier: string, subTier: string, rp: number): number {
  const TIER_BASE: Record<string, number> = {
    'Bronze': 1000, 'Silver': 2500, 'Gold': 4000,
    'Platinum': 5500, 'Diamond': 7000, 'Master': 8500,
  };
  const subTierNum = parseInt(subTier) || 1;
  const base = TIER_BASE[tier] ?? 0;
  const subBonus = (5 - subTierNum) * 300; // 5=0, 4=300, 3=600, 2=900, 1=1200
  return Math.min(10000, base + subBonus);
}

// === 오버워치 2 (Division + Tier) ===
function normalizeOverwatch(division: string, tier: number): number {
  const DIV_BASE: Record<string, number> = {
    'bronze': 1000, 'silver': 2500, 'gold': 4000,
    'platinum': 5500, 'diamond': 7000, 'master': 8000,
    'grandmaster': 9000, 'champion': 9700,
  };
  const base = DIV_BASE[division] ?? 0;
  const tierBonus = (5 - tier) * 200; // tier 5=0, 4=200, 3=400, 2=600, 1=800
  return Math.min(10000, base + tierBonus);
}
```

### 6.2 랭킹 계산 로직

```typescript
// src/lib/ranking/compute.ts

interface RankingComputeInput {
  scopeType: 'organization' | 'region' | 'sub_region' | 'national';
  scopeId: string;
  game: 'valorant' | 'lol' | 'pubg' | 'overwatch' | 'combined';
}

async function computeRanking(input: RankingComputeInput): Promise<RankingEntry[]> {
  const { scopeType, scopeId, game } = input;

  // 1. 해당 범위의 유저들 조회
  let query = db.select().from(gameAccounts)
    .innerJoin(users, eq(gameAccounts.userId, users.id));

  if (scopeType === 'organization') {
    query = query.where(eq(users.organizationId, scopeId));
  } else if (scopeType === 'region') {
    query = query.innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(organizations.regionCode, scopeId));
  }

  if (game !== 'combined') {
    query = query.where(eq(gameAccounts.game, game));
  }

  const results = await query.orderBy(desc(gameAccounts.tierNumeric));

  // 2. combined 모드일 경우: 유저별 최고 점수 게임만 사용
  if (game === 'combined') {
    const userBest = new Map<string, typeof results[0]>();
    for (const row of results) {
      const existing = userBest.get(row.users.id);
      if (!existing || row.game_accounts.tierNumeric > existing.game_accounts.tierNumeric) {
        userBest.set(row.users.id, row);
      }
    }
    return rankFromMap(userBest);
  }

  // 3. 순위 부여 (동점자 처리: 같은 tierNumeric이면 같은 순위)
  return assignRanks(results);
}

// Vercel Cron으로 주기적 재계산
// vercel.json:
// { "crons": [{ "path": "/api/cron/recompute-rankings", "schedule": "0 */1 * * *" }] }
// → 매 1시간마다 활성 조직의 랭킹 재계산
```

### 6.3 combined 랭킹 공정성 고려사항

```
문제: "다이아 발로란트" vs "다이아 롤" 은 같은 실력인가?
→ 각 게임의 티어별 인구 분포가 다름

해결 방안 (MVP): 
- 백분위 기반 정규화 적용
- 각 게임의 공식 티어 분포 통계를 주기적으로 반영
- 예: 롤 골드 = 상위 50% → 5000점
        발로란트 골드 = 상위 40% → 5500점
- MVP에서는 위 하드코딩된 매핑 사용, 추후 실제 분포 데이터 반영

향후 개선:
- Riot API의 실제 tier 분포 데이터 활용
- 월별 분포 업데이트 반영
- 유저 피드백 기반 가중치 조정
```

---

## 7. 공유 이미지 생성 시스템

### 7.1 OG 이미지 (링크 미리보기용)

```typescript
// src/app/api/og/[userId]/route.tsx
// Edge Runtime에서 @vercel/og (Satori) 사용
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  // 유저 데이터 조회 (Edge에서는 fetch로 내부 API 호출)
  const userData = await fetchUserData(params.userId);

  // 폰트 로드 (한국어 지원 필수!)
  const pretendard = await fetch(
    new URL('../../../../public/fonts/Pretendard-Bold.otf', import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          fontFamily: 'Pretendard',
          color: 'white',
        }}
      >
        {/* 상단: 게임 아이콘 + 티어 뱃지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src={userData.tierIcon} width={120} height={120} />
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
            {userData.tier} {userData.rank}
          </div>
        </div>

        {/* 중앙: 유저 이름 + 소속 */}
        <div style={{ fontSize: '36px', marginTop: '20px' }}>
          {userData.displayName}
        </div>
        <div style={{ fontSize: '28px', color: '#a0aec0', marginTop: '8px' }}>
          {userData.organizationName}
        </div>

        {/* 하단: 랭킹 정보 */}
        <div style={{
          marginTop: '30px',
          padding: '16px 40px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '16px',
          fontSize: '32px',
        }}>
          🏆 {userData.organizationName}에서{' '}
          <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
            {userData.rank}위
          </span>
          {' '}/ {userData.totalMembers}명
        </div>

        {/* 브랜딩 */}
        <div style={{ position: 'absolute', bottom: '20px', fontSize: '18px', color: '#718096' }}>
          랭킹도르그 | ranking-dorgg.kr
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Pretendard', data: pretendard, style: 'normal', weight: 700 }],
    }
  );
}
```

### 7.2 인스타그램 스토리용 이미지 (1080x1920)

```typescript
// src/app/api/share/[userId]/route.ts
// Node.js Runtime (Canvas 사용)
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userData = await fetchUserData(params.userId);
  
  const canvas = createCanvas(1080, 1920);
  const ctx = canvas.getContext('2d');

  // 배경 그라데이션
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // 게임별 테마 색상
  const GAME_COLORS: Record<string, string> = {
    valorant: '#ff4655',
    lol: '#c89b3c',
    pubg: '#f2a900',
    overwatch: '#f99e1a',
  };

  // 티어 아이콘 (큰 사이즈)
  const tierIcon = await loadImage(`/public/tier-icons/${userData.game}/${userData.tier}.png`);
  ctx.drawImage(tierIcon, 340, 300, 400, 400);

  // 유저 정보 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Pretendard';
  ctx.textAlign = 'center';
  ctx.fillText(userData.gameName, 540, 800);

  ctx.font = '48px Pretendard';
  ctx.fillStyle = GAME_COLORS[userData.game] || '#ffffff';
  ctx.fillText(`${userData.tier} ${userData.rank}`, 540, 880);

  // 소속 + 랭킹 카드
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, 80, 960, 920, 300, 24);

  ctx.fillStyle = '#a0aec0';
  ctx.font = '36px Pretendard';
  ctx.fillText(userData.organizationName, 540, 1030);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 80px Pretendard';
  ctx.fillText(`#${userData.rankInOrg}`, 540, 1140);

  ctx.fillStyle = '#a0aec0';
  ctx.font = '32px Pretendard';
  ctx.fillText(`${userData.totalMembers}명 중 상위 ${userData.percentile}%`, 540, 1200);

  // 스탯 바
  drawStatBar(ctx, '승률', userData.winRate, 80, 1340);
  drawStatBar(ctx, '총 게임', userData.totalGames, 80, 1420);

  // QR 코드 또는 브랜딩
  ctx.fillStyle = '#4a5568';
  ctx.font = '28px Pretendard';
  ctx.fillText('ranking-dorgg.kr에서 내 랭킹 확인하기', 540, 1800);

  // PNG 버퍼 반환
  const buffer = canvas.toBuffer('image/png');
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

### 7.3 동적 OG 메타태그

```typescript
// src/app/profile/[shareSlug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUserBySlug(params.shareSlug);
  
  const title = `${user.displayName} - ${user.organizationName} ${user.rankInOrg}위 | 랭킹도르그`;
  const description = `${user.gameName}님은 ${user.organizationName}에서 ${user.totalMembers}명 중 ${user.rankInOrg}위! 상위 ${user.percentile}% 🏆`;
  const ogImageUrl = `${process.env.NEXT_PUBLIC_URL}/api/og/${user.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'profile',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    // 카카오톡 전용 메타
    other: {
      'kakao:title': title,
      'kakao:description': description,
      'kakao:image': ogImageUrl,
    },
  };
}
```

---

## 8. 캐싱 및 Rate Limiting 전략

### 8.1 다층 캐싱 아키텍처

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  React Query │ →  │  Upstash     │ →  │  PostgreSQL  │
│  (클라이언트)  │    │  Redis       │    │  (Supabase)  │
│  TTL: 30초    │    │  TTL: 다양    │    │  (영구)       │
└──────────────┘    └──────────────┘    └──────────────┘
```

```typescript
// src/lib/cache/redis.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 캐시 TTL 정책
const CACHE_TTL = {
  // 게임 API 검색 결과: 5분 (빈번한 검색, API 부담 감소)
  GAME_SEARCH: 5 * 60,
  
  // 개별 유저 랭크 데이터: 30분 (랭크는 자주 안 변함)
  USER_RANK: 30 * 60,
  
  // 조직별 랭킹: 1시간 (Cron으로 재계산)
  ORG_RANKING: 60 * 60,
  
  // 지역 랭킹: 2시간
  REGION_RANKING: 2 * 60 * 60,
  
  // OG 이미지: 1시간 (CDN 캐시도 활용)
  OG_IMAGE: 60 * 60,
  
  // 학교/직장 검색: 24시간 (거의 안 변함)
  ORG_SEARCH: 24 * 60 * 60,
} as const;

// 캐시 키 네이밍 컨벤션
const CACHE_KEYS = {
  gameSearch: (game: string, query: string) => `search:${game}:${query}`,
  userRank: (userId: string, game: string) => `rank:user:${userId}:${game}`,
  orgRanking: (orgId: string, game: string) => `ranking:org:${orgId}:${game}`,
  regionRanking: (region: string, game: string) => `ranking:region:${region}:${game}`,
  orgSearch: (query: string) => `org:search:${query}`,
} as const;

// 캐시 래퍼 함수
async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  await redis.set(key, data, { ex: ttl });
  return data;
}
```

### 8.2 게임 API Rate Limit 관리

```typescript
// src/lib/api/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';

// 게임별 Rate Limiter
const rateLimiters = {
  riot: new Ratelimit({
    redis,
    // Riot Production: 20/1s, 100/2min
    // 안전 마진 10% 적용
    limiter: Ratelimit.slidingWindow(18, '1 s'),
    prefix: 'rl:riot',
  }),
  
  pubg: new Ratelimit({
    redis,
    // PUBG: 10/1min (매우 제한적)
    limiter: Ratelimit.slidingWindow(8, '60 s'),
    prefix: 'rl:pubg',
  }),
  
  overwatch: new Ratelimit({
    redis,
    // overfast-api: 자체 rate limit 없으나, 예의상 제한
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'rl:ow',
  }),
};

// 요청 큐 (PUBG처럼 rate limit 엄격한 경우)
class ApiRequestQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  async enqueue<T>(
    game: string,
    fetcher: () => Promise<T>,
    priority: number = 1
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ game, fetcher, priority, resolve, reject });
      this.queue.sort((a, b) => a.priority - b.priority);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const item = this.queue.shift()!;
    const limiter = rateLimiters[item.game as keyof typeof rateLimiters];
    
    const { success, reset } = await limiter.limit('global');
    if (!success) {
      // rate limit 초과 → 대기 후 재시도
      const waitTime = reset - Date.now();
      await new Promise(r => setTimeout(r, Math.max(waitTime, 1000)));
    }

    try {
      const result = await item.fetcher();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }

    this.processing = false;
    this.processQueue();
  }
}
```

### 8.3 사용자 대상 Rate Limiting

```typescript
// 유저 API 남용 방지
const userRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 분당 30회
  prefix: 'rl:user',
});

// 미들웨어로 적용
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? request.ip ?? '127.0.0.1';
    const { success } = await userRateLimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 9. 한국 로컬라이제이션

### 9.1 네이버 SEO

```typescript
// src/app/layout.tsx - 네이버 SEO 필수 요소

export const metadata: Metadata = {
  metadataBase: new URL('https://ranking-dorgg.kr'),
  title: {
    default: '랭킹도르그 - 우리 학교/직장 게임 랭킹',
    template: '%s | 랭킹도르그',
  },
  description: '발로란트, 롤, 배그, 오버워치 - 우리 학교에서 내 게임 랭킹은 몇 등? 친구들과 비교하고 공유하세요!',
  keywords: [
    '게임 랭킹', '학교 랭킹', '발로란트 랭킹', '롤 랭킹',
    '배그 랭킹', '오버워치 랭킹', '직장 랭킹', '게임 순위',
    '학교 게임 순위', '랭킹도르그',
  ],
  verification: {
    other: {
      'naver-site-verification': process.env.NAVER_SITE_VERIFICATION!,
    },
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
};

// 네이버 서치어드바이저 등록 필수:
// 1. https://searchadvisor.naver.com/ 에서 사이트 등록
// 2. sitemap.xml 제출
// 3. robots.txt 설정

// src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 주요 조직별 랭킹 페이지를 sitemap에 포함
  const orgs = await getTopOrganizations();
  
  return [
    { url: 'https://ranking-dorgg.kr', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://ranking-dorgg.kr/search/valorant', priority: 0.9 },
    { url: 'https://ranking-dorgg.kr/search/lol', priority: 0.9 },
    ...orgs.map(org => ({
      url: `https://ranking-dorgg.kr/rank/${org.slug}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
  ];
}

// robots.txt
// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'Yeti', allow: '/' }, // 네이버 크롤러
    ],
    sitemap: 'https://ranking-dorgg.kr/sitemap.xml',
  };
}
```

### 9.2 카카오톡 공유 SDK

```typescript
// src/lib/kakao/share.ts

// 카카오 JavaScript SDK 초기화
// 카카오 개발자 앱 등록 필요: https://developers.kakao.com/

declare global {
  interface Window {
    Kakao: any;
  }
}

export function initKakao() {
  if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
  }
}

// 카카오톡 공유 (피드 템플릿)
export function shareToKakao(userData: ShareData) {
  if (!window.Kakao?.isInitialized()) return;

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `${userData.displayName} - ${userData.organizationName} ${userData.rankInOrg}위!`,
      description: `${userData.gameName} | ${userData.tier} ${userData.rank} | 상위 ${userData.percentile}%`,
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/${userData.userId}`,
      link: {
        mobileWebUrl: `${process.env.NEXT_PUBLIC_URL}/profile/${userData.shareSlug}`,
        webUrl: `${process.env.NEXT_PUBLIC_URL}/profile/${userData.shareSlug}`,
      },
    },
    social: {
      likeCount: userData.shareCount,
    },
    buttons: [
      {
        title: '내 랭킹 확인하기',
        link: {
          mobileWebUrl: `${process.env.NEXT_PUBLIC_URL}`,
          webUrl: `${process.env.NEXT_PUBLIC_URL}`,
        },
      },
      {
        title: '랭킹 보기',
        link: {
          mobileWebUrl: `${process.env.NEXT_PUBLIC_URL}/profile/${userData.shareSlug}`,
          webUrl: `${process.env.NEXT_PUBLIC_URL}/profile/${userData.shareSlug}`,
        },
      },
    ],
  });
}

// 카카오톡 SDK 스크립트 로드
// src/app/layout.tsx에 추가
// <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" strategy="lazyOnload" />
```

### 9.3 한국 학교 데이터 수집

```typescript
// scripts/seed-schools.ts
// 교육부 NEIS 학교기본정보 API 활용

const NEIS_API = 'https://open.neis.go.kr/hub/schoolInfo';
const NEIS_KEY = process.env.NEIS_API_KEY;

// 시/도 교육청 코드
const ATPT_CODES = {
  서울: 'B10', 부산: 'C10', 대구: 'D10', 인천: 'E10',
  광주: 'F10', 대전: 'G10', 울산: 'H10', 세종: 'I10',
  경기: 'J10', 강원: 'K10', 충북: 'M10', 충남: 'N10',
  전북: 'P10', 전남: 'Q10', 경북: 'R10', 경남: 'S10',
  제주: 'T10',
};

interface NeisSchool {
  SCHUL_NM: string;       // 학교명
  ENG_SCHUL_NM: string;   // 영문명
  SCHUL_KND_SC_NM: string; // 학교종류 (초/중/고/대)
  ORG_RDNMA: string;      // 도로명주소
  ATPT_OFCDC_SC_NM: string; // 시도교육청명
}

async function seedSchools() {
  for (const [region, code] of Object.entries(ATPT_CODES)) {
    let page = 1;
    while (true) {
      const res = await fetch(
        `${NEIS_API}?KEY=${NEIS_KEY}&Type=json&pIndex=${page}&pSize=1000&ATPT_OFCDC_SC_CODE=${code}`
      );
      const data = await res.json();
      const schools = data.schoolInfo?.[1]?.row;
      if (!schools || schools.length === 0) break;

      // MVP: 중/고/대학만 (초등학생은 게임 랭킹 타겟 아님)
      const filtered = schools.filter((s: NeisSchool) =>
        ['중학교', '고등학교', '대학교'].some(t => s.SCHUL_KND_SC_NM.includes(t))
      );

      // DB에 upsert
      await db.insert(organizations).values(
        filtered.map((s: NeisSchool) => ({
          name: s.SCHUL_NM,
          nameEn: s.ENG_SCHUL_NM,
          type: s.SCHUL_KND_SC_NM.includes('대학') ? 'university' : 'school',
          region: s.ATPT_OFCDC_SC_NM,
          regionCode: regionToCode(s.ATPT_OFCDC_SC_NM),
          address: s.ORG_RDNMA,
        }))
      ).onConflictDoNothing();

      page++;
    }
  }
}

// 직장은 MVP에서 유저 자유 입력 → 관리자 검증 방식
// 추후 고용노동부 사업체 데이터 또는 크롤링으로 자동화
```

---

## 10. 인프라 및 배포

### 10.1 Vercel 배포 구성

```
// vercel.json
{
  "regions": ["icn1"],           // 인천 (한국) 리전 우선
  "framework": "nextjs",
  "functions": {
    "app/api/share/[userId]/route.ts": {
      "memory": 1024,            // 이미지 생성은 메모리 필요
      "maxDuration": 30          // 이미지 생성 최대 30초
    },
    "app/api/og/[userId]/route.tsx": {
      "memory": 256              // OG는 Edge Runtime으로 가벼움
    }
  },
  "crons": [
    {
      "path": "/api/cron/recompute-rankings",
      "schedule": "0 */1 * * *"  // 매 1시간
    },
    {
      "path": "/api/cron/refresh-stale-ranks",
      "schedule": "*/15 * * * *" // 15분마다 (오래된 유저 랭크 갱신)
    }
  ],
  "headers": [
    {
      "source": "/api/og/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, s-maxage=3600, stale-while-revalidate=86400" }
      ]
    }
  ]
}
```

### 10.2 환경변수

```bash
# .env.local (예시 - 절대 커밋 금지)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Game APIs
RIOT_API_KEY=RGAPI-xxx
PUBG_API_KEY=eyJ...

# Kakao
NEXT_PUBLIC_KAKAO_JS_KEY=xxx

# NEIS (학교 데이터)
NEIS_API_KEY=xxx

# Naver
NAVER_SITE_VERIFICATION=xxx

# App
NEXT_PUBLIC_URL=https://ranking-dorgg.kr
CRON_SECRET=xxx  # Vercel Cron 인증용
```

### 10.3 한국 레이턴시 최적화

```
성능 목표:
- 첫 페이지 로드 (FCP): < 1.5초
- 검색 응답: < 2초 (캐시 히트 시 < 500ms)
- 랭킹 페이지 로드: < 1초 (SSR + 캐시)
- 공유 이미지 생성: < 3초

최적화 전략:
1. Vercel icn1 리전 (인천) → 한국 유저 레이턴시 최소화
2. Supabase Singapore 리전 → DB 레이턴시 ~40ms
   (한국 리전 미지원이므로 차선책)
3. Upstash Seoul 리전 → Redis 레이턴시 < 5ms
4. Vercel Edge Cache → 정적 자산 + OG 이미지 CDN 캐싱
5. React Query staleTime: 30초 → 클라이언트 재요청 최소화
6. ISR (Incremental Static Regeneration) → 인기 조직 랭킹 페이지 정적 생성

대안 고려 (Vercel이 부적합할 경우):
- AWS Seoul 리전 (ap-northeast-2) + Amplify 또는 자체 EC2
- 장점: DB도 Seoul 리전 가능 (RDS), 완전한 레이턴시 제어
- 단점: 운영 부담 증가, 배포 파이프라인 구축 필요
- 결론: MVP는 Vercel로 시작, 레이턴시 문제 시 AWS 마이그레이션
```

---

## 11. MVP 범위 정의

### 11.1 MVP 포함 (Phase 1 - 2주)

| 기능 | 상세 | 우선순위 |
|------|------|----------|
| **게임 검색** | 발로란트 + 롤 (Riot API만) | P0 |
| **소속 등록** | 학교 선택 (NEIS 데이터) | P0 |
| **학교 랭킹** | 동일 학교 내 게임별 순위 | P0 |
| **공유 이미지** | OG 이미지 (카카오톡/디스코드 미리보기) | P0 |
| **카카오톡 공유** | Kakao JS SDK 연동 | P0 |
| **기본 UI** | 검색, 결과, 랭킹, 공유 4페이지 | P0 |
| **모바일 최적화** | 반응형 (모바일 퍼스트) | P0 |

### 11.2 Phase 2 (런칭 후 1-2주)

| 기능 | 상세 | 우선순위 |
|------|------|----------|
| **PUBG 연동** | PUBG API 추가 | P1 |
| **오버워치 연동** | overfast-api 연동 | P1 |
| **직장 랭킹** | 유저 입력 기반 직장 등록 | P1 |
| **인스타 스토리 이미지** | 1080x1920 이미지 생성 | P1 |
| **지역 랭킹** | 시/도 단위 랭킹 | P1 |
| **통합(combined) 랭킹** | 여러 게임 통합 순위 | P1 |

### 11.3 Phase 3 (성장기)

| 기능 | 상세 | 우선순위 |
|------|------|----------|
| **소셜 로그인** | 카카오/구글 로그인 | P2 |
| **랭킹 히스토리** | 주간/월간 순위 변동 그래프 | P2 |
| **리더보드** | 전국 상위 랭커 | P2 |
| **알림** | 순위 변동 알림 (카카오 알림톡) | P2 |
| **군대 랭킹** | 부대별 랭킹 (키워드 타겟) | P2 |

### 11.4 MVP 핵심 유저 플로우

```
1. 메인 페이지 접속
   └→ 게임 선택 (발로란트/롤)
      └→ 게임 닉네임 + 태그 입력
         └→ API 조회 → 티어/랭크 표시
            └→ "내 학교에서 몇 등인지 확인하기" CTA
               └→ 학교 검색 + 선택
                  └→ 닉네임(표시명) 입력
                     └→ 등록 완료 → 학교 내 랭킹 표시
                        └→ "공유하기" 버튼
                           ├→ 카카오톡 공유 (Kakao SDK)
                           ├→ 링크 복사 (디스코드용)
                           └→ 이미지 저장 (인스타용)
```

---

## 12. 바이럴 성장 전략 기술 요소

### 12.1 바이럴 루프 설계

```
유저 A가 랭킹 공유
    ↓
카카오톡/디스코드에서 링크 클릭 (OG 미리보기 매력적)
    ↓
유저 B가 "나도 해보자" → 검색 → 등록
    ↓
유저 B도 공유 → 반복

핵심 지표:
- K-Factor = (공유 비율) × (공유당 클릭 수) × (클릭→등록 전환율)
- 목표: K > 1 (바이럴 성장)
```

### 12.2 공유 최적화 기술 요소

```typescript
// 1. OG 이미지 품질이 바이럴의 핵심
// → 매력적인 디자인 + 명확한 정보 (랭킹, 티어, 학교)
// → 호기심 유발: "이 사람 학교에서 1등이네?"

// 2. 공유 URL에 레퍼럴 코드 포함
// ranking-dorgg.kr/profile/abc123?ref=xyz789
// → 누가 데려왔는지 추적 가능

// 3. 디스코드 Embed 최적화
// Discord는 OG 메타태그를 잘 파싱함
// → 큰 이미지 (summary_large_image) + 컬러 테마

// 4. 인스타그램 스토리 공유
// → "이미지 저장 → 스토리에 업로드" 가이드 제공
// → 스와이프 업 링크 (팔로워 1만+ 필요) 대신 "프로필 링크" 유도
// → 이미지에 QR코드 또는 URL 텍스트 포함

// 5. "공유 보상" 시스템 (기술적으로)
// share_events 테이블로 추적
// 공유 많이 한 유저에게 "공유왕" 뱃지 → 추가 공유 동기
```

### 12.3 경쟁 심리 유발 요소

```typescript
// 랭킹 표시 시 경쟁 심리를 자극하는 UI 요소

interface RankDisplay {
  // "2등과 38점 차이!" → 1등 유저에게 위협감
  gapToNext: number;
  
  // "3등 따라잡기까지 LP 12점!" → 동기부여
  gapToPrevious: number;
  
  // "지난주 대비 ↑2등" → 성장감
  rankChange: number;
  
  // "우리 학교 게이머 47명 중 5위" → 규모감
  totalInOrg: number;
  
  // "상위 10.6%" → 백분위
  percentile: number;
  
  // 파워 문구 (percentile 기반)
  powerMessage: string;
  // 예: "상위 1% - 레전드급", "상위 10% - 엘리트", "상위 30% - 고수"
}

function getPowerMessage(percentile: number): string {
  if (percentile <= 1) return '전설의 게이머 👑';
  if (percentile <= 5) return '엘리트 게이머 🔥';
  if (percentile <= 10) return '상위권 실력자 💪';
  if (percentile <= 25) return '숨은 고수 ⚡';
  if (percentile <= 50) return '평균 이상 실력 ✨';
  return '성장 중인 게이머 🌱';
}
```

---

## 부록: 프로젝트 디렉토리 구조

```
ranking-dorgg/
├── src/
│   ├── app/
│   │   ├── (main)/              # 메인 레이아웃 그룹
│   │   │   ├── page.tsx         # 메인 (게임 선택)
│   │   │   ├── search/[game]/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── rank/[slug]/page.tsx
│   │   │   └── profile/[shareSlug]/page.tsx
│   │   ├── api/
│   │   │   ├── search/[game]/route.ts
│   │   │   ├── org/search/route.ts
│   │   │   ├── rank/[scopeType]/[scopeId]/route.ts
│   │   │   ├── user/register/route.ts
│   │   │   ├── share/[userId]/route.ts
│   │   │   ├── og/[userId]/route.tsx
│   │   │   └── cron/
│   │   │       ├── recompute-rankings/route.ts
│   │   │       └── refresh-stale-ranks/route.ts
│   │   ├── layout.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 컴포넌트
│   │   ├── game-selector.tsx
│   │   ├── search-input.tsx
│   │   ├── rank-card.tsx
│   │   ├── ranking-table.tsx
│   │   ├── share-buttons.tsx
│   │   ├── org-search.tsx
│   │   └── tier-badge.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── riot.ts          # Riot API 클라이언트
│   │   │   ├── pubg.ts          # PUBG API 클라이언트
│   │   │   ├── overwatch.ts     # Overwatch API 클라이언트
│   │   │   ├── rate-limiter.ts
│   │   │   └── adapters.ts      # 공통 인터페이스 구현
│   │   ├── cache/
│   │   │   └── redis.ts
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle 스키마
│   │   │   ├── client.ts        # DB 클라이언트
│   │   │   └── queries.ts       # 주요 쿼리 함수
│   │   ├── ranking/
│   │   │   ├── normalize.ts     # 티어 정규화
│   │   │   └── compute.ts       # 랭킹 계산
│   │   ├── kakao/
│   │   │   └── share.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-game-search.ts
│   │   └── use-ranking.ts
│   └── types/
│       ├── game.ts
│       ├── ranking.ts
│       └── api.ts
├── public/
│   ├── fonts/
│   │   └── Pretendard-Bold.otf
│   └── tier-icons/
│       ├── valorant/
│       ├── lol/
│       ├── pubg/
│       └── overwatch/
├── scripts/
│   ├── seed-schools.ts
│   └── seed-regions.ts
├── drizzle/
│   └── migrations/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
├── vercel.json
├── package.json
└── tsconfig.json
```

---

## 부록: 주요 의존성

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    
    "@supabase/supabase-js": "^2.45.0",
    "drizzle-orm": "^0.33.0",
    "@upstash/redis": "^1.34.0",
    "@upstash/ratelimit": "^2.0.0",
    
    "@vercel/og": "^0.6.0",
    "@napi-rs/canvas": "^0.1.53",
    
    "zod": "^3.23.0",
    "@tanstack/react-query": "^5.56.0",
    "zustand": "^4.5.0",
    "nanoid": "^5.0.0",
    
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.441.0",
    
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.0",
    "@types/react": "^18.3.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0"
  }
}
```

---

## 부록: 예상 비용 (월간, MVP 기준)

| 항목 | 비용 | 비고 |
|------|------|------|
| Vercel Pro | $20/월 | 상용 배포 필수 |
| Supabase Pro | $25/월 | 8GB DB, 250GB 전송 |
| Upstash Redis | $0 (무료 티어) | 일 10,000 요청까지 무료 |
| 도메인 (ranking-dorgg.kr) | ~$15/년 | .kr 도메인 |
| **합계** | **~$50/월** | 트래픽 증가 시 Vercel 종량 추가 |

게임 API는 모두 무료 (rate limit 내 사용).

---

> **다음 단계**: 이 기술 사양서를 기반으로 executor 에이전트가 프로젝트 초기 세팅 및 Phase 1 MVP 구현을 진행합니다.
