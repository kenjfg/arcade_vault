// Tuning for Snake (designed from scratch in SPEC 09).

// Logical canvas size; the canvas is scaled by CSS to fill .crt-screen (4:3).
// The whole canvas is the board: 20×15 cells of 40, no side panels.
export const W = 800;
export const H = 600;
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;

export type Direction = "up" | "down" | "left" | "right";

// Initial snake: 3 cells on row 7, head on column 10, facing right.
export const START_HEAD = { col: 10, row: 7 } as const;
export const START_LENGTH = 3;
export const START_DIRECTION: Direction = "right";

// Pending turns kept between ticks; one is consumed per tick.
export const TURN_QUEUE_SIZE = 2;

// Tick length in ms: 150 at level 1, −10 per level, never below 60.
export const TICK_BASE = 150;
export const TICK_STEP = 10;
export const TICK_MIN = 60;
export const tickDuration = (level: number) =>
  Math.max(TICK_MIN, TICK_BASE - (level - 1) * TICK_STEP);

// A fruit is worth FRUIT_POINTS × the level it was eaten at;
// the level goes up every FRUITS_PER_LEVEL fruits.
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;

// Times in ms. The scene stays frozen GAME_OVER_DELAY before onGameOver.
export const GAME_OVER_DELAY = 1000;
export const MAX_DT = 50;

// Fruit sprites: the pixel-art row of fruits.png (served from public/).
// Crops copied from references/source-assets/snake-assets/sprites.js in the
// same order, without its names (they don't match the image).
export const FRUIT_SHEET_SRC = "/games/snake/fruits.png";
export const FRUIT_SCALE = 1 / 5; // 160 px tall → 32 logical px

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRUIT_Y = 136;
const FRUIT_H = 160;
const FRUIT_CROPS: readonly [x: number, w: number][] = [
  [34, 110],
  [186, 150],
  [378, 110],
  [540, 130],
  [712, 130],
  [894, 110],
  [1066, 110],
  [1228, 130],
  [1400, 130],
  [1582, 110],
  [1734, 150],
  [1906, 150],
  [2068, 170],
  [2250, 140],
  [2432, 130],
  [2604, 130],
  [2786, 110],
  [2948, 130],
  [3110, 150],
  [3302, 110],
  [3454, 150],
  [3637, 130],
];

export const FRUIT_SPRITES: readonly SpriteRect[] = FRUIT_CROPS.map(
  ([x, w]) => ({ x, y: FRUIT_Y, w, h: FRUIT_H }),
);

// Hex copies of the :root tokens in app/globals.css (canvas can't read CSS vars).
export const COLORS = {
  background: "#000",
  grid: "rgba(0, 255, 136, 0.08)",
  border: "#00ff88", // --green
  body: "#00ff88", // --green
  head: "#00f5ff", // --cyan
  fruitFallback: "#ff006e", // --magenta, while fruits.png is not loaded
} as const;

// shadowBlur for the neon glow, in logical pixels.
export const GLOW = {
  border: 8,
  body: 6,
  head: 12,
  fruitFallback: 10,
} as const;
