# 랭킹도르그 (Ranking Dorgg) - 종합 요구사항 문서

> 작성일: 2026-04-02
> 버전: 1.0 (MVP 요구사항)
> 상태: 분석 완료 - 플래닝 대기

---

## 목차
1. [제품 개요](#1-제품-개요)
2. [기획 (Product/Planning)](#2-기획-productplanning)
3. [그로스 (Growth)](#3-그로스-growth)
4. [디자인 (Design)](#4-디자인-design)
5. [개발 (Development)](#5-개발-development)
6. [네트워크 이펙트 (Network Effects)](#6-네트워크-이펙트-network-effects)
7. [분석가 리뷰 (Analyst Review)](#7-분석가-리뷰-analyst-review)

---

## 1. 제품 개요

### 핵심 가치 제안
한국 게이머가 자신의 게임 랭크를 학교/직장 단위로 비교하고, 그 결과를 자랑할 수 있는 바이럴 웹 서비스.

### 지원 게임 (MVP)
| 게임 | API 제공자 | API 상태 | 랭킹 지표 |
|------|-----------|----------|-----------|
| Valorant | Riot Games (val-ranked-v1) | 공식 API 존재, Production Key 필요 | Competitive Tier (Iron~Radiant) + RR |
| League of Legends | Riot Games (league-v4) | 공식 API 존재, 안정적 | Tier + Division + LP |
| PUBG | PUBG Corp (ranked stats) | 공식 API 존재 | Ranked Tier + RP |
| Overwatch 2 | 비공식 (ow-api.com / OverFast API) | 공식 API 없음, 스크래핑 기반 | Competitive Rank (Bronze~Champion) |

### 핵심 사용자 흐름
```
[게임 선택] → [게임 ID 입력] → [학교/직장 입력] → [랭킹 확인] → [공유 카드 생성] → [SNS 공유]
                                                                              ↓
                                                              [링크 수신자가 사이트 방문]
                                                                              ↓
                                                              [자기 랭킹도 확인하고 싶어짐]
                                                                              ↓
                                                                        [바이럴 루프]
```

---

## 2. 기획 (Product/Planning)

### 2.1 MVP 기능 세트

#### P0 (반드시 포함)
- [ ] 게임 ID 검색 및 랭크 조회 (4개 게임)
- [ ] 학교/직장 입력 (자유 텍스트 + 자동완성)
- [ ] 해당 학교/직장 내 랭킹 표시
- [ ] 공유용 이미지 카드 생성
- [ ] KakaoTalk 공유 (Kakao Share SDK)
- [ ] Instagram Stories 공유 (이미지 다운로드 방식)
- [ ] Discord 공유 (URL + og:image)
- [ ] 링크 복사 기능

#### P1 (MVP 직후)
- [ ] 지역(시/도) 랭킹
- [ ] 전국 학교 랭킹 (학교별 평균 티어)
- [ ] 랭킹 변동 추적 (주간/월간)
- [ ] 다중 게임 통합 프로필

#### P2 (향후)
- [ ] 학교/직장 대항전 (팀 랭킹)
- [ ] 실시간 알림 (순위 변동 시)
- [ ] 커뮤니티 게시판
- [ ] 시즌 아카이브

### 2.2 게임 API 상세

#### Valorant (Riot Games API)
- **엔드포인트**: `https://kr.api.riotgames.com/val/ranked/v1/leaderboards/by-act/{actId}`
- **개인 조회**: Riot Account API (`riot/account/v1`) → PUUID 기반
- **지역 코드**: `kr` (한국 서버)
- **Rate Limit**: Development Key 20 req/s, 100 req/2min. Production Key는 심사 후 별도 할당
- **주의사항**: Personal/Development Key로는 Valorant API 접근 불가. **반드시 Production Key 승인 필요**
- **데이터**: competitiveTier (0-27), rankedRating (0-100), numberOfWins

#### League of Legends (Riot Games API)
- **엔드포인트**: `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/{encryptedSummonerId}`
- **소환사 조회**: `summoner-v4` → `account-v1` (Riot ID 기반, 2024년부터 변경)
- **지역 코드**: `kr` (한국 서버)
- **Rate Limit**: 동일 (앱/메서드별 제한)
- **데이터**: tier, rank (division), leaguePoints, wins, losses

#### PUBG
- **엔드포인트**: `https://api.pubg.com/shards/kakao/players?filter[playerNames]={playerName}`
- **랭크 조회**: `/shards/kakao/players/{playerId}/seasons/{seasonId}/ranked`
- **플랫폼**: `kakao` (한국 PC), `steam` (글로벌)
- **Rate Limit**: 10 req/min (기본)
- **주의사항**: 한국 PUBG는 카카오 샤드 사용. 시즌 7부터 랭크 스탯 제공
- **데이터**: currentTier (sub-tier 포함), currentRankPoint, roundsPlayed

#### Overwatch 2
- **비공식 API**: `https://ow-api.com/v1/stats/{platform}/{region}/{battletag}/complete`
- **대안 API**: OverFast API (`https://overfast-api.tekrop.fr/`)
- **주의사항**: 
  - 블리자드 공식 API 없음 (스크래핑 기반)
  - 프로필이 기본 비공개 → 유저가 직접 공개 설정 필요
  - 게임 종료 시에만 스탯 업데이트
- **데이터**: competitive rank (role별: tank, damage, support)
- **위험도**: 높음 - 비공식 API 중단 가능성

### 2.3 랭킹 메트릭 정규화

게임별 랭킹 체계가 다르므로 통합 비교를 위한 정규화 필요:

| 게임 | 티어 체계 | 정규화 점수 (0-10000) |
|------|----------|---------------------|
| Valorant | Iron 1 ~ Radiant | competitiveTier * 370 + RR * 3.7 |
| LoL | Iron IV ~ Challenger | tier_value * 400 + division * 100 + LP |
| PUBG | Bronze V ~ Master | tier_value * 500 + subTier * 100 + RP/10 |
| Overwatch 2 | Bronze 5 ~ Champion 1 | rank_value (100-5000 스케일) |

> **결정 필요**: 게임 간 교차 비교를 할 것인가? MVP에서는 동일 게임 내에서만 비교 권장.

### 2.4 학교/직장 데이터

- **학교 데이터**: 교육부 나이스(NEIS) 학교 기본정보 API 또는 정적 데이터셋 활용
  - 초/중/고/대학교 구분
  - 학교명, 주소(시/도, 구/군), 학교코드
- **직장 데이터**: 자유 입력 + 정규화 (동일 직장명 병합)
  - MVP에서는 자유 텍스트, 이후 사업자등록번호 기반 검증 고려
- **지역 매핑**: 학교 주소 기반 시/도 자동 매핑

---

## 3. 그로스 (Growth)

### 3.1 바이럴 루프 설계

```
[유저 A: 랭킹 확인] 
    → [공유 카드 생성 (자동)]
    → [SNS 공유 (1-tap)]
    → [유저 B: 카드/링크 확인]
    → [호기심 유발: "나는 몇 등이지?"]
    → [사이트 방문 → 랭킹 확인 → 공유]
    → [반복]
```

### 3.2 K-Factor 최적화 전략

| 전략 | 설명 | 예상 효과 |
|------|------|----------|
| **자동 공유 카드** | 랭킹 확인 즉시 공유용 이미지 생성, 1탭 공유 | 공유 전환율 30%+ 목표 |
| **도발적 카피** | "XX학교 1등은 나야" / "우리 학교에서 브론즈는 나뿐..." | 감정적 반응 유도 |
| **학교 랭킹 공백** | "XX학교는 아직 3명만 등록" → 친구 초대 유도 | 네트워크 밀도 증가 |
| **순위 변동 알림** | "누군가 당신을 제쳤습니다" (P1) | 재방문율 증가 |
| **학교 대항전** | "XX고 vs YY고 평균 티어 대결" (P2) | 집단 바이럴 |

### 3.3 한국 시장 특화 채널

#### KakaoTalk (최우선)
- **Kakao Share SDK (JavaScript)**: `Kakao.Share.sendDefault()` 또는 `Kakao.Share.createScrapButton()`
- 커스텀 템플릿: 랭킹 카드 이미지 + "나도 확인하기" 버튼
- **필수**: Kakao Developers 앱 등록, JavaScript Key 발급
- **SDK 버전**: JavaScript SDK 2.8.0 이상

#### Instagram Stories
- Web Share API 또는 이미지 다운로드 → "스토리에 공유" 안내
- 9:16 비율 이미지 생성 (1080x1920)
- 스토리 스티커 형태의 랭킹 카드 디자인

#### Discord
- og:image 메타 태그로 자동 미리보기 카드
- Discord 임베드 최적화 (제목, 설명, 썸네일)
- 한국 게임 커뮤니티 디스코드 서버 타겟

#### 기타 채널
- X (구 Twitter): og:image 카드
- 에브리타임 (대학생): 링크 공유
- 네이버 카페/블로그: SEO 기반 유입

### 3.4 SEO 전략

#### 네이버 SEO
- 네이버 서치어드바이저 등록 (searchadvisor.naver.com)
- 사이트맵 제출 (XML)
- 네이버 블로그/카페 키워드 타겟:
  - "발로란트 학교 랭킹"
  - "롤 우리 학교 순위"
  - "배그 직장 랭킹"
  - "[학교명] 게이머 랭킹"

#### 구글 SEO
- Next.js SSR/SSG 활용한 서버사이드 렌더링
- 구조화된 데이터 (JSON-LD)
- 각 학교/직장 페이지 → 개별 색인 가능한 URL 구조
  - `/school/[schoolId]` → "XX고등학교 게임 랭킹"
  - `/game/valorant/school/[schoolId]`

#### URL 구조 (SEO 친화적)
```
/                          # 메인 (게임 선택)
/valorant                  # 발로란트 랭킹
/lol                       # 리그오브레전드 랭킹
/pubg                      # 배틀그라운드 랭킹
/overwatch                 # 오버워치2 랭킹
/school/[schoolId]         # 학교별 랭킹
/company/[companySlug]     # 직장별 랭킹
/profile/[gameId]          # 개인 프로필 (공유 랜딩)
/ranking/[gameId]/[orgId]  # 특정 조직 내 개인 랭킹 (공유 카드 URL)
```

### 3.5 초기 유저 확보 전략

1. **시드 유저**: 대학교 게임 동아리 (에브리타임 홍보)
2. **인플루언서**: 소규모 게임 스트리머 (학교 랭킹 컨텐츠 제안)
3. **커뮤니티**: 인벤, 디시인사이드 게임 갤러리, 게임 디스코드 서버
4. **바이럴 시드**: 유명 학교(서울대, KAIST 등) 랭킹 페이지 미리 생성 → 공백 상태로 호기심 유발

---

## 4. 디자인 (Design)

### 4.1 디자인 원칙

1. **게이밍 감성**: 다크 테마 기본, 네온/그라데이션 액센트
2. **모바일 퍼스트**: 공유 수신은 99% 모바일 → 모바일 UX 최우선
3. **속도**: 3초 이내 결과 표시 (인지된 로딩 시간)
4. **자랑하고 싶은 카드**: 공유 카드가 제품의 핵심 → 디자인 퀄리티 최상위 투자

### 4.2 공유 카드 디자인 요구사항

#### Instagram Stories 카드 (1080x1920)
```
┌─────────────────────┐
│   🎮 랭킹도르그      │  ← 브랜드 로고
│                     │
│   [게임 아이콘]      │
│                     │
│   닉네임#TAG        │  ← 게임 ID
│   Diamond 2         │  ← 현재 티어 (게임별 아이콘)
│                     │
│   ┌───────────────┐ │
│   │  XX고등학교    │ │  ← 소속
│   │   🏆 1등 / 47명│ │  ← 핵심: 순위
│   │   상위 2.1%    │ │  ← 백분율
│   └───────────────┘ │
│                     │
│   [지역 랭킹]       │
│   서울시 142등       │
│                     │
│   나도 확인하기 →    │  ← CTA
│   ranking-dorgg.kr  │  ← URL
│                     │
│   ▓▓▓▓▓▓▓▓░░ 78%   │  ← 티어 게이지바
└─────────────────────┘
```

#### Discord/KakaoTalk 카드 (1200x630, og:image)
```
┌──────────────────────────────────┐
│ [게임아이콘] 닉네임 │ Diamond 2  │
│ XX고등학교 1등 / 47명            │
│ ranking-dorgg.kr                 │
└──────────────────────────────────┘
```

#### 디자인 세부 요구사항
- 게임별 고유 색상 테마 (Valorant: 빨강, LoL: 골드, PUBG: 오렌지, OW: 흰색+오렌지)
- 티어별 배지 아이콘 (각 게임 공식 티어 아이콘 사용 가능 여부 확인 필요)
- 한글 폰트: Pretendard 또는 Wanted Sans (게임 감성과 가독성 겸비)
- 영문/숫자: 고정폭 또는 게이밍 폰트 (e.g., Rajdhani, Orbitron)
- 그라데이션 배경: 티어에 따른 색상 변화 (브론즈→실버→골드→...)

### 4.3 페이지 구성

| 페이지 | 설명 | 핵심 요소 |
|--------|------|----------|
| 메인 | 게임 선택 + ID 입력 | 4개 게임 카드, 검색 입력창, 최근 조회 |
| 결과 | 개인 랭킹 표시 | 티어, 학교/직장 순위, 공유 버튼 |
| 학교/직장 | 조직 내 전체 랭킹 | 리더보드 테이블, 참여자 수 |
| 공유 랜딩 | 링크 수신자가 보는 페이지 | 공유자 랭킹 + "나도 확인하기" CTA |

### 4.4 반응형 브레이크포인트
- Mobile: 360px ~ 480px (최우선)
- Tablet: 768px
- Desktop: 1024px+

---

## 5. 개발 (Development)

### 5.1 기술 스택

| 계층 | 기술 | 선택 이유 |
|------|------|----------|
| **프레임워크** | Next.js 15 (App Router) | SSR/SSG → SEO, 이미지 생성 (API Routes), 한국 시장 SEO 최적화 |
| **언어** | TypeScript | 타입 안정성, API 응답 타입 정의 |
| **스타일링** | Tailwind CSS + shadcn/ui | 빠른 개발, 다크 테마, 게이밍 커스텀 |
| **DB** | Supabase (PostgreSQL) | 무료 티어, 실시간 구독, Row Level Security |
| **캐시** | Vercel KV (Redis) 또는 Upstash | API Rate Limit 대응 캐싱 |
| **이미지 생성** | @vercel/og (Satori) | 서버사이드 OG 이미지 생성, React 컴포넌트 기반 |
| **배포** | Vercel | Next.js 최적 배포, Edge Functions, 한국 CDN |
| **분석** | Google Analytics 4 + Mixpanel | 바이럴 퍼널 추적 |
| **모니터링** | Sentry | 에러 추적, API 실패 모니터링 |

### 5.2 시스템 아키텍처

```
[Client (Next.js)]
       │
       ├── /api/search     ← 게임 ID 검색
       ├── /api/register   ← 학교/직장 등록
       ├── /api/ranking    ← 랭킹 조회
       ├── /api/og         ← 공유 이미지 생성
       │
       ▼
[Next.js API Routes / Server Actions]
       │
       ├── [Cache Layer: Redis/Vercel KV]
       │       │
       │       └── TTL: 게임 데이터 1시간, 랭킹 5분
       │
       ├── [Game APIs]
       │       ├── Riot API (Valorant, LoL)
       │       ├── PUBG API
       │       └── OverFast API (OW2)
       │
       └── [Supabase PostgreSQL]
               ├── users
               ├── game_accounts
               ├── organizations (학교/직장)
               ├── rankings
               └── share_events
```

### 5.3 데이터베이스 스키마

```sql
-- 사용자 (로그인 없음, 게임 계정 기반 식별)
CREATE TABLE game_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type VARCHAR(20) NOT NULL,          -- 'valorant', 'lol', 'pubg', 'overwatch'
    game_id VARCHAR(100) NOT NULL,           -- 게임 내 ID (Riot ID, PUBG 닉네임 등)
    game_puuid VARCHAR(200),                 -- 게임 API 내부 식별자
    current_tier VARCHAR(50),                -- 현재 티어 문자열
    current_rank_score INTEGER,              -- 정규화된 점수 (0-10000)
    raw_rank_data JSONB,                     -- API 원본 응답 저장
    last_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_type, game_id)
);

-- 조직 (학교/직장)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,               -- 'school', 'company'
    name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,   -- 정규화된 이름 (검색용)
    school_code VARCHAR(20),                 -- NEIS 학교코드 (학교인 경우)
    school_level VARCHAR(20),                -- 'elementary', 'middle', 'high', 'university'
    region_sido VARCHAR(20),                 -- 시/도
    region_sigungu VARCHAR(30),              -- 시/군/구
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, normalized_name)
);

-- 게임 계정 ↔ 조직 매핑
CREATE TABLE account_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_account_id UUID REFERENCES game_accounts(id),
    organization_id UUID REFERENCES organizations(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_account_id, organization_id)
);

-- 랭킹 스냅샷 (주기적 계산)
CREATE TABLE ranking_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_account_id UUID REFERENCES game_accounts(id),
    organization_id UUID REFERENCES organizations(id),
    game_type VARCHAR(20) NOT NULL,
    rank_position INTEGER NOT NULL,          -- 조직 내 순위
    total_members INTEGER NOT NULL,          -- 조직 내 총 인원
    percentile DECIMAL(5,2),                 -- 상위 %
    rank_score INTEGER NOT NULL,             -- 기준 점수
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공유 이벤트 추적
CREATE TABLE share_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_account_id UUID REFERENCES game_accounts(id),
    organization_id UUID REFERENCES organizations(id),
    share_channel VARCHAR(30),               -- 'kakao', 'instagram', 'discord', 'link_copy'
    share_url TEXT,
    clicked_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_game_accounts_lookup ON game_accounts(game_type, game_id);
CREATE INDEX idx_org_name ON organizations(normalized_name);
CREATE INDEX idx_org_region ON organizations(region_sido, type);
CREATE INDEX idx_ranking_org ON ranking_snapshots(organization_id, game_type, snapshot_date);
CREATE INDEX idx_ranking_account ON ranking_snapshots(game_account_id, snapshot_date);
```

### 5.4 API 엔드포인트 설계

```
# 게임 ID 검색 및 랭크 조회
GET  /api/game/{gameType}/search?id={gameId}
     → 게임 API 호출 → 랭크 정보 반환

# 조직 검색 (자동완성)
GET  /api/org/search?q={query}&type={school|company}
     → 조직 목록 반환

# 랭킹 등록 (게임 계정 + 조직 연결)
POST /api/ranking/register
     Body: { gameType, gameId, organizationId }
     → 게임 계정 생성/업데이트 + 조직 매핑

# 개인 랭킹 조회
GET  /api/ranking/{gameAccountId}/org/{organizationId}
     → 조직 내 순위, 백분율, 총 인원

# 조직 리더보드
GET  /api/ranking/leaderboard/{organizationId}?game={gameType}&page={page}
     → 조직 내 전체 순위 목록

# 공유 이미지 생성
GET  /api/og?accountId={id}&orgId={id}
     → @vercel/og로 동적 이미지 생성 (1200x630)

# 공유 이벤트 기록
POST /api/share/track
     Body: { gameAccountId, organizationId, channel }

# 공유 링크 클릭 추적
GET  /api/share/{shareId}/redirect
     → clicked_count 증가 → 실제 페이지로 리다이렉트
```

### 5.5 캐싱 전략

| 데이터 | TTL | 저장소 | 이유 |
|--------|-----|--------|------|
| 게임 랭크 데이터 | 1시간 | Redis | API Rate Limit 보호, 랭크는 자주 변하지 않음 |
| 조직 내 랭킹 | 5분 | Redis | 새 등록자 반영, 빠른 업데이트 |
| 학교 목록 | 24시간 | Redis + CDN | 거의 변하지 않는 데이터 |
| OG 이미지 | 30분 | Vercel Edge Cache | 순위 변동 반영 vs 생성 비용 |
| API 응답 전체 | ISR 60초 | Next.js ISR | SEO 페이지 재생성 |

### 5.6 Rate Limit 대응

```
Riot API:
  - Production Key: ~100 req/2min (메서드별)
  - 전략: 요청 큐잉 + 캐시 우선 조회 + 지수 백오프
  - 배치 처리: 조직 랭킹 갱신은 백그라운드 크론

PUBG API:
  - 10 req/min
  - 전략: 적극적 캐싱 (최소 1시간 TTL)

OW2 (비공식):
  - Rate Limit 불명확
  - 전략: 보수적 캐싱 (2시간 TTL) + 요청 제한
```

### 5.7 이미지 생성 (공유 카드)

```typescript
// /api/og/route.tsx - @vercel/og 기반
import { ImageResponse } from '@vercel/og';

export async function GET(request: Request) {
  // 쿼리 파라미터에서 데이터 추출
  // React 컴포넌트로 카드 렌더링
  // ImageResponse로 PNG 반환
  
  return new ImageResponse(
    <RankingCard 
      gameType={gameType}
      nickname={nickname}
      tier={tier}
      orgName={orgName}
      rank={rank}
      total={total}
    />,
    { width: 1200, height: 630 }
  );
}
```

**Instagram Stories용 (1080x1920)**:
- 별도 엔드포인트: `/api/og/story`
- 또는 클라이언트 사이드 html2canvas로 생성 후 다운로드

---

## 6. 네트워크 이펙트 (Network Effects)

### 6.1 부트스트래핑 전략

| 단계 | 목표 | 전략 |
|------|------|------|
| **시드 (0-100명)** | 개발팀 + 게임 동아리 | 직접 등록, 피드백 수집 |
| **초기 (100-1000명)** | 대학교 5-10곳 집중 | 에브리타임 홍보, 게임 동아리 컨택 |
| **확산 (1000-10000명)** | 바이럴 루프 작동 | 공유 카드 최적화, 학교 대항전 시작 |
| **성장 (10000+)** | 자체 성장 | 고등학교 확산, 직장 카테고리 추가 |

### 6.2 임계점 (Critical Mass) 정의

- **학교 단위**: 최소 5명 → 랭킹 의미 있음 표시
- **학교 단위**: 10명 이상 → "활성 학교" 배지
- **학교 단위**: 30명 이상 → 학교 간 대항전 자격
- **지역 단위**: 학교 3곳 이상 → 지역 랭킹 활성화

### 6.3 교차 게임 네트워크 효과

```
유저 A: Valorant로 가입 → 학교 랭킹 확인 → 공유
    → 유저 B: "나도 해볼까" → LoL로 가입
    → 유저 C: 같은 학교 → PUBG로 가입
    → 학교 페이지에 3개 게임 리더보드 형성
    → "우리 학교 게이머 허브" 효과
```

### 6.4 리텐션 메커니즘

| 메커니즘 | 시점 | 설명 |
|----------|------|------|
| **순위 변동 알림** | P1 | "OO님이 당신을 제쳤습니다" |
| **주간 리포트** | P1 | 이번 주 순위 변동 요약 (이메일/카톡) |
| **시즌 리셋** | 게임 시즌마다 | 새 시즌 시작 시 랭킹 재집계 → 재방문 |
| **신규 멤버 알림** | MVP | "XX학교에 새 멤버가 등록했습니다" |

### 6.5 경쟁 다이내믹스

- **개인 경쟁**: 학교 내 1등 탈환 욕구
- **집단 경쟁**: 학교 평균 티어 경쟁 (우리 학교가 더 잘함)
- **자존심 효과**: 공유 카드를 본 친구가 자기도 등록 (무시할 수 없음)
- **골든 타임**: 시험 기간 종료 후, 방학 시작 시 게임 활동 증가 → 마케팅 집중

---

## 7. 분석가 리뷰 (Analyst Review)

### 7.1 미싱 질문 (Missing Questions)

1. **Valorant Production Key 승인 기간은?** - Riot Games Production Key 심사에 수 주~수 개월 소요 가능. MVP 일정에 직접적 영향. Development Key로는 Valorant API 접근 자체가 불가하므로 이것이 런칭 블로커가 될 수 있음.

2. **유저 인증 없이 악용 방지는 어떻게?** - 로그인 없는 구조에서 타인의 게임 ID를 도용하여 가짜 학교에 등록하는 것을 어떻게 방지할 것인가. 게임 API로 계정 소유권을 검증할 수 없으면 랭킹 신뢰도 문제 발생.

3. **Overwatch 2 프로필 비공개 기본값 문제는?** - OW2는 프로필이 기본 비공개. 유저에게 공개 전환을 안내해야 하는데, 이 마찰이 전환율에 심각한 영향을 줄 수 있음. OW2를 MVP에서 제외할 것인지 결정 필요.

4. **한 사람이 여러 학교/직장에 등록 가능한가?** - 졸업생이 모교와 직장 모두 등록, 또는 재학생이 학원/동아리도 등록하는 경우. 1인 다중 소속 허용 범위 정의 필요.

5. **게임 티어 아이콘 저작권 문제는?** - Riot, Krafton, Blizzard의 게임 내 티어 아이콘을 사용할 수 있는지 라이선스 확인 필요. 무단 사용 시 DMCA 위험.

6. **데이터 갱신 주기와 비용은?** - 10만 유저 기준으로 1시간마다 모든 계정의 랭크를 갱신하면 API 호출 수가 Rate Limit을 초과. 수동 새로고침 vs 자동 갱신 정책 결정 필요.

7. **개인정보보호법 (PIPA) 준수는?** - 학교/직장 + 게임 ID 조합은 개인 식별 가능 정보. 한국 개인정보보호법상 수집/이용 동의가 필요할 수 있음.

### 7.2 미정의 가드레일 (Undefined Guardrails)

1. **조직당 최소 인원** - 1명만 있는 학교의 랭킹은 의미 없음. 제안: 3명 미만이면 "랭킹 집계 중 (N명 더 필요)" 표시.

2. **게임 ID 검증 실패 시 동작** - 존재하지 않는 ID, API 타임아웃, 비공개 프로필 등 각 실패 케이스별 UX 정의 필요. 제안: 에러 유형별 구체적 안내 메시지.

3. **랭킹 스코어 동점 처리** - 같은 티어/점수인 경우 순위 결정 기준. 제안: 동점 시 먼저 등록한 유저가 상위 or 승률 기준.

4. **부적절한 조직명 필터링** - 자유 텍스트 입력 시 욕설, 허위 학교명 등. 제안: 학교는 NEIS DB 기반 선택만 허용, 직장은 신고 기능 + 비속어 필터.

5. **API 장애 시 폴백** - 게임 API 다운 시 사이트 전체가 먹통이 되면 안 됨. 제안: 캐시된 마지막 데이터 표시 + "마지막 업데이트: N시간 전" 안내.

6. **공유 카드 내 개인정보 범위** - 카드에 게임 닉네임, 학교명, 순위가 모두 노출. 원치 않는 정보 노출 방지 옵션 필요 여부.

### 7.3 스코프 리스크 (Scope Risks)

1. **Overwatch 2 지원 범위** - 비공식 API 의존, 프로필 비공개 기본값 문제. 위험: 개발 공수 대비 사용 가능한 유저 비율이 매우 낮을 수 있음. 방지: MVP에서 OW2를 "베타" 라벨로 분리하거나 P1으로 연기.

2. **학교 데이터 정확성** - 학교 이름 중복 (예: "서울고등학교"가 여러 지역에 존재), 폐교, 신설 학교. 방지: NEIS 학교코드 기반 고유 식별, 정기 데이터 갱신.

3. **직장 카테고리 정규화** - "삼성전자" vs "삼성전자 반도체" vs "Samsung Electronics" 동일 처리 문제. 방지: MVP에서는 직장을 P1으로 연기하고 학교에 집중. 또는 사업자등록번호 기반 정규화.

4. **게임별 시즌 리셋 대응** - 각 게임의 시즌 리셋 시점이 다르고, 리셋 중에는 랭크 데이터가 없을 수 있음. 방지: 시즌 전환기 감지 로직 + "시즌 리셋 중" 상태 처리.

5. **다국어/글로벌 확장 유혹** - 한국 시장에 집중해야 하는데 "일본도 추가하자" 등의 스코프 크립. 방지: MVP는 한국어 전용, URL/DB 구조만 i18n 대비.

### 7.4 검증되지 않은 가정 (Unvalidated Assumptions)

1. **"한국 게이머는 학교 단위 경쟁에 관심이 있다"** - 검증: MVP 전 간단한 설문 (에브리타임/디스코드) 또는 랜딩 페이지 + 이메일 수집으로 관심도 측정.

2. **"Riot Production Key를 적시에 받을 수 있다"** - 검증: 즉시 Riot Developer Portal에서 신청. 승인 전까지는 Henrik의 비공식 Valorant API (https://github.com/Henrik-3/unofficial-valorant-api)를 대안으로 사용 가능 여부 확인.

3. **"유저가 자발적으로 학교를 정확하게 입력할 것이다"** - 검증: 프로토타입 테스트에서 입력 정확도 측정. 자유 텍스트 vs 드롭다운 선택의 정확도 비교.

4. **"공유 카드 디자인이 바이럴을 만든다"** - 검증: A/B 테스트로 카드 디자인 2-3종 비교. 공유 전환율(랭킹 확인 → 공유 버튼 클릭) 측정.

5. **"OW2 비공식 API가 안정적이다"** - 검증: 1주간 ow-api.com / OverFast API 가용성 모니터링. 응답 시간, 에러율 측정.

6. **"Supabase 무료 티어가 MVP 트래픽을 감당한다"** - 검증: 예상 트래픽 (동시 접속 100-500명, 일일 API 호출 10만 건) 기준 Supabase 무료 티어 한도 확인.

### 7.5 누락된 수용 기준 (Missing Acceptance Criteria)

1. **게임 ID 검색 → 결과 표시 시간** - 기준: 캐시 히트 시 500ms 이내, 캐시 미스 시 3초 이내 (로딩 인디케이터 포함).

2. **공유 카드 생성 시간** - 기준: OG 이미지 생성 2초 이내. 유저가 "공유" 버튼 클릭 후 3초 이내에 공유 가능 상태.

3. **동시 접속자 처리** - 기준: 최소 500명 동시 접속 시 응답 시간 2초 이내 유지.

4. **공유 링크 클릭 → 랭킹 페이지 로드** - 기준: First Contentful Paint 1.5초 이내 (모바일 4G 환경).

5. **학교 자동완성 반응 속도** - 기준: 2글자 입력 후 300ms 이내 추천 목록 표시.

6. **API 장애 시 서비스 유지** - 기준: 게임 API 1개 다운되어도 나머지 게임은 정상 작동. 캐시 데이터로 24시간 서비스 유지 가능.

7. **공유 카드 이미지 품질** - 기준: Instagram Stories 업로드 시 텍스트 깨짐 없음 (1080x1920 해상도, 72dpi 이상).

8. **바이럴 퍼널 측정** - 기준: 랭킹 확인 → 공유 버튼 표시 → 공유 실행 → 링크 클릭 → 신규 등록. 각 단계별 전환율 측정 가능.

### 7.6 엣지 케이스 (Edge Cases)

1. **같은 게임 ID, 다른 서버** - Riot Games는 서버 이전 기능이 있어 과거 한국 서버 유저가 아시아 서버로 이전된 경우. 처리: 한국 서버(kr) 고정, 검색 실패 시 "한국 서버 계정만 지원" 안내.

2. **언랭크(Unranked) 유저** - 배치 게임을 완료하지 않아 랭크가 없는 경우. 처리: "아직 랭크 배치 전입니다" 표시, 랭킹에서 제외.

3. **게임 닉네임 변경** - 유저가 닉네임을 변경하면 기존 등록이 깨짐. 처리: PUUID (Riot) / 내부 ID 기반 추적. 닉네임 변경 시 자동 반영.

4. **학교 동명이교** - "한국고등학교"가 서울, 부산에 모두 있는 경우. 처리: 학교 선택 시 지역 함께 표시 (e.g., "한국고등학교 (서울 강남구)").

5. **졸업 후 학교 랭킹** - 졸업생이 계속 학교 랭킹에 포함되면 현재 재학생과 공정하지 않음. 처리: MVP에서는 구분하지 않되, P1에서 "재학생/졸업생" 필터 추가 고려.

6. **게임 서비스 종료** - 지원 게임 중 하나가 한국 서비스를 종료하는 경우. 처리: 게임별 독립 모듈로 설계, 비활성화 가능한 구조.

7. **대량 가입 공격** - 봇이 가짜 계정으로 특정 학교 랭킹을 조작하는 경우. 처리: IP 기반 Rate Limit + 게임 API로 실제 계정 존재 여부 검증.

8. **시즌 전환기 데이터 공백** - 게임 시즌이 끝나고 새 시즌 시작 전 랭크 데이터가 리셋되는 기간. 처리: 이전 시즌 데이터 보존, "새 시즌 배치 대기 중" 상태 표시.

9. **게임별 복수 큐 랭크** - LoL: 솔로/듀오, 자유랭크 / Valorant: 경쟁전, 프리미어 / OW2: 역할별 (탱커, 딜러, 힐러). 처리: MVP에서는 가장 대표적인 큐 1개만 사용 (LoL: 솔로/듀오, Valorant: 경쟁전, OW2: 최고 역할 랭크).

10. **공유 카드 스크린샷 vs 원본** - 유저가 공유 카드를 스크린샷으로 저장 후 공유하면 추적 불가. 처리: 카드에 QR코드 또는 짧은 URL 포함하여 스크린샷 공유도 유입 가능하도록.

### 7.7 권고사항 (Recommendations)

**플래닝 전 반드시 해결:**
1. **[블로커] Riot Games Production Key 신청 즉시 진행** - Valorant API는 Development Key로 접근 불가. 승인까지 Henrik 비공식 API를 대안으로 검토.
2. **[블로커] OW2 MVP 포함 여부 결정** - 비공식 API 안정성 + 프로필 비공개 문제. 공수 대비 가치 판단 필요.
3. **[중요] 계정 소유 검증 방식 결정** - 로그인 없이 어떻게 악용을 방지할 것인지. 최소한 게임 API로 계정 존재 여부 확인은 필수.
4. **[중요] 학교 데이터 소스 확정** - NEIS API 사용 가능 여부 확인. 불가 시 공공데이터포털 학교 데이터셋 확보.
5. **[중요] 개인정보 수집 동의 절차 설계** - 게임 ID + 학교/직장 조합의 개인정보보호법 적용 범위 법률 검토.

**MVP 스코프 확정 필요:**
6. **[결정] 직장 카테고리를 MVP에 포함할 것인가?** - 정규화 문제로 학교 먼저 집중 권장. 직장은 P1.
7. **[결정] 게임별 어떤 큐/모드를 기준으로 할 것인가?** - 복수 큐 중 대표 1개 선정 필요.
8. **[결정] 지역 랭킹을 MVP에 포함할 것인가?** - 학교 주소 기반 자동 매핑은 가능하나, 데이터 밀도가 낮으면 의미 없음.

### Open Questions

- [ ] Riot Games Production Key 승인에 얼마나 걸리는가? 비공식 API(Henrik)를 대안으로 사용 가능한가? -- MVP 런칭 일정의 블로커. Valorant가 핵심 타겟 게임이므로 API 접근 없이는 런칭 불가.
- [ ] Overwatch 2를 MVP에 포함할 것인가, P1으로 연기할 것인가? -- 비공식 API 의존 + 프로필 비공개 기본값으로 인한 마찰이 크므로 공수 대비 가치 판단 필요.
- [ ] 계정 소유 검증 없이 런칭해도 되는가? 최소한의 악용 방지 방법은? -- 타인 ID 도용으로 랭킹 조작 시 서비스 신뢰도 훼손. Riot RSO(Riot Sign On) OAuth 연동 가능 여부 확인 필요.
- [ ] 한국 개인정보보호법상 게임 ID + 학교 조합 수집에 명시적 동의가 필요한가? -- 법률 위반 시 서비스 운영 자체가 불가. 초기부터 컴플라이언스 확보 필요.
- [ ] 직장 카테고리를 MVP에 포함할 것인가? -- 학교 대비 정규화 난이도가 훨씬 높음. "삼성전자" 하나만 해도 사업부별 분리/통합 문제 존재.
- [ ] 게임별 대표 큐는 무엇으로 확정하는가? (LoL 솔랭, Valorant 경쟁전, PUBG 스쿼드, OW2 최고역할?) -- 랭킹 정규화 및 비교의 기준이 되므로 확정 필수.
- [ ] 졸업생/퇴사자의 랭킹 처리 정책은? -- 시간이 지나면 현재 재학생보다 졸업생이 많아져 랭킹 의미 왜곡 가능.
- [ ] Supabase 무료 티어로 예상 트래픽(일 10만 API 호출)을 감당할 수 있는가? 유료 전환 시점은? -- 초기 비용 계획에 직접 영향.
- [ ] 도메인은 무엇으로 할 것인가? (ranking-dorgg.kr, rankingdorgg.com 등) -- KakaoTalk/Discord 공유 시 URL이 브랜딩 요소. 초기 확정 필요.

---

## 부록: API 레퍼런스 링크

- Riot Developer Portal: https://developer.riotgames.com/apis
- Riot Valorant API 문서: https://developer.riotgames.com/docs/valorant
- Riot LoL league-v4: https://developer.riotgames.com/apis#league-v4
- PUBG API 문서: https://documentation.pubg.com/en/getting-started.html
- OverFast API (OW2 비공식): https://overfast-api.tekrop.fr/
- Henrik Valorant API (비공식 대안): https://github.com/Henrik-3/unofficial-valorant-api
- Kakao Share SDK (JavaScript): https://developers.kakao.com/docs/latest/en/kakaotalk-share/js-link
- 네이버 서치어드바이저: https://searchadvisor.naver.com/
- @vercel/og 문서: https://vercel.com/docs/functions/og-image-generation
