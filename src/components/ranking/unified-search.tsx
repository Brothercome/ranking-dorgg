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

type SuggestionItem =
  | { type: "school"; data: SchoolResult }
  | { type: "game"; data: GameResult }
  | { type: "hint"; text: string };

export function UnifiedSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const [query, setQuery] = useState("");
  const [gameType, setGameType] = useState<GameType>("lol");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const search = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      const items: SuggestionItem[] = [];

      // Check if it looks like a game ID (contains #)
      const hasHash = q.includes("#");
      const isKorean = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(q) && !hasHash;

      // Search schools - start from 1 char for Korean (chosung matching)
      if (isKorean || (!hasHash && q.length >= 2)) {
        try {
          const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            data.data.slice(0, 10).forEach((school: SchoolResult) => {
              items.push({ type: "school", data: school });
            });
          }
        } catch {
          // silent
        }
      }

      // Search game ID if it contains # - try both games in parallel
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
              items.unshift({ type: "game", data: lolRes.value.data });
            }
            if (valRes.status === "fulfilled" && valRes.value.success) {
              items.unshift({ type: "game", data: valRes.value.data });
            }
          } catch {
            // silent
          }
        } else {
          items.push({ type: "hint", text: `"${gameName}#태그" 형식으로 입력하세요` });
        }
      }

      // If no results and not a game ID format
      if (items.length === 0 && !hasHash && q.length >= 2) {
        items.push({ type: "hint", text: `게임 ID는 "닉네임#태그" 형식으로 입력하세요` });
      }

      setSuggestions(items);
      setShowDropdown(items.length > 0);
      setIsLoading(false);
    },
    [gameType]
  );

  const handleInput = (value: string) => {
    setQuery(value);
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  };

  const selectGame = (game: GameResult) => {
    setSelectedGame(game);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    // Focus back on input for school search
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectSchool = (school: SchoolResult) => {
    setSelectedSchool(school);
    setShowDropdown(false);

    // If game already selected, auto submit
    if (selectedGame) {
      submitRanking(selectedGame, school);
    } else {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const submitRanking = async (game: GameResult, school: SchoolResult) => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/rank/${school.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameAccountId: game.gameAccountId,
          gameType: game.gameType,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "랭킹 계산에 실패했습니다");
        setIsSubmitting(false);
        return;
      }

      router.push(`/rank/${game.gameAccountId}?org=${school.id}&game=${game.gameType}`);
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (selectedGame && selectedSchool) {
      submitRanking(selectedGame, selectedSchool);
    } else if (!selectedGame) {
      setError("게임 아이디를 먼저 검색하세요 (닉네임#태그)");
    } else {
      setError("학교를 선택하세요");
    }
  };

  const clearSelection = (type: "game" | "school") => {
    if (type === "game") setSelectedGame(null);
    if (type === "school") setSelectedSchool(null);
  };

  const placeholder = !selectedGame
    ? "게임 아이디 검색 (예: Hide on bush#KR1)"
    : "학교 검색 (예: 서울고)";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Game type is auto-detected from search results */}

      {/* Selected chips */}
      {(selectedGame || selectedSchool) && (
        <div className="flex gap-2 mb-3 justify-center flex-wrap">
          {selectedGame && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-sm">
              <span className="text-green-400">🎮</span>
              <span>{selectedGame.gameName}#{selectedGame.tagLine}</span>
              <span className="text-xs text-muted-foreground">
                {selectedGame.tier} {selectedGame.rank}
              </span>
              <button
                onClick={() => clearSelection("game")}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </span>
          )}
          {selectedSchool && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm">
              <span className="text-blue-400">🏫</span>
              <span>{selectedSchool.name}</span>
              <button
                onClick={() => clearSelection("school")}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Search Box */}
      <div className="relative">
        <div className="flex items-center bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-lg gap-3">
          <span className="text-muted-foreground">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (suggestions.length > 0 && suggestions[0].type !== "hint") {
                  const first = suggestions[0];
                  if (first.type === "game") selectGame(first.data);
                  else if (first.type === "school") selectSchool(first.data);
                } else {
                  handleSubmit();
                }
              }
            }}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground/60"
            autoFocus
          />
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">검색중...</span>
          )}
          {selectedGame && selectedSchool && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? "확인 중..." : "랭킹 확인"}
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-card/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {suggestions.map((item, i) => {
              if (item.type === "hint") {
                return (
                  <div key={i} className="px-5 py-3 text-sm text-muted-foreground">
                    💡 {item.text}
                  </div>
                );
              }

              if (item.type === "game") {
                const g = item.data;
                return (
                  <button
                    key={`game-${g.gameAccountId}`}
                    onClick={() => selectGame(g)}
                    className="w-full text-left px-5 py-3.5 hover:bg-white/[0.05] transition-colors border-b border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-base">🎮</span>
                        <div>
                          <span className="text-sm font-medium">
                            {g.gameName}#{g.tagLine}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {GAME_LABELS[g.gameType]}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {g.tier} {g.rank} · {g.points}
                        {g.gameType === "lol" ? "LP" : "RR"}
                      </span>
                    </div>
                  </button>
                );
              }

              if (item.type === "school") {
                const s = item.data;
                return (
                  <button
                    key={`school-${s.id}`}
                    onClick={() => selectSchool(s)}
                    className="w-full text-left px-5 py-3.5 hover:bg-white/[0.05] transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-base">🏫</span>
                        <div>
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {s.region}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {s.memberCount}명
                      </span>
                    </div>
                  </button>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-destructive mt-3">{error}</p>
      )}

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground/60 mt-4">
        {!selectedGame
          ? "닉네임#태그로 게임 아이디를 검색하거나, 학교 이름을 입력하세요"
          : "학교 이름을 입력하면 우리 학교 랭킹을 확인할 수 있어요"}
      </p>
    </div>
  );
}
