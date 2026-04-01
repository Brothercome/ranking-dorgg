# Open Questions - Ranking Dorgg

## autopilot-impl - 2026-04-02

### Pre-resolved for MVP (decisions made)
- [x] Valorant API access: Using Henrik unofficial API as bridge until Riot Production Key approved
- [x] OW2/PUBG: Deferred to P1 (reduces API complexity and risk)
- [x] Auth: No login for MVP. Game ID search + school selection only.
- [x] Workplaces: Deferred to P1. Schools only for MVP.

### Open (needs resolution before or during execution)
- [ ] Riot Games Production Key application status -- Must apply immediately. Henrik API is the bridge but has its own rate limits and reliability concerns. Affects long-term Valorant support.
- [ ] Henrik API rate limits and reliability -- Need to verify actual rate limits and uptime. If unreliable, Valorant support may be degraded at launch.
- [ ] NEIS API key acquisition -- Need to register at open.neis.go.kr and get an API key. Free tier should suffice but need to confirm availability.
- [ ] KakaoTalk Developer app registration -- Need Kakao Developers account + app registration + JavaScript Key for Share SDK.
- [ ] Domain name decision (ranking-dorgg.kr, rankingdorgg.com, etc.) -- Needed for OG image branding, share URLs, and KakaoTalk app registration.
- [ ] Supabase project creation + credentials -- Need actual Supabase project URL, anon key, service role key, and database URL before Task 4 can be tested.
- [ ] Upstash Redis instance creation -- Need Upstash account + Redis instance in ap-northeast-2 (Seoul) region.
- [ ] Pretendard font licensing for OG images -- Pretendard is open source (SIL OFL) so should be fine, but confirm we can embed in server-generated images.
- [ ] Game tier icon assets -- Cannot use official Riot/game tier icons due to copyright. Need custom tier badge designs or find properly licensed alternatives.
- [ ] Account abuse prevention without auth -- Someone could register any game ID to any school. Minimum mitigation: verify game account exists via API. Consider IP-based rate limiting for registrations.
- [ ] Korean PIPA (개인정보보호법) compliance -- Game ID + school combination may be PII. May need privacy policy page and consent checkbox at minimum.
- [ ] Tie-breaking rule for same tierNumeric score -- Current plan: same score = same rank. Alternative: break ties by win rate or registration date.
- [ ] Minimum members threshold for ranking display -- Analyst recommends 3 minimum. Need to confirm: show "N명 더 필요" or show ranking anyway?

### From Analyst Review (requirements.md section 7)
- [ ] Valorant Production Key approval timeline -- MVP launch blocker if Henrik API becomes unavailable
- [ ] Multi-organization membership policy -- Can one game account be registered to multiple schools? (e.g., transfer students)
- [ ] Graduated students in school rankings -- No distinction in MVP, but may skew rankings over time
- [ ] Season reset handling -- When game seasons reset, ranked data may be temporarily unavailable
- [ ] Supabase free tier capacity for expected traffic (100K daily API calls) -- May need paid tier sooner than expected
