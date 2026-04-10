"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameType } from "@/types/game";

interface SchoolResult {
  id: string;
  name: string;
  level: string;
  region: string;
  memberCount: number;
}

interface SchoolRegisterModalProps {
  open: boolean;
  onClose: () => void;
  gameAccountId: string;
  gameType: GameType;
  onRegistered: () => void;
}

export function SchoolRegisterModal({
  open,
  onClose,
  gameAccountId,
  gameType,
  onRegistered,
}: SchoolRegisterModalProps) {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSchools([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSchools([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/org/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setSchools(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  };

  const handleSelect = async (school: SchoolResult) => {
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch(`/api/rank/${school.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameAccountId, gameType }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "등록 실패");
        return;
      }
      onRegistered();
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setRegistering(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-base font-semibold">학교 등록</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5 pb-3">
          <div className="relative">
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
              placeholder="학교 이름 검색 (예: 상도중)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-white/20"
              disabled={registering}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="px-5 pb-5 max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {query.length < 2 && (
            <p className="text-xs text-muted-foreground/50 text-center py-6">
              2글자 이상 입력해주세요
            </p>
          )}

          {query.length >= 2 && !loading && schools.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center py-6">
              검색 결과가 없습니다
            </p>
          )}

          {schools.length > 0 && (
            <div className="space-y-1.5">
              {schools.map((school) => {
                const levelLabel = school.level === "high" ? "고" : school.level === "middle" ? "중" : "대";
                return (
                  <button
                    key={school.id}
                    onClick={() => handleSelect(school)}
                    disabled={registering}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-white/5 hover:border-white/20 hover:bg-white/[0.03] transition-colors disabled:opacity-50 flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-semibold text-blue-400 shrink-0">
                      {levelLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{school.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {school.region} · {school.memberCount}명
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {registering && (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground animate-pulse">등록 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
