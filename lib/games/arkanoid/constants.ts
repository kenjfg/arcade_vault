// Tuning for the Arkanoid port (references/started-games/04-arkanoid/game.js).

// Logical canvas size; the canvas is scaled by CSS to fill .crt-screen (4:3).
// The whole canvas is the playfield: walls on the left, right and top.
export const W = 800;
export const H = 600;

// Paddle: centered when the engine is created, moved by ←/→ or the mouse.
export const PADDLE = { w: 81, h: 14, y: 560, speed: 400 } as const; // speed in px/s

// Ball (AABB). It leaves the paddle with BALL_VX/BALL_VY × the level speed.
export const BALL_SIZE = 16;
export const BALL_VX = 200;
export const BALL_VY = -300;

// The ball's bottom may sink this far past the paddle's bottom and still bounce.
export const PADDLE_BOUNCE_TOLERANCE = 8;

// Block grid: 10×6 blocks of 64×24, centered horizontally.
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;

export const BLOCK_POINTS = 10;
export const START_LIVES = 3;

// Times in ms. The scene stays frozen GAME_OVER_DELAY before onGameOver.
export const EXPLOSION_DURATION = 150;
export const GAME_OVER_DELAY = 1000;
export const MAX_DT = 50;

// Block colors as named in levels.js.
export type BlockColor =
  | "gray"
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green";

// Hex copies of the :root tokens in app/globals.css (canvas can't read CSS vars),
// plus three extra neon tones for the colors :root lacks.
export const BLOCK_COLORS: Record<BlockColor, string> = {
  cyan: "#00f5ff", // --cyan
  yellow: "#f5ff00", // --yellow
  magenta: "#ff006e", // --magenta
  green: "#00ff88", // --green
  red: "#ff3131", // rojo neón
  hotpink: "#ff4fd8", // rosa neón
  gray: "#8a90b8", // gris azulado
};

export const COLORS = {
  background: "#000",
  paddle: "#00f5ff", // --cyan
  ball: "#f5ff00", // --yellow
} as const;

// shadowBlur for the neon glow, in logical pixels.
export const GLOW = {
  block: 6,
  paddle: 12,
  ball: 10,
  explosion: 12,
} as const;
