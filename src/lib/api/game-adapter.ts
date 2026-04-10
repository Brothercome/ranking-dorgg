import type { GameType, GameApiAdapter } from "@/types/game";
import { riotApiClient } from "./riot";
import { riotValorantClient } from "./riot-valorant";

const adapters: Record<GameType, GameApiAdapter> = {
  lol: riotApiClient,
  valorant: riotValorantClient,
};

export function getGameAdapter(gameType: GameType): GameApiAdapter {
  const adapter = adapters[gameType];
  if (!adapter) {
    throw new Error(`Unsupported game type: ${gameType}`);
  }
  return adapter;
}
