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

type SuggestionCategory = "school" | "player" | "region";

interface Suggestion {
  category: SuggestionCategory;
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: string;
}

const CATEGORY_HEADERS: Record<SuggestionCategory, string> = {
  school: "🏫 학교",
  player: "🎮 플레이어",
  region: "📍 지역",
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

  // Close dropdown on outside click
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
    const items: Suggestion[] = [];
    const hasHash = q.includes("#");

    // Always search schools
    let schoolResults: SchoolResult[] = [];
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        schoolResults = data.data;
      }
    } catch {
      // silent
    }

    // Add school suggestions (max 5)
    schoolResults.slice(0, 5).forEach((s) => {
      items.push({
        category: "school",
        id: `school-${s.id}`,
        label: s.name,
        sublabel: s.region,
        href: `/school/${s.id}`,
        icon: "🏫",
      });
    });

    // Search game IDs if query contains #
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
            items.push({
              category: "player",
              id: `player-lol-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType]} ${g.tier} ${g.rank}`,
              href: `/rank/${g.gameAccountId}?game=${g.gameType}`,
              icon: "🎮",
            });
          }
          if (valRes.status === "fulfilled" && valRes.value.success) {
            const g: GameResult = valRes.value.data;
            items.push({
              category: "player",
              id: `player-val-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType]} ${g.tier} ${g.rank}`,
              href: `/rank/${g.gameAccountId}?game=${g.gameType}`,
              icon: "🎮",
            });
          }
        } catch {
          // silent
        }
      }
    }

    // Extract unique regions from school results (max 3)
    const seenRegions = new Set<string>();
    schoolResults.forEach((s) => {
      if (s.region && !seenRegions.has(s.region)) {
        seenRegions.add(s.region);
      }
    });
    Array.from(seenRegions)
      .slice(0, 3)
      .forEach((region) => {
        items.push({
          category: "region",
          id: `region-${region}`,
          label: region,
          sublabel: "",
          href: "#",
          icon: "📍",
        });
      });

    setSuggestions(items);
    setShowDropdown(items.length > 0);
    setIsLoading(false);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  };

  const navigate = (suggestion: Suggestion) => {
    if (suggestion.href === "#") return;
    setShowDropdown(false);
    router.push(suggestion.href);
  };

  // Group suggestions by category, preserving order
  const grouped = suggestions.reduce<
    { category: SuggestionCategory; items: Suggestion[] }[]
  >((acc, s) => {
    const existing = acc.find((g) => g.category === s.category);
    if (existing) {
      existing.items.push(s);
    } else {
      acc.push({ category: s.category, items: [s] });
    }
    return acc;
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Box */}
      <div className="relative">
        <div className="flex items-center bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-lg gap-3">
          <span className="text-muted-foreground">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="학교 또는 게임 아이디 검색 (예: 서울고, Hide on bush#KR1)"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Navigate to first non-region result
                const first = suggestions.find((s) => s.href !== "#");
                if (first) navigate(first);
              }
            }}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60"
            autoFocus
          />
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              검색중...
            </span>
          )}
        </div>

        {/* Categorized Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-card/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {grouped.map((group) => (
              <div key={group.category}>
                {/* Section header */}
                <div className="px-5 pt-3 pb-1.5">
                  <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
                    {CATEGORY_HEADERS[group.category]}
                  </span>
                </div>
                {/* Items */}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item)}
                    className="w-full text-left px-5 py-3 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            · {item.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground/60 mt-4">
        학교 이름 또는 닉네임#태그로 검색하세요
      </p>
    </div>
  );
}
