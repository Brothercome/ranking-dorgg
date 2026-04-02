"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

interface SchoolResult {
  id: string;
  name: string;
  level: string;
  region: string;
  memberCount: number;
}

interface SearchState {
  gameName: string;
  tagLine: string;
  gameType: GameType;
  schoolQuery: string;
  schools: SchoolResult[];
  selectedSchool: SchoolResult | null;
  isSearchingSchool: boolean;
  isSubmitting: boolean;
  error: string;
  showSchoolDropdown: boolean;
}

export function UnifiedSearch() {
  const router = useRouter();
  const schoolInputRef = useRef<HTMLInputElement>(null);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<SearchState>({
    gameName: "",
    tagLine: "",
    gameType: "lol",
    schoolQuery: "",
    schools: [],
    selectedSchool: null,
    isSearchingSchool: false,
    isSubmitting: false,
    error: "",
    showSchoolDropdown: false,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        schoolDropdownRef.current &&
        !schoolDropdownRef.current.contains(e.target as Node) &&
        schoolInputRef.current &&
        !schoolInputRef.current.contains(e.target as Node)
      ) {
        setState((s) => ({ ...s, showSchoolDropdown: false }));
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchSchools = useCallback(async (query: string) => {
    if (query.length < 2) {
      setState((s) => ({ ...s, schools: [], isSearchingSchool: false }));
      return;
    }

    setState((s) => ({ ...s, isSearchingSchool: true }));
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setState((s) => ({
          ...s,
          schools: data.data.slice(0, 10),
          isSearchingSchool: false,
          showSchoolDropdown: true,
        }));
      }
    } catch {
      setState((s) => ({ ...s, isSearchingSchool: false }));
    }
  }, []);

  const handleSchoolInput = (value: string) => {
    setState((s) => ({
      ...s,
      schoolQuery: value,
      selectedSchool: null,
      showSchoolDropdown: value.length >= 2,
    }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSchools(value), 300);
  };

  const selectSchool = (school: SchoolResult) => {
    setState((s) => ({
      ...s,
      selectedSchool: school,
      schoolQuery: school.name,
      showSchoolDropdown: false,
    }));
  };

  const handleSubmit = async () => {
    const { gameName, tagLine, gameType, selectedSchool } = state;

    if (!gameName || !tagLine) {
      setState((s) => ({ ...s, error: "게임 닉네임#태그를 입력해주세요" }));
      return;
    }
    if (!selectedSchool) {
      setState((s) => ({ ...s, error: "학교를 선택해주세요" }));
      return;
    }

    setState((s) => ({ ...s, isSubmitting: true, error: "" }));

    try {
      // Step 1: Search game account
      const searchRes = await fetch(`/api/search/${gameType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameName, tagLine }),
      });
      const searchData = await searchRes.json();

      if (!searchData.success) {
        setState((s) => ({
          ...s,
          isSubmitting: false,
          error: searchData.error || "플레이어를 찾을 수 없습니다",
        }));
        return;
      }

      // Step 2: Register to school and get ranking
      const rankRes = await fetch(`/api/rank/${selectedSchool.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameAccountId: searchData.data.gameAccountId,
          gameType,
        }),
      });
      const rankData = await rankRes.json();

      if (!rankData.success) {
        setState((s) => ({
          ...s,
          isSubmitting: false,
          error: rankData.error || "랭킹 계산에 실패했습니다",
        }));
        return;
      }

      // Navigate to result
      router.push(
        `/rank/${searchData.data.gameAccountId}?org=${selectedSchool.id}&game=${gameType}`
      );
    } catch {
      setState((s) => ({
        ...s,
        isSubmitting: false,
        error: "네트워크 오류가 발생했습니다",
      }));
    }
  };

  const handleGameIdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      schoolInputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Game Type Tabs */}
      <div className="flex gap-1 mb-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 w-fit mx-auto">
        {(["lol", "valorant"] as GameType[]).map((game) => (
          <button
            key={game}
            onClick={() => setState((s) => ({ ...s, gameType: game }))}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              state.gameType === game
                ? "bg-white/10 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {GAME_LABELS[game]}
          </button>
        ))}
      </div>

      {/* Search Box */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Game ID Input */}
          <div className="flex-1 flex items-center gap-1 bg-white/5 rounded-xl px-4 py-3">
            <span className="text-muted-foreground text-sm shrink-0">
              {state.gameType === "lol" ? "🎮" : "🔫"}
            </span>
            <input
              type="text"
              placeholder="닉네임"
              value={state.gameName}
              onChange={(e) =>
                setState((s) => ({ ...s, gameName: e.target.value, error: "" }))
              }
              onKeyDown={(e) => {
                if (e.key === "#") {
                  e.preventDefault();
                  document.getElementById("tag-input")?.focus();
                }
              }}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <span className="text-muted-foreground font-bold">#</span>
            <input
              id="tag-input"
              type="text"
              placeholder="태그"
              value={state.tagLine}
              onChange={(e) =>
                setState((s) => ({ ...s, tagLine: e.target.value, error: "" }))
              }
              onKeyDown={handleGameIdKeyDown}
              className="w-20 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>

          {/* School Input */}
          <div className="relative flex-1">
            <div className="flex items-center gap-1 bg-white/5 rounded-xl px-4 py-3">
              <span className="text-muted-foreground text-sm">🏫</span>
              <input
                ref={schoolInputRef}
                type="text"
                placeholder="학교 검색"
                value={state.schoolQuery}
                onChange={(e) => handleSchoolInput(e.target.value)}
                onFocus={() => {
                  if (state.schools.length > 0) {
                    setState((s) => ({ ...s, showSchoolDropdown: true }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              {state.isSearchingSchool && (
                <span className="text-xs text-muted-foreground animate-pulse">검색중</span>
              )}
              {state.selectedSchool && (
                <span className="text-xs text-green-400">✓</span>
              )}
            </div>

            {/* School Dropdown */}
            {state.showSchoolDropdown && state.schools.length > 0 && (
              <div
                ref={schoolDropdownRef}
                className="absolute top-full left-0 right-0 mt-1 bg-card/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
              >
                {state.schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => selectSchool(school)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{school.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {school.region}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {school.memberCount}명
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={state.isSubmitting}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {state.isSubmitting ? (
              <span className="animate-pulse">검색 중...</span>
            ) : (
              "랭킹 확인"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <p className="text-center text-sm text-destructive mt-3">{state.error}</p>
      )}

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Riot ID 형식으로 입력하세요 (예: Hide on bush#KR1)
      </p>
    </div>
  );
}
