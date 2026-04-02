import type { GameType, GameApiAdapter } from "@/types/game";
import { riotApiClient } from "./riot";
import { henrikApiClient } from "./henrik";

const adapters: Record<GameType, GameApiAdapter> = {
  lol: riotApiClient,
  valorant: henrikApiClient,
};

export function getGameAdapter(gameType: GameType): GameApiAdapter {
  const adapter = adapters[gameType];
  if (!adapter) {
    throw new Error(`Unsupported game type: ${gameType}`);
  }
  return adapter;
}
