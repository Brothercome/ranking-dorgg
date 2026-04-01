# Ranking Dorgg (랭킹도르그) - Implementation Plan

> **Created**: 2026-04-02
> **Status**: Ready for execution
> **Scope**: MVP - Valorant (Henrik API) + LoL (Riot API), Schools only, No auth
> **Estimated Tasks**: 26 tasks across 6 groups

---

## MVP Scope Decisions (Pre-confirmed)

- **Games**: Valorant (Henrik unofficial API as bridge until Riot Production Key) + LoL (Riot official API)
- **Organizations**: Schools only (NEIS API for Korean school data). Workplaces deferred to P1.
- **Auth**: No login. Game ID search + school selection. Account verification deferred.
- **Share**: KakaoTalk link share + image download for Instagram Stories + Discord OG preview + link copy
- **Ranking queues**: LoL Solo/Duo, Valorant Competitive only
- **PUBG/OW2**: Deferred to P1

---

## Group 1: Project Setup (Sequential)

### Task 1: Initialize Next.js Project
**Description**: Create a new Next.js 14+ project with TypeScript, Tailwind CSS, ESLint, and App Router enabled. Configure TypeScript strict mode. Set up path aliases (`@/` for `src/`).

**Key files to create**:
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `.eslintrc.json`
- `src/app/layout.tsx` (root layout with dark theme, Pretendard font)
- `src/app/page.tsx` (placeholder)
- `src/app/globals.css` (Tailwind directives + gaming dark theme CSS variables)

**Commands**:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Dependencies**: None
**Complexity**: simple
**Parallel group**: G1-sequential (must complete before Task 2)

**Acceptance criteria**:
- `npm run dev` starts without errors
- TypeScript strict mode enabled
- App Router structure under `src/app/`
- Path alias `@/` resolves to `src/`

---

### Task 2: Install Dependencies
**Description**: Install all required npm packages for the project.

**Packages to install**:
```bash
# UI
npx shadcn-ui@latest init
npm install zustand @tanstack/react-query

# Database & ORM
npm install drizzle-orm @supabase/supabase-js
npm install -D drizzle-kit

# Caching
npm install @upstash/redis @upstash/ratelimit

# Image generation
npm install @vercel/og

# Utilities
npm install zod nanoid
npm install -D @types/node

# Korean font for OG images
# (Pretendard font file will be added to public/fonts/)
```

**Key files to modify**:
- `package.json` (dependencies added)
- `src/lib/shadcn/utils.ts` (shadcn utility - created by init)
- `components.json` (shadcn config)
- `tailwind.config.ts` (shadcn + custom gaming theme colors)

**Dependencies**: Task 1
**Complexity**: simple
**Parallel group**: G1-sequential

**Acceptance criteria**:
- All packages installed without peer dependency errors
- `shadcn-ui` initialized with "New York" style, dark theme default
- `npm run build` succeeds

---

### Task 3: Configure Project Structure & Environment
**Description**: Create the full directory structure, environment variable template, and shared configuration files.

**Key files to create**:
```
src/
├── app/
│   ├── api/
│   │   ├── search/[game]/route.ts       (placeholder)
│   │   ├── org/search/route.ts          (placeholder)
│   │   ├── rank/[orgId]/route.ts        (placeholder)
│   │   ├── og/[...params]/route.tsx     (placeholder)
│   │   └── share/image/route.ts         (placeholder)
│   ├── (main)/
│   │   ├── page.tsx                     (landing - placeholder)
│   │   ├── search/page.tsx              (search - placeholder)
│   │   └── rank/[id]/page.tsx           (result - placeholder)
│   ├── share/[id]/page.tsx              (public share view - placeholder)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                              (shadcn components)
│   ├── ranking/                         (ranking-specific components)
│   ├── share/                           (share card components)
│   └── layout/                          (header, footer, nav)
├── lib/
│   ├── db/
│   │   ├── index.ts                     (Drizzle client)
│   │   ├── schema.ts                    (Drizzle schema)
│   │   └── migrate.ts                   (migration runner)
│   ├── api/
│   │   ├── riot.ts                      (Riot API client)
│   │   ├── henrik.ts                    (Henrik Valorant API client)
│   │   └── neis.ts                      (NEIS school API client)
│   ├── ranking/
│   │   ├── normalize.ts                 (tier normalization)
│   │   └── compute.ts                   (ranking calculation)
│   ├── cache/
│   │   └── redis.ts                     (Upstash Redis client + cache helpers)
│   ├── share/
│   │   └── kakao.ts                     (KakaoTalk share helpers)
│   └── utils.ts                         (shared utilities)
├── types/
│   ├── game.ts                          (game-related types)
│   ├── ranking.ts                       (ranking types)
│   └── api.ts                           (API response types)
├── stores/
│   └── search-store.ts                  (Zustand store for search flow)
└── hooks/
    ├── use-game-search.ts               (TanStack Query hook)
    └── use-ranking.ts                   (TanStack Query hook)
```

**Additional files**:
- `.env.example` with all required variables
- `.env.local` (gitignored)
- `.gitignore` (ensure .env.local, node_modules, .next are ignored)
- `drizzle.config.ts` (Drizzle Kit config pointing to Supabase)

