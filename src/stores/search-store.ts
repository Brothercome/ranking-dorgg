import { create } from "zustand";
import type { GameType, GameProfile } from "@/types/game";
import type { RankingResult } from "@/types/ranking";

interface SearchState {
  // Step tracking
  step: "game-select" | "id-input" | "school-select" | "result";

  // Selected game
  gameType: GameType | null;

  // Search result
  gameProfile: (GameProfile & { gameAccountId: string }) | null;

  // Selected school
  selectedSchool: { id: string; name: string } | null;

  // Ranking result
  rankingResult: RankingResult | null;

  // Loading states
  isSearching: boolean;
  isRanking: boolean;

  // Actions
  setStep: (step: SearchState["step"]) => void;
  selectGame: (game: GameType) => void;
  setGameProfile: (profile: (GameProfile & { gameAccountId: string }) | null) => void;
  selectSchool: (school: { id: string; name: string } | null) => void;
  setRankingResult: (result: RankingResult | null) => void;
  setIsSearching: (v: boolean) => void;
  setIsRanking: (v: boolean) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  step: "game-select",
  gameType: null,
  gameProfile: null,
  selectedSchool: null,
  rankingResult: null,
  isSearching: false,
  isRanking: false,

  setStep: (step) => set({ step }),
  selectGame: (game) => set({ gameType: game, step: "id-input" }),
  setGameProfile: (profile) => set({ gameProfile: profile }),
  selectSchool: (school) => set({ selectedSchool: school }),
  setRankingResult: (result) => set({ rankingResult: result, step: "result" }),
  setIsSearching: (v) => set({ isSearching: v }),
  setIsRanking: (v) => set({ isRanking: v }),
  reset: () =>
    set({
      step: "game-select",
      gameType: null,
      gameProfile: null,
      selectedSchool: null,
      rankingResult: null,
      isSearching: false,
      isRanking: false,
    }),
}));
