"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

interface SearchSuggestion {
  category: "school" | "player" | "region";
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  school: "학교",
  player: "플레이어",
  region: "지역",
};

function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Parse initial query from player page URL
  const getInitialQuery = useCallback(() => {
    const match = pathname.match(/^\/player\/(.+)$/);
    if (match) {
      const slug = decodeURIComponent(match[1]);
      const lastDash = slug.lastIndexOf("-");
      if (lastDash > 0) {
        return `${slug.slice(0, lastDash)}#${slug.slice(lastDash + 1)}`;
      }
    }
    return "";
  }, [pathname]);

  const [query, setQuery] = useState(getInitialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update query when navigating to a different player page
  useEffect(() => {
    setQuery(getInitialQuery());
    setShowDropdown(false);
  }, [pathname, getInitialQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
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
    const items: SearchSuggestion[] = [];
    const hasHash = q.includes("#");

    // Search schools
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        data.data.slice(0, 3).forEach((s: { id: string; name: string; region: string }) => {
          items.push({
            category: "school",
            id: `school-${s.id}`,
            label: s.name,
            sublabel: s.region,
            href: `/school/${s.id}`,
          });
        });
      }
    } catch { /* silent */ }

    // Cached player search when no #
    if (!hasHash) {
      try {
        const res = await fetch(`/api/search/players?q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          data.data.forEach((g: { gameAccountId: string; gameName: string; tagLine: string; tier: string; rank: string; gameType: GameType }) => {
            items.push({
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
            const g = lolRes.value.data;
            items.push({
              category: "player",
              id: `player-lol-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType as GameType]} · ${g.tier} ${g.rank}`.trim(),
              href: `/player/${encodeURIComponent(g.gameName)}-${encodeURIComponent(g.tagLine)}`,
            });
          }
          if (valRes.status === "fulfilled" && valRes.value.success) {
            const g = valRes.value.data;
            items.push({
              category: "player",
              id: `player-val-${g.gameAccountId}`,
              label: `${g.gameName}#${g.tagLine}`,
              sublabel: `${GAME_LABELS[g.gameType as GameType]} · ${g.tier} ${g.rank}`.trim(),
              href: `/player/${encodeURIComponent(g.gameName)}-${encodeURIComponent(g.tagLine)}`,
            });
          }
        } catch { /* silent */ }
      }
    }

    setSuggestions(items);
    setShowDropdown(items.length > 0);
    setIsLoading(false);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const navigate = (suggestion: SearchSuggestion) => {
    setShowDropdown(false);
    router.push(suggestion.href);
  };

  const submit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  // Group suggestions by category
  const grouped = suggestions.reduce<{ category: string; items: SearchSuggestion[] }[]>((acc, s) => {
    const existing = acc.find((g) => g.category === s.category);
    if (existing) existing.items.push(s);
    else acc.push({ category: s.category, items: [s] });
    return acc;
  }, []);

  return (
    <div className="flex items-center flex-1 max-w-md mx-4 relative">
      <div className="relative w-full">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setShowDropdown(false);
          }}
          placeholder="소환사 검색 (닉네임#태그)"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-white/20 transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[#111] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto"
        >
          {grouped.map((group, gi) => (
            <div key={group.category}>
              {gi > 0 && <div className="border-t border-white/5" />}
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                  {CATEGORY_LABELS[group.category] ?? group.category}
                </span>
              </div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item)}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                >
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-xs text-muted-foreground/40 shrink-0 ml-auto">{item.sublabel}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 max-w-5xl mx-auto">
        {/* Logo - Home */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="도르" width={80} height={80} />
        </Link>

        {/* Search - hidden on home (has its own search) */}
        {!isHome ? <HeaderSearch /> : <div className="flex-1" />}

        {/* Nav */}
        <nav className="flex items-center gap-6 shrink-0">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            랭킹
          </Link>
          <a
            href="https://dor.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            커뮤니티
          </a>
        </nav>
      </div>
    </header>
  );
}
