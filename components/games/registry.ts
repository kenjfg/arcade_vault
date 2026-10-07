import type { ComponentType, Ref } from "react";
import { ArkanoidCanvas } from "@/components/games/arkanoid-canvas";
import { AsteroidsCanvas } from "@/components/games/asteroids-canvas";
import { SnakeCanvas } from "@/components/games/snake-canvas";
import { TetrisCanvas } from "@/components/games/tetris-canvas";

// What the player page needs from any real game.
export interface GameStats {
  score: number;
  lives: number | null; // null: the game has no lives and the HUD hides VIDAS
  level: number;
}

// Commands the player page sends from its FIN and JUGAR DE NUEVO buttons.
export interface GameCanvasHandle {
  end(): void;
  restart(): void;
}

export interface GameCanvasProps {
  ref?: Ref<GameCanvasHandle>;
  paused: boolean;
  over: boolean;
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void; // P / Esc
  onAutoPause: () => void; // tab hidden or window blurred
}

export interface GameRegistryEntry {
  Component: ComponentType<GameCanvasProps>;
  initialStats: GameStats;
}

// Real games by `games.code`. A game is only mounted when it is listed here
// and its row is `playable`; anything else falls back to the simulation.
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroids: {
    Component: AsteroidsCanvas,
    initialStats: { score: 0, lives: 3, level: 1 },
  },
  arkanoid: {
    Component: ArkanoidCanvas,
    initialStats: { score: 0, lives: 3, level: 1 },
  },
  snake: {
    Component: SnakeCanvas,
    initialStats: { score: 0, lives: null, level: 1 },
  },
  tetris: {
    Component: TetrisCanvas,
    initialStats: { score: 0, lives: null, level: 1 },
  },
};

export function getGameEntry(code: string): GameRegistryEntry | undefined {
  return Object.hasOwn(GAME_REGISTRY, code) ? GAME_REGISTRY[code] : undefined;
}