**Environment variables template** (`.env.example`):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Riot Games API
RIOT_API_KEY=

# Henrik Valorant API (unofficial - bridge until Riot Production Key)
HENRIK_API_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# KakaoTalk Share
NEXT_PUBLIC_KAKAO_JS_KEY=

# App
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=랭킹도르그
```

**Dependencies**: Task 2
**Complexity**: standard
**Parallel group**: G1-sequential

**Acceptance criteria**:
- All directories exist
- `.env.example` contains all required variables
- Placeholder route handlers return `{ status: "not implemented" }`
- `npm run build` succeeds
- TypeScript finds no errors in placeholder files

---

## Group 2: Database & Core Logic (Partially Parallel)

### Task 4: Define Drizzle Schema
**Description**: Implement the full Drizzle ORM schema matching the tech spec. Simplified for MVP (no `users` table - game accounts are the primary entity; no auth).

**Key files**:
- `src/lib/db/schema.ts` - Full schema definition
- `src/lib/db/index.ts` - Drizzle client initialization
- `drizzle.config.ts` - Drizzle Kit configuration

**Schema tables (MVP-simplified)**:
1. `game_accounts` - Game account records (primary entity, no user table needed for MVP)
   - id, game_type (valorant/lol), game_id, game_tag, game_puuid
   - current_tier, current_rank, current_points, tier_numeric (0-10000)
   - wins, losses, win_rate, raw_rank_data (JSONB)
   - last_updated_at, created_at
   - UNIQUE(game_type, game_id)

2. `organizations` - Schools
   - id, type (school only for MVP), name, normalized_name
   - school_code (NEIS code), school_level (middle/high/university)
   - region_sido, region_sigungu
   - member_count, created_at
   - UNIQUE(type, normalized_name)

3. `account_organizations` - Many-to-many mapping
   - id, game_account_id (FK), organization_id (FK)
   - joined_at
   - UNIQUE(game_account_id, organization_id)

4. `ranking_cache` - Precomputed ranking data (JSONB)
   - id, scope_type, scope_id, game_type
   - rankings (JSONB array), total_participants
   - computed_at, expires_at, is_stale
   - UNIQUE(scope_type, scope_id, game_type)

5. `share_events` - Viral tracking
   - id, game_account_id (FK), organization_id (FK)
   - share_channel (kakao/instagram/discord/link_copy)
   - share_url, click_count, created_at

**Indexes**: As specified in requirements (game_type+game_id lookup, normalized_name, region, ranking scope)

**Dependencies**: Task 3
**Complexity**: standard
**Parallel group**: G2-A (can start as soon as Task 3 is done)

**Acceptance criteria**:
- `npx drizzle-kit generate` produces valid SQL migration
- All table relationships have proper foreign keys
- Indexes cover primary query patterns
- TypeScript types are properly inferred from schema

---

### Task 5: Create Supabase Migration
**Description**: Generate and validate Drizzle migration files. Include seed data for Korean regions.

**Key files**:
- `drizzle/0000_initial_schema.sql` (generated by drizzle-kit)
- `src/lib/db/seed-regions.ts` - Region seed data (17 시/도)

**Region seed data** (17 Korean 시/도):
```
서울특별시, 부산광역시, 대구광역시, 인천광역시, 광주광역시,
대전광역시, 울산광역시, 세종특별자치시, 경기도, 강원특별자치도,
충청북도, 충청남도, 전북특별자치도, 전라남도, 경상북도, 경상남도, 제주특별자치도
```

**Dependencies**: Task 4
**Complexity**: simple
**Parallel group**: G2-B (after Task 4)

**Acceptance criteria**:
- Migration SQL is valid and can be applied to Supabase
- `drizzle-kit push` succeeds against Supabase (or migration file is correct SQL)
- Region data can be inserted

---

### Task 6: Implement Game API Clients
**Description**: Build API client adapters for LoL (Riot official) and Valorant (Henrik unofficial). Both must implement a shared `GameApiAdapter` interface. Include rate limiting via Upstash Redis.

**Key files**:
- `src/types/game.ts` - Shared types (`GameProfile`, `GameApiAdapter`, `RankInfo`, tier enums)
- `src/lib/api/riot.ts` - Riot Games API client (LoL)
  - `searchPlayer(gameName, tagLine)` -> PUUID via account-v1
  - `getSummonerByPuuid(puuid)` -> Summoner ID via summoner-v4
  - `getRankedInfo(summonerId)` -> LeagueEntry via league-v4
  - Rate limiting: sliding window 18 req/s via Upstash
- `src/lib/api/henrik.ts` - Henrik unofficial Valorant API client
  - `searchPlayer(gameName, tagLine)` -> Account info
  - `getMMR(gameName, tagLine)` -> Current tier, RR
  - Base URL: `https://api.henrikdev.xyz/valorant/v1/`
  - Rate limiting: respect Henrik API limits
- `src/lib/api/game-adapter.ts` - Factory that returns correct adapter by game type
- `src/lib/cache/redis.ts` - Redis client + cache wrapper with TTL constants

