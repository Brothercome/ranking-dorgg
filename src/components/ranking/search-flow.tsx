"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchStore } from "@/stores/search-store";
import type { GameType } from "@/types/game";
import { GAME_LABELS } from "@/types/game";

interface SearchFlowProps {
  initialGame: GameType | null;
}

export function SearchFlow({ initialGame }: SearchFlowProps) {
  const router = useRouter();
  const {
    step, gameType, gameProfile, isSearching, isRanking,
    selectGame, setGameProfile, setStep, setIsSearching, setIsRanking,
    setRankingResult, reset,
  } = useSearchStore();

  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schools, setSchools] = useState<Array<{ id: string; name: string; level: string; region: string; memberCount: number }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialGame && !gameType) {
      selectGame(initialGame);
      setStep("id-input");
    }
  }, [initialGame, gameType, selectGame, setStep]);

  const handleSearch = async () => {
    if (!gameName || !tagLine || !gameType) return;
    setError("");
    setIsSearching(true);

    try {
      const res = await fetch(`/api/search/${gameType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameName, tagLine }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "검색 실패");
        return;
      }

      setGameProfile(data.data);
      setStep("school-select");
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSchoolSearch = async (query: string) => {
    setSchoolQuery(query);
    if (query.length < 2) {
      setSchools([]);
      return;
    }

    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSchools(data.data);
      }
    } catch {
      // silent fail
    }
  };

  const handleSchoolSelect = async (school: { id: string; name: string }) => {
    if (!gameProfile || !gameType) return;
    setIsRanking(true);
    setError("");

    try {
      const res = await fetch(`/api/rank/${school.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameAccountId: gameProfile.gameAccountId,
          gameType,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "랭킹 계산 실패");
        return;
      }

      setRankingResult(data.data);
      router.push(`/rank/${gameProfile.gameAccountId}?org=${school.id}&game=${gameType}`);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsRanking(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <button onClick={reset} className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          랭킹도르그
        </button>
        {gameType && (
          <p className="text-muted-foreground mt-2">
            {GAME_LABELS[gameType]}
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["게임 ID", "학교 선택", "결과"].map((label, i) => {
          const stepIdx = i === 0 ? "id-input" : i === 1 ? "school-select" : "result";
          const isActive = step === stepIdx || (i === 0 && step === "game-select");
          const isPast = (step === "school-select" && i === 0) || (step === "result" && i <= 1);
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {isPast ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* Step: ID Input */}
      {step === "id-input" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-center">게임 아이디를 입력하세요</h2>
            <p className="text-sm text-muted-foreground text-center">
              Riot ID 형식: 닉네임#태그
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="닉네임"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("tag-input")?.focus()}
              />
              <span className="flex items-center text-muted-foreground font-bold">#</span>
              <Input
                id="tag-input"
                placeholder="태그"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="w-28"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!gameName || !tagLine || isSearching}
              className="w-full"
              size="lg"
            >
              {isSearching ? "검색 중..." : "검색"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: School Select */}
      {step === "school-select" && gameProfile && (
        <div className="space-y-4">
          {/* Player card */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{gameProfile.gameName}#{gameProfile.tagLine}</div>
                  <div className="text-sm text-muted-foreground">
                    {gameProfile.tier} {gameProfile.rank} · {gameProfile.points}{gameType === "valorant" ? "RR" : "LP"}
                  </div>
                </div>
                <button onClick={() => { setStep("id-input"); setGameProfile(null); }} className="text-sm text-muted-foreground hover:text-foreground">
                  변경
                </button>
              </div>
            </CardContent>
          </Card>

          {/* School search */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-center">학교를 선택하세요</h2>
              <Input
                placeholder="학교 이름으로 검색 (예: 서울고)"
                value={schoolQuery}
                onChange={(e) => handleSchoolSearch(e.target.value)}
                autoFocus
              />
              {schools.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => handleSchoolSelect(school)}
                      disabled={isRanking}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{school.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {school.region} · {school.memberCount}명 참여 중
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {schoolQuery.length >= 2 && schools.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  검색 결과가 없습니다
                </p>
              )}
              {isRanking && (
                <p className="text-sm text-center text-muted-foreground animate-pulse">
                  랭킹 계산 중...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
