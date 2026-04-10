"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

interface SchoolResult {
  id: string;
  name: string;
  level: string;
  region: string;
  memberCount: number;
}

interface GameResult {
  gameAccountId: string;
  gameName: string;
  tagLine: string;
  tier: string;
  rank: string;
  points: number;
  gameType: GameType;
}

type SuggestionCategory = "school" | "player";

interface Suggestion {
  category: SuggestionCategory;
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

// Minimal SVG icons matching dark theme
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" />
    </svg>
  );
}

function PlayerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  school: "학교",
  player: "플레이어",
};

const CATEGORY_ICONS: Record<SuggestionCategory, () => React.ReactElement> = {
  school: SchoolIcon,
  player: PlayerIcon,
};

export function UnifiedSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    const playerItems: Suggestion[] = [];
    const schoolItems: Suggestion[] = [];
    const hasHash = q.includes("#");

    // Schools
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const schools: SchoolResult[] = data.data;

        // Schools (max 5)
        schools.slice(0, 5).forEach((s) => {
          schoolItems.push({
            category: "school",
            id: `school-${s.id}`,
            label: s.name,
            sublabel: s.region,
            href: `/school/${s.id}`,
          });
        });
      }
    } catch { /* silent */ }

    // Cached player search (when no #) - query our DB for previously searched players
    let cachedPlayerCount = 0;
    if (!hasHash) {
      try {
        const res = await fetch(`/api/search/players?q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          cachedPlayerCount = data.data.length;
          data.data.forEach((g: { gameAccountId: string; gameName: string; tagLine: string; tier: string; rank: string; gameType: GameType }) => {
            playerItems.push({
              category: "player",
              id: `player-cached-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType]} · ${g.tier}${g.rank ? ` ${g.rank}` : ""}`.trim(),
              href: `/player/${encodeURIComponent(g.gameName)}-${encodeURIComponent(g.tagLine)}`,
            });
          });
        }
      } catch { /* silent */ }
    }

    // External lookup fallback via op.gg multisearch — when no # and no cached players found
    if (!hasHash && cachedPlayerCount === 0 && q.length >= 2) {
      try {
        const res = await fetch(`/api/search/lookup?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          data.data.forEach((p: { gameName: string; tagLine: string; tier: string; level: number }, i: number) => {
            playerItems.push({
              category: "player",
              id: `player-lookup-${i}-${p.gameName}-${p.tagLine}`,
              label: `${p.gameName}#${p.tagLine}`,
              sublabel: `LoL · ${p.tier}${p.level ? ` · Lv.${p.level}` : ""}`,
              href: `/player/${encodeURIComponent(p.gameName)}-${encodeURIComponent(p.tagLine)}`,
            });
          });
        }
      } catch { /* silent */ }
    }

    // Google-style fallback: always offer "search as game ID" when no #
    if (!hasHash) {
      playerItems.push({
        category: "player",
        id: `player-search-${q}`,
        label: q,
        sublabel: "게임 아이디 검색",
        href: `/search?q=${encodeURIComponent(q)}`,
      });
    }

    // Game IDs when query contains #
    if (hasHash) {
      const parts = q.split("#");
      const gameName = parts[0].trim();
      const tagLine = parts[1]?.trim();

      if (gameName && tagLine && tagLine.length >= 1) {
        try {
          const [lolRes, valRes] = await Promise.allSettled([
            fetch("/api/search/lol", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameName, tagLine }),
            }).then((r) => r.json()),
            fetch("/api/search/valorant", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameName, tagLine }),
            }).then((r) => r.json()),
          ]);

          if (lolRes.status === "fulfilled" && lolRes.value.success) {
            const g: GameResult = lolRes.value.data;
            playerItems.push({
              category: "player",
              id: `player-lol-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType]} · ${g.tier} ${g.rank}`.trim(),
              href: `/player/${encodeURIComponent(g.gameName)}-${encodeURIComponent(g.tagLine)}`,
            });
          }
          if (valRes.status === "fulfilled" && valRes.value.success) {
            const g: GameResult = valRes.value.data;
            playerItems.push({
              category: "player",
              id: `player-val-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType]} · ${g.tier} ${g.rank}`.trim(),
              href: `/player/${encodeURIComponent(g.gameName)}-${encodeURIComponent(g.tagLine)}`,
            });
          }
        } catch { /* silent */ }
      }
    }

    const items = [...playerItems, ...schoolItems];
    setSuggestions(items);
    setShowDropdown(items.length > 0);
    setIsLoading(false);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const navigate = (suggestion: Suggestion) => {
    setShowDropdown(false);
    router.push(suggestion.href);
  };

  // Group by category
  const grouped = suggestions.reduce<{ category: SuggestionCategory; items: Suggestion[] }[]>((acc, s) => {
    const existing = acc.find((g) => g.category === s.category);
    if (existing) existing.items.push(s);
    else acc.push({ category: s.category, items: [s] });
    return acc;
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        {/* Search Input */}
        <div className="flex items-center bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 shadow-lg gap-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            placeholder="학교 · 게임 아이디 검색"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = query.trim();
                if (q) {
                  setShowDropdown(false);
                  router.push(`/search?q=${encodeURIComponent(q)}`);
                }
              }
              if (e.key === "Escape") setShowDropdown(false);
            }}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/40"
            autoFocus
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          )}
        </div>

        {/* Dropdown */}
        {(showDropdown || (isLoading && query.length >= 1)) && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1.5 bg-[#111] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          >
            {isLoading && suggestions.length === 0 && (
              <div className="py-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="animate-pulse h-4 w-4 rounded bg-white/[0.06]" />
                    <div className="animate-pulse h-4 rounded bg-white/[0.06]" style={{ width: `${120 + i * 30}px` }} />
                    <div className="animate-pulse h-3 w-14 rounded bg-white/[0.06] ml-auto" />
                  </div>
                ))}
              </div>
            )}
            {grouped.map((group, gi) => {
              const Icon = CATEGORY_ICONS[group.category];
              return (
                <div key={group.category}>
                  {gi > 0 && <div className="border-t border-white/5" />}
                  {/* Section header */}
                  <div className="px-4 pt-2.5 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                      {CATEGORY_LABELS[group.category]}
                    </span>
                  </div>
                  {/* Items */}
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                    >
                      <Icon />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-xs text-muted-foreground/40 shrink-0 ml-auto">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground/40 mt-3">
        학교 이름 또는 닉네임#태그로 검색
      </p>
    </div>
  );
}