**API flow for LoL**:
1. Riot ID (gameName#tagLine) -> `account-v1/accounts/by-riot-id/{gameName}/{tagLine}` -> PUUID
2. PUUID -> `summoner-v4/summoners/by-puuid/{puuid}` -> encrypted summoner ID
3. Summoner ID -> `league-v4/entries/by-summoner/{id}` -> ranked entries (filter RANKED_SOLO_5x5)

**API flow for Valorant (Henrik)**:
1. `GET /valorant/v1/account/{name}/{tag}` -> PUUID, region
2. `GET /valorant/v1/mmr/{region}/{name}/{tag}` -> current tier, RR, tier patched (Korean name)

**Cache strategy**:
- Cache key: `search:{game}:{gameName}:{tag}`
- TTL: 5 minutes for search, 30 minutes for rank data
- On cache hit, return cached data immediately
- On cache miss, call API, store result, return

**Dependencies**: Task 3 (for types), Task 4 (for cache/redis setup)
**Complexity**: complex
**Parallel group**: G2-A (can run parallel with Task 4 if types are defined first)

**Acceptance criteria**:
- LoL: Given valid Riot ID, returns tier/rank/LP/wins/losses
- Valorant: Given valid Riot ID, returns tier/RR via Henrik API
- Both return `null` gracefully for non-existent accounts
- Rate limiting prevents exceeding API quotas
- Cached responses are returned for repeat queries within TTL
- Error handling for API timeouts, 404s, 429s (rate limited)

---

### Task 7: Implement Tier Normalization System
**Description**: Normalize Valorant and LoL tier data to a unified 0-10000 scale for cross-comparison within the same game.

**Key files**:
- `src/lib/ranking/normalize.ts` - Normalization functions per game
- `src/lib/ranking/compute.ts` - Ranking computation (sort by tierNumeric within org)

**Normalization logic**:

**Valorant** (competitiveTier 3-27 + RR 0-100):
```
Iron 1-3: 300-700 + RR bonus
Bronze 1-3: 1000-1600 + RR bonus
Silver 1-3: 2000-2600 + RR bonus
Gold 1-3: 3000-3600 + RR bonus
Platinum 1-3: 4000-4600 + RR bonus
Diamond 1-3: 5500-6500 + RR bonus
Ascendant 1-3: 7000-7800 + RR bonus
Immortal 1-3: 8200-9000 + RR bonus
Radiant: 9500+ (RR-based up to 10000)
RR bonus = floor((rr / 100) * 200)
```

**LoL** (tier + rank + LP):
```
Iron: 0, Bronze: 1000, Silver: 2000, Gold: 3000
Platinum: 4000, Emerald: 5000, Diamond: 6500
Master: 8000, Grandmaster: 9000, Challenger: 9500
Rank offset: IV=0, III=250, II=500, I=750
LP bonus: floor((min(lp, 100) / 100) * 250)
Master+: base + floor(lp / 5)
```

**Ranking computation**:
- Given organization_id + game_type, query all game_accounts linked to that org
- Sort by tier_numeric DESC
- Assign rank positions (same tierNumeric = same rank)
- Calculate percentile: (rank / total) * 100
- Cache result in ranking_cache table

**Dependencies**: Task 4 (schema), Task 6 (game types)
**Complexity**: standard
**Parallel group**: G2-A (can run parallel with Task 6)

**Acceptance criteria**:
- `normalizeValorant(27, 80)` returns ~9660 (Radiant + high RR)
- `normalizeLoL('GOLD', 'II', 75)` returns ~3688
- `normalizeLoL('CHALLENGER', 'I', 1200)` returns 9740
- Ranking computation correctly orders players and handles ties
- Percentile calculation is accurate

---

### Task 8: Implement School Search (NEIS API)
**Description**: Integrate with Korea's NEIS (나이스) open API to search and retrieve school data. Provide autocomplete functionality.

**Key files**:
- `src/lib/api/neis.ts` - NEIS API client
- `src/lib/db/seed-schools.ts` - Optional: pre-seed popular schools

**NEIS API details**:
- Endpoint: `https://open.neis.go.kr/hub/schoolInfo`
- Parameters: `KEY`, `Type=json`, `SCHUL_NM={query}` (school name search)
- Returns: school name, school code, address, school level (초/중/고/대), region
- Free tier: sufficient for MVP usage

**Implementation**:
1. `searchSchools(query: string)` - Search by partial name, return top 10 matches
2. `getSchoolByCode(schoolCode: string)` - Get specific school details
3. Cache school search results in Redis (TTL: 24 hours)
4. When a school is first referenced, upsert into `organizations` table
5. Return results with region info for disambiguation (e.g., "서울고등학교 (서울 서초구)" vs "서울고등학교 (부산 해운대구)")

**Fallback**: If NEIS API is unavailable, search against existing `organizations` table entries.

**Dependencies**: Task 4 (schema for organizations table), Task 3 (Redis cache setup)
**Complexity**: standard
**Parallel group**: G2-A (parallel with Tasks 6, 7)

**Acceptance criteria**:
- Search "서울대" returns 서울대학교 with correct school code and region
- Search "한국고" returns multiple results with region disambiguation
- Results cached for 24 hours
- School upserted into organizations table on first reference
- Autocomplete returns results within 300ms (cache hit)

---

## Group 3: API Routes (Parallel after Group 2)

### Task 9: POST /api/search/[game] - Game ID Search
**Description**: API route that searches a game account, fetches current rank, caches result, and optionally registers into DB.

**Key files**:
- `src/app/api/search/[game]/route.ts`

**Request**: `POST /api/search/valorant` or `POST /api/search/lol`
```json
{
  "gameName": "Hide on bush",
  "tagLine": "KR1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "player": { "id": "puuid...", "name": "Hide on bush", "tag": "KR1" },
    "rank": {
      "tier": "Challenger", "rank": "I", "points": 1247,
      "tierNumeric": 9749, "tierDisplay": "챌린저"
    },
    "stats": { "wins": 342, "losses": 298, "winRate": 53.4 }
  }
}
```

**Flow**:
1. Validate input with Zod (game must be "valorant" or "lol", gameName 2-30 chars)
2. Check Redis cache (`search:{game}:{gameName}:{tagLine}`)
3. Cache miss -> call game API adapter
4. Normalize tier to 0-10000 score
5. Upsert game_account in DB (create if new, update rank if exists)
6. Cache result (TTL: 5 min)
7. Return formatted response

**Dependencies**: Task 6, Task 7, Task 4
**Complexity**: standard
**Parallel group**: G3 (all G3 tasks can run in parallel)

**Acceptance criteria**:
- Valid LoL Riot ID returns rank data
- Valid Valorant Riot ID returns rank data via Henrik
- Invalid ID returns `{ success: false, error: "Player not found" }`
- Repeat search within 5 min returns cached data (no API call)
- Unranked player returns appropriate message
- Input validation rejects malformed requests

---

### Task 10: GET /api/org/search - School Search with Autocomplete
**Description**: Search schools from NEIS API with autocomplete support.

**Key files**:
- `src/app/api/org/search/route.ts`

**Request**: `GET /api/org/search?q=서울대&type=school`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "name": "서울대학교",
      "type": "university",
      "schoolLevel": "university",
      "region": "서울특별시",
      "subRegion": "관악구",
      "schoolCode": "B100000581",
      "memberCount": 47
    }
  ]
}
```

**Flow**:
1. Validate: q must be >= 2 chars
2. Check Redis cache (`org:search:{query}`)
3. Cache miss -> query NEIS API
4. Cross-reference with local organizations table (add member_count)
5. Cache results (TTL: 24 hours)
6. Return top 10 matches sorted by relevance

**Dependencies**: Task 8, Task 4
**Complexity**: simple
**Parallel group**: G3

**Acceptance criteria**:
- 2+ character query returns matching schools
- Results include region for disambiguation
- member_count reflects actual registered users
- Cached for 24 hours
- Returns empty array (not error) for no matches

---

### Task 11: POST /api/rank/register - Register Account to School + Get Ranking
**Description**: Link a game account to a school and compute/return the ranking. This is the core action of the product.

**Key files**:
- `src/app/api/rank/register/route.ts`

**Request**:
```json
{
  "gameAccountId": "uuid...",
  "organizationId": "uuid..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accountOrg": { "id": "uuid...", "joinedAt": "..." },
    "ranking": {
      "rank": 3,
      "total": 47,
      "percentile": 6.4,
      "tierNumeric": 7400,
      "message": "서울대학교에서 47명 중 3위! 상위 6.4%"
    }
  }
}
```

**Flow**:
1. Validate gameAccountId and organizationId exist
2. Create account_organizations mapping (upsert, skip if exists)
3. Increment organization member_count
4. Invalidate ranking_cache for this org + game_type
5. Recompute ranking for this org + game_type
6. Return the user's rank within the org

**Dependencies**: Task 4, Task 7
**Complexity**: standard
**Parallel group**: G3

**Acceptance criteria**:
- Successfully links account to school
- Returns correct rank position
- Duplicate registration is idempotent (returns existing rank)
- member_count is accurate
- Ranking cache is invalidated and recomputed

---

### Task 12: GET /api/rank/[orgId] - Organization Ranking Leaderboard
**Description**: Return the full leaderboard for a school, optionally filtered by game.

**Key files**:
- `src/app/api/rank/[orgId]/route.ts`

**Request**: `GET /api/rank/{orgId}?game=lol&page=1&limit=50`

**Response**:
```json
{
  "success": true,
  "data": {
    "organization": { "name": "서울대학교", "memberCount": 47 },
    "rankings": [
      {
        "rank": 1,
        "gameAccountId": "uuid",
        "gameName": "Faker",
        "gameTag": "KR1",
        "game": "lol",
        "tier": "Challenger",
        "tierDisplay": "챌린저",
        "tierNumeric": 9800,
        "rank_position": 1
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 47 },
    "lastUpdated": "2026-04-02T12:00:00Z"
  }
}
```

**Flow**:
1. Check ranking_cache for this org + game
2. Cache valid -> return cached rankings
3. Cache expired/missing -> recompute from game_accounts + account_organizations
4. Store in ranking_cache
5. Return paginated results

**Dependencies**: Task 7, Task 4
**Complexity**: standard
**Parallel group**: G3

**Acceptance criteria**:
- Returns ordered leaderboard for an organization
- Supports game filter (valorant/lol/all)
- Pagination works correctly
- Cached results returned when fresh
- Empty org returns `{ rankings: [], total: 0 }` with friendly message

---

### Task 13: GET /api/og/[...params] - Dynamic OG Image Generation
**Description**: Generate Open Graph images for social sharing using @vercel/og (Satori). Edge Runtime.

**Key files**:
- `src/app/api/og/[...params]/route.tsx` (Edge Runtime)
- `public/fonts/Pretendard-Bold.otf` (Korean font for Satori)
- `public/fonts/Pretendard-Regular.otf`

**URL patterns**:
- `/api/og/rank/{gameAccountId}/{orgId}` - Personal ranking card (1200x630)

**OG Image design** (1200x630):
- Dark gradient background (#1a1a2e -> #16213e -> #0f3460)
- Game-specific accent color (Valorant: #ff4655, LoL: #c89b3c)
- Tier badge/icon area
- Player name + tag
- Tier text (Korean: 챌린저, 다이아몬드 etc.)
- School name + rank position + total members
- "상위 X%" percentile badge
- Branding: "랭킹도르그 | ranking-dorgg.kr"

**Dependencies**: Task 4 (to fetch user data), Pretendard font file
**Complexity**: complex
**Parallel group**: G3

**Acceptance criteria**:
- Returns valid PNG image (1200x630)
- Korean text renders correctly (Pretendard font)
- Game-specific color theming works
- Edge Runtime compatible (no Node.js APIs)
- Cached via Cache-Control headers (1 hour)
- Renders within 2 seconds

---

### Task 14: GET /api/share/image - High-Quality Share Image
**Description**: Generate high-quality Instagram Stories-sized image (1080x1920) for download.

**Key files**:
- `src/app/api/share/image/route.tsx` - Image generation (can use @vercel/og with 1080x1920 or Satori directly)

**Query params**: `?gameAccountId={id}&orgId={id}`

**Image design** (1080x1920 - Stories format):
- Full-screen dark gradient background
- Large tier icon (centered, ~400px)
- Player nickname + tag
- Tier name (Korean)
- Ranking card panel (school name, rank/total, percentile)
- Win rate stat bar
- CTA: "ranking-dorgg.kr에서 내 랭킹 확인하기"
- QR code or short URL at bottom

**Dependencies**: Task 13 (shares design components), Task 4
**Complexity**: complex
**Parallel group**: G3

**Acceptance criteria**:
- Returns valid PNG image (1080x1920)
- Korean text renders correctly
- Image quality sufficient for Instagram Stories (no pixelation)
- File size reasonable (< 500KB)
- Cached for 1 hour

---

## Group 4: Frontend Pages (Parallel after Group 3)

### Task 15: Landing Page (/)
**Description**: Gaming-themed landing page with hero section, game selection cards, and recent activity.

**Key files**:
- `src/app/(main)/page.tsx` - Landing page (Server Component)
- `src/components/landing/hero-section.tsx` - Hero with tagline
- `src/components/landing/game-selector.tsx` - Game selection cards (Valorant, LoL)
- `src/components/landing/recent-rankings.tsx` - Recent activity feed (optional)

**Design**:
- Dark theme (#0f0f1a base)
- Hero: "우리 학교에서 내 게임 랭킹은?" tagline
- Sub-hero: "게임 ID만 입력하면 학교 내 순위를 바로 확인!" 
- 2 game cards (Valorant red theme, LoL gold theme) with hover effects
- Each card links to `/search?game={game}`
- Mobile-first: cards stack vertically on mobile
- Neon glow effects, gradient borders

**Dependencies**: Task 2 (shadcn/ui), Task 3 (project structure)
**Complexity**: standard
**Parallel group**: G4 (all G4 tasks parallel)

**Acceptance criteria**:
- Renders on mobile (360px) and desktop (1024px+)
- Game cards are clickable, navigate to search page
- Dark gaming aesthetic with game-specific colors
- Core Web Vitals: LCP < 2s
- Korean text displays correctly

---

### Task 16: Search Page (/search)
**Description**: Multi-step search flow: Game ID input -> School selection -> Registration + Ranking display.

**Key files**:
- `src/app/(main)/search/page.tsx` - Search page (Client Component)
- `src/components/search/game-id-input.tsx` - Game ID input with tag field
- `src/components/search/player-preview.tsx` - Shows found player rank info
- `src/components/search/school-selector.tsx` - School autocomplete dropdown
- `src/components/search/search-stepper.tsx` - Step indicator (1. Game ID -> 2. School -> 3. Result)
- `src/stores/search-store.ts` - Zustand store for search flow state
- `src/hooks/use-game-search.ts` - TanStack Query hook for game search API
- `src/hooks/use-school-search.ts` - TanStack Query hook for school search API

**Flow (3 steps)**:
1. **Step 1 - Game ID**: Select game tab (Valorant/LoL) + enter gameName#tag -> Search button -> calls `/api/search/{game}` -> shows player preview (tier, win rate)
2. **Step 2 - School**: Autocomplete school input (min 2 chars) -> calls `/api/org/search` -> select school from dropdown
3. **Step 3 - Register**: Calls `/api/rank/register` -> redirects to `/rank/{gameAccountId}?org={orgId}`

**State management** (Zustand):
```typescript
interface SearchState {
  step: 1 | 2 | 3;
  game: 'valorant' | 'lol' | null;
  gameAccount: GameProfile | null;
  organization: Organization | null;
  setStep, setGame, setGameAccount, setOrganization, reset
}
```

**Dependencies**: Task 9, Task 10, Task 11 (API routes)
**Complexity**: complex
**Parallel group**: G4

**Acceptance criteria**:
- Step 1: Game search works for both Valorant and LoL
- Step 1: Shows loading spinner during API call
- Step 1: Shows error for invalid/not-found accounts
- Step 2: School autocomplete shows results after 2 chars
- Step 2: Handles same-name schools with region disambiguation
- Step 3: Registration succeeds and redirects to result page
- All steps work on mobile
- Back navigation between steps works

---

### Task 17: Result Page (/rank/[id])
**Description**: The core ranking display page showing the user's rank within their school, with share buttons.

**Key files**:
- `src/app/(main)/rank/[id]/page.tsx` - Result page (SSR for OG tags)
- `src/components/ranking/rank-card.tsx` - Main ranking card component
- `src/components/ranking/tier-badge.tsx` - Tier icon + name display
- `src/components/ranking/rank-position.tsx` - Large rank number (#3 / 47)
- `src/components/ranking/percentile-bar.tsx` - Visual percentile indicator
- `src/components/ranking/leaderboard-preview.tsx` - Top 5 in the school
- `src/components/share/share-buttons.tsx` - Share action buttons (KakaoTalk, Instagram, Discord, Link copy)

**Page layout**:
1. Player info header (game icon, name#tag, tier badge)
2. Main ranking card:
   - School name
   - Large rank number: "#3"
   - "47명 중" (out of 47)
   - Percentile bar: "상위 6.4%"
3. Stats row (wins, losses, win rate)
4. Mini leaderboard (top 5 in this school)
5. Share section:
   - KakaoTalk share button (yellow)
   - Instagram Stories download button (gradient)
   - Discord link copy button (purple)
   - Generic link copy button
6. CTA: "다른 게임도 확인하기" / "친구에게 알려주기"

**SSR metadata**: Dynamic OG tags using `generateMetadata()` for social sharing

**Dependencies**: Task 12 (ranking API), Task 13 (OG images)
**Complexity**: complex
**Parallel group**: G4

**Acceptance criteria**:
- Displays correct ranking data
- OG meta tags are server-rendered (visible in page source)
- Share buttons are functional (see Task 19-22)
- Mobile layout is clean and card is visually appealing
- "도발적 카피" messages based on rank (1st: "나야 1등", low rank: "아직 갈 길이 멀다...")
- Loading skeleton while data fetches

---

### Task 18: Share Page (/share/[id])
**Description**: Public-facing page when someone clicks a shared link. Shows the sharer's ranking with CTA to check your own.

**Key files**:
- `src/app/share/[id]/page.tsx` - Public share page (SSR)
- `src/components/share/share-landing.tsx` - Share card + CTA

**This page is the viral loop entry point**:
1. Shows the shared player's ranking card (same design as result page)
2. Prominent CTA: "나도 내 순위 확인하기 >" -> links to `/search?game={game}`
3. School context: "XX학교에 {N}명이 참여 중"
4. OG metadata optimized for KakaoTalk/Discord previews

**URL format**: `/share/{gameAccountId}?org={orgId}`

**SSR metadata**:
```
title: "{닉네임} - {학교명} {순위}위 | 랭킹도르그"
description: "{닉네임}님은 {학교명}에서 {총인원}명 중 {순위}위! 상위 {퍼센트}%"
og:image: /api/og/rank/{gameAccountId}/{orgId}
```

**Dependencies**: Task 13 (OG image), Task 12 (ranking data)
**Complexity**: standard
**Parallel group**: G4

**Acceptance criteria**:
- Page renders with full ranking data
- OG tags render correctly (test with Facebook debugger format)
- CTA button links to search page with correct game pre-selected
- Page loads within 1.5s (SSR)
- Mobile-optimized layout

---

## Group 5: Share System & Polish

### Task 19: KakaoTalk Share SDK Integration
**Description**: Integrate Kakao JavaScript SDK for native KakaoTalk sharing with custom template.

**Key files**:
- `src/lib/share/kakao.ts` - KakaoTalk share utility functions
- `src/components/share/kakao-share-button.tsx` - KakaoTalk share button component
- `src/app/layout.tsx` - Add Kakao SDK script tag

**Implementation**:
1. Load Kakao JS SDK (`https://t1.kakaocdn.net/kakao_js_sdk/2.8.0/kakao.min.js`)
2. Initialize with `Kakao.init(NEXT_PUBLIC_KAKAO_JS_KEY)`
3. Use `Kakao.Share.sendDefault()` with FeedTemplate:
   - Title: "{닉네임} - {학교명} {순위}위"
   - Description: "상위 {퍼센트}%! 나도 확인하기"
   - ImageUrl: OG image URL
   - Link: share page URL
   - Button: "나도 확인하기"

**Dependencies**: Task 17 (result page with share buttons)
**Complexity**: standard
**Parallel group**: G5

**Acceptance criteria**:
- KakaoTalk share opens native KakaoTalk share dialog on mobile
- Share content shows custom card with OG image
- "나도 확인하기" button in KakaoTalk links back to share page
- Works on both iOS and Android KakaoTalk
- Tracks share event via `/api/share/track` (if implemented)

---

### Task 20: Instagram Stories Image Download
**Description**: Allow users to download a Stories-sized image to share on Instagram.

**Key files**:
- `src/components/share/instagram-share-button.tsx` - Download button + instructions modal

**Implementation**:
1. On button click, fetch `/api/share/image?gameAccountId={id}&orgId={id}`
2. Convert response to blob -> create download link -> trigger download
3. Show instruction modal: "다운로드한 이미지를 인스타그램 스토리에 공유하세요!"
4. File name: `ranking-dorgg-{gameName}.png`

**Dependencies**: Task 14 (share image API), Task 17 (result page)
**Complexity**: simple
**Parallel group**: G5 (parallel with Task 19)

**Acceptance criteria**:
- Image downloads successfully on mobile browsers (Chrome, Safari)
- Downloaded image is 1080x1920, high quality
- Instruction modal is clear and dismissible
- Works on iOS Safari (blob download can be tricky)

---

### Task 21: Discord-Optimized OG Tags
**Description**: Ensure OG meta tags are optimized for Discord's embed preview format.

**Key files**:
- `src/app/share/[id]/page.tsx` - Update metadata
- `src/app/(main)/rank/[id]/page.tsx` - Update metadata

**Discord-specific requirements**:
- `og:type`: "website"
- `og:title`: Max 256 chars
- `og:description`: Max 4096 chars (Discord is generous)
- `og:image`: Must be HTTPS, 1200x630 recommended
- `theme-color` meta tag: game-specific color for Discord sidebar
- `og:site_name`: "랭킹도르그"

**Dependencies**: Task 13 (OG image generation), Task 18 (share page)
**Complexity**: simple
**Parallel group**: G5

**Acceptance criteria**:
- Discord embed shows custom card with OG image
- Theme color matches game (Valorant red, LoL gold)
- Title and description are in Korean, not truncated
- Image loads in Discord embed within 3 seconds

---

### Task 22: Link Copy Functionality
**Description**: Simple copy-to-clipboard for the share URL.

**Key files**:
- `src/components/share/link-copy-button.tsx`

**Implementation**:
- Use `navigator.clipboard.writeText()` with fallback
- Show toast notification: "링크가 복사되었습니다!"
- URL format: `{NEXT_PUBLIC_URL}/share/{gameAccountId}?org={orgId}`

**Dependencies**: Task 17 (result page)
**Complexity**: simple
**Parallel group**: G5

**Acceptance criteria**:
- Clipboard copy works on mobile and desktop
- Toast notification appears and auto-dismisses
- Fallback works if clipboard API is unavailable

---

### Task 23: Mobile Responsive Polish
**Description**: Comprehensive mobile responsiveness pass across all pages.

**Key files**:
- All page and component files (review pass)
- `src/app/globals.css` - Mobile-specific styles

**Breakpoints**:
- Mobile: 360px-480px (priority target)
- Tablet: 768px
- Desktop: 1024px+

**Focus areas**:
- Landing page game cards: 1 column on mobile, 2 on desktop
- Search stepper: vertical on mobile
- Ranking card: full-width on mobile with proper padding
- Share buttons: horizontal scroll or grid on mobile
- School autocomplete dropdown: full-width overlay on mobile
- Touch targets: minimum 44px tap area
- Font sizes: readable on small screens

**Dependencies**: Tasks 15-18 (all pages must exist)
**Complexity**: standard
**Parallel group**: G5 (after G4 pages exist)

**Acceptance criteria**:
- All pages render correctly at 360px width
- No horizontal scrolling on any page
- Touch targets are >= 44px
- Text is readable without zooming
- Interactive elements have appropriate mobile states

---

### Task 24: Loading States, Error Handling, Empty States
**Description**: Polish UX with proper loading skeletons, error boundaries, and empty state messages.

**Key files**:
- `src/components/ui/loading-skeleton.tsx` - Reusable skeleton components
- `src/components/ui/error-boundary.tsx` - Error boundary wrapper
- `src/components/ui/empty-state.tsx` - Empty state display
- `src/app/error.tsx` - Root error boundary
- `src/app/not-found.tsx` - 404 page
- `src/app/loading.tsx` - Root loading state

**States to handle**:
1. **Loading**: Skeleton for search results, ranking data, leaderboard
2. **Error**: API timeout, game API down, network error -> "잠시 후 다시 시도해주세요"
3. **Not found**: Invalid game ID -> "해당 계정을 찾을 수 없습니다"
4. **Unranked**: Player has no ranked data -> "아직 배치 게임을 완료하지 않았습니다"
5. **Empty org**: School has < 3 members -> "랭킹 집계 중! {N}명만 더 모이면 시작됩니다"
6. **API down**: Show cached data with "마지막 업데이트: {time}" badge

**Dependencies**: Tasks 15-18 (all pages)
**Complexity**: standard
**Parallel group**: G5

**Acceptance criteria**:
- Every async operation shows a loading skeleton (not a spinner)
- Errors show Korean user-friendly messages (not raw errors)
- Empty states have clear CTAs
- 404 page exists and is styled
- Error boundary catches React rendering errors

---

## Group 6: SEO & Analytics

### Task 25: SEO - Meta Tags, Sitemap, robots.txt
**Description**: Configure SEO for Naver and Google discovery.

**Key files**:
- `src/app/layout.tsx` - Default metadata
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - robots.txt
- `src/app/manifest.ts` - PWA manifest (optional)

**Default metadata**:
```typescript
export const metadata: Metadata = {
  title: { default: '랭킹도르그 - 우리 학교 게임 랭킹', template: '%s | 랭킹도르그' },
  description: '내 게임 랭크는 우리 학교에서 몇 등? 발로란트, 롤 학교별 랭킹을 확인하고 자랑하세요!',
  keywords: ['게임 랭킹', '학교 랭킹', '발로란트 랭킹', '롤 랭킹', '학교별 순위'],
  openGraph: { type: 'website', locale: 'ko_KR', siteName: '랭킹도르그' },
  verification: { google: '...', other: { 'naver-site-verification': '...' } },
}
```

**Sitemap**: Dynamic generation of school pages (`/share/*` URLs)
**robots.txt**: Allow all, link to sitemap

**Dependencies**: Task 18 (share pages for sitemap)
**Complexity**: simple
**Parallel group**: G6

**Acceptance criteria**:
- `<title>` and `<meta description>` render on all pages
- `/sitemap.xml` returns valid XML
- `/robots.txt` allows crawling
- Naver site verification meta tag present
- OG tags present on all public pages

---

### Task 26: Basic Analytics - Share Event Tracking
**Description**: Track share events and page views for viral funnel analysis.

**Key files**:
- `src/app/api/share/track/route.ts` - Share event tracking API
- `src/lib/analytics/track.ts` - Client-side tracking utility
- `src/components/share/share-buttons.tsx` - Add tracking to share buttons

**Tracking events**:
1. `page_view` - All page loads (via Next.js middleware or layout)
2. `search_complete` - Game ID search success
3. `school_selected` - School selection
4. `rank_registered` - Account linked to school
5. `share_clicked` - Share button clicked (with channel: kakao/instagram/discord/link)
6. `share_landing_visit` - Someone visited a share link

**Storage**: `share_events` table in Supabase (already in schema)

**Dependencies**: Task 4 (schema), Task 19-22 (share buttons)
**Complexity**: simple
**Parallel group**: G6

**Acceptance criteria**:
- Share events recorded with correct channel
- click_count incremented when share links are visited
- Basic analytics queryable: total shares by channel, conversion funnel
- No PII stored in analytics beyond game account references

---

## Execution Order Summary

```
Group 1 (Sequential):
  Task 1 → Task 2 → Task 3

Group 2 (Partially Parallel, after G1):
  Task 4 (schema) ──→ Task 5 (migration)
  Task 6 (game APIs) ─┐
  Task 7 (normalize) ──┤ (parallel, after Task 3)
  Task 8 (schools)   ──┘

Group 3 (Parallel, after G2):
  Task 9  (search API)    ─┐
  Task 10 (org search)     │
  Task 11 (rank register)  ├ (all parallel)
  Task 12 (leaderboard)    │
  Task 13 (OG image)       │
  Task 14 (share image)   ─┘

Group 4 (Parallel, after G3):
  Task 15 (landing)   ─┐
  Task 16 (search pg)  ├ (all parallel)
  Task 17 (result pg)  │
  Task 18 (share pg)  ─┘

Group 5 (After G4):
  Task 19 (KakaoTalk)  ─┐
  Task 20 (Instagram)   │
  Task 21 (Discord OG)  ├ (parallel)
  Task 22 (link copy)   │
  Task 23 (responsive)  │
  Task 24 (states)     ─┘

Group 6 (After G5):
  Task 25 (SEO)       ─┐ (parallel)
  Task 26 (analytics) ─┘
```

## Success Criteria

1. User can search a LoL or Valorant account by Riot ID and see their current rank
2. User can select their school from NEIS-powered autocomplete
3. User can see their rank position within their school
4. Shared links generate proper OG previews on KakaoTalk, Discord, and browsers
5. Instagram Stories image downloads correctly at 1080x1920
6. All pages are mobile-responsive (360px+)
7. Page load times < 2s (cached), < 3s (uncached)
8. Korean text renders correctly everywhere including OG images
9. Error states are handled gracefully with Korean user-friendly messages
10. The viral loop works: share link -> share page with CTA -> search page -> new registration
