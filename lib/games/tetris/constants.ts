// Tuning for the Tetris port (references/started-games/03-tetris/game.js).

// Logical canvas size; the canvas is scaled by CSS to fill .crt-screen (4:3).
export const W = 800;
export const H = 600;

// Board: 10×20 cells of 30 logical px (300×600), centered horizontally.
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = (W - COLS * BLOCK) / 2; // 250
export const BOARD_Y = 0;

// A cell holds 0 (empty) or the type (1-7) of the piece that filled it.
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Shape = number[][];

// The 7 standard pieces with the same matrices as game.js; index = type.
// The "N (tuerca)" piece of the original is not ported.
export const PIECES: readonly (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];
export const PIECE_COUNT = 7;

// Rotation wall kicks, in columns, tried in this order.
export const KICKS = [0, -1, 1, -2, 2] as const;

// Points for 0-4 lines cleared at once, multiplied by the level before the clear.
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const SOFT_DROP_POINTS = 1; // per row
export const HARD_DROP_POINTS = 2; // per row

export const LINES_PER_LEVEL = 10;
export const dropIntervalFor = (level: number) =>
  Math.max(100, 1000 - (level - 1) * 90);

// Times in ms. The stack stays frozen GAME_OVER_DELAY before onGameOver.
export const GAME_OVER_DELAY = 1000;
export const MAX_DT = 50;

export const GHOST_ALPHA = 0.2;

// Side panels in the 250 px left free on each side of the board.
export const LINES_PANEL = { x: 125, labelY: 250, valueY: 300 } as const; // centered in 0-250
export const NEXT_PANEL = {
  x: BOARD_X + COLS * BLOCK + (BOARD_X - 4 * BLOCK) / 2, // 615: 4×4 box centered in 550-800
  labelY: 180,
  boxY: 200,
  size: 4 * BLOCK, // 120
} as const;
export const FONT = "monospace";

// Hex copies of the :root tokens in app/globals.css (canvas can't read CSS vars),
// plus three extra neon tones. Index = piece type.
export const PIECE_COLORS: readonly (string | null)[] = [
  null,
  "#00f5ff", // I: cian (--cyan)
  "#f5ff00", // O: amarillo (--yellow)
  "#b026ff", // T: violeta
  "#00ff88", // S: verde (--green)
  "#ff006e", // Z: magenta (--magenta)
  "#2979ff", // J: azul
  "#ff8c00", // L: naranja
];

export const COLORS = {
  background: "#000",
  grid: "rgba(0, 245, 255, 0.08)",
  border: "#00f5ff", // --cyan
  label: "rgba(255, 255, 255, 0.6)",
  value: "#f5ff00", // --yellow
  highlight: "rgba(255, 255, 255, 0.15)",
} as const;

// shadowBlur for the neon glow, in logical pixels.
export const GLOW = {
  block: 6,
  border: 12,
  text: 8,
} as const;
