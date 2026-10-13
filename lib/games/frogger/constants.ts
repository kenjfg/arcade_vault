// Tuning for Frogger (designed from scratch in SPEC 12).

// Logical canvas size; the canvas is scaled by CSS to fill .crt-screen (4:3).
// The whole canvas is the board: 20×15 cells of 40, no side panels.
export const W = 800;
export const H = 600;
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;

// Rows from 0 (top) to 14 (bottom). The vertical center of row r is r × 40 + 20.
export const ROW_BANK = 0; // top bank, decorative only
export const ROW_PADS = 1; // lily pads; the rest of the row is hedge
export const ROW_RIVER_FIRST = 2;
export const ROW_RIVER_LAST = 6;
export const ROW_MEDIAN = 7; // safe
export const ROW_ROAD_FIRST = 8;
export const ROW_ROAD_LAST = 12;
export const ROW_START = 13; // safe
export const ROW_TIMER = 14; // time bar
export const rowCenter = (row: number) => row * CELL + CELL / 2;

// The frog: a 28×28 hit box centered on its position.
export const FROG_START_X = 400;
export const FROG_SIZE = 28;
// Horizontal jumps are ignored if the center would leave [MIN_X, MAX_X].
export const FROG_MIN_X = 20;
export const FROG_MAX_X = 780;

// Cars and trucks are 28 tall, centered on their row.
export const CAR_HEIGHT = 28;

// Lily pads: a free pad is taken when the frog's center is within
// PAD_TOLERANCE of the pad's center; otherwise the frog dies.
export const PAD_CENTERS: readonly number[] = [80, 240, 400, 560, 720];
export const PAD_WIDTH = 48;
export const PAD_TOLERANCE = 16;

export type LaneKind =
  | "log-medium"
  | "log-long"
  | "log-short"
  | "turtles-2"
  | "turtles-3"
  | "truck"
  | "car-fast"
  | "car"
  | "bulldozer";

// One lane: a circular belt of identical objects with no randomness.
// direction 1 moves right, −1 moves left. speed in px/s at level 1.
export interface Lane {
  row: number;
  kind: LaneKind;
  direction: 1 | -1;
  speed: number;
  width: number;
  spacing: number;
  color: string;
}

export const LANES: readonly Lane[] = [
  // River (rows 2–6): platforms.
  {
    row: 2,
    kind: "log-medium",
    direction: 1,
    speed: 70,
    width: 160,
    spacing: 280,
    color: "#f5ff00",
  },
  {
    row: 3,
    kind: "turtles-2",
    direction: -1,
    speed: 80,
    width: 80,
    spacing: 200,
    color: "#00f5ff",
  },
  {
    row: 4,
    kind: "log-long",
    direction: 1,
    speed: 90,
    width: 240,
    spacing: 380,
    color: "#f5ff00",
  },
  {
    row: 5,
    kind: "log-short",
    direction: 1,
    speed: 50,
    width: 120,
    spacing: 260,
    color: "#f5ff00",
  },
  {
    row: 6,
    kind: "turtles-3",
    direction: -1,
    speed: 70,
    width: 120,
    spacing: 240,
    color: "#00f5ff",
  },
  // Road (rows 8–12): vehicles.
  {
    row: 8,
    kind: "truck",
    direction: -1,
    speed: 70,
    width: 80,
    spacing: 300,
    color: "#00f5ff",
  },
  {
    row: 9,
    kind: "car-fast",
    direction: 1,
    speed: 150,
    width: 40,
    spacing: 400,
    color: "#ff4fd8",
  },
  {
    row: 10,
    kind: "car",
    direction: -1,
    speed: 100,
    width: 40,
    spacing: 280,
    color: "#ff006e",
  },
  {
    row: 11,
    kind: "bulldozer",
    direction: 1,
    speed: 80,
    width: 40,
    spacing: 240,
    color: "#00f5ff",
  },
  {
    row: 12,
    kind: "car",
    direction: -1,
    speed: 60,
    width: 40,
    spacing: 200,
    color: "#f5ff00",
  },
];

// Speed multiplier: ×1 at level 1, +0.15 per level, capped at ×2.05 (level 8).
export const SPEED_STEP = 0.15;
export const SPEED_MAX = 2.05;
export const speedFactor = (level: number) =>
  Math.min(1 + SPEED_STEP * (level - 1), SPEED_MAX);

// Each frog has FROG_TIME seconds to reach a pad.
export const FROG_TIME = 30;

// Points: a jump to a row never reached by this frog, reaching a pad
// (base + per whole second left), and filling the fifth pad.
export const POINTS_NEW_ROW = 10;
export const POINTS_PAD = 50;
export const POINTS_PER_SECOND = 10;
export const POINTS_ROUND = 1000;
export const MAX_SCORE = 10_000_000;

export const START_LIVES = 3;

// Times in ms. DEATH_DELAY: death animation before the next frog.
// The scene stays frozen GAME_OVER_DELAY before onGameOver.
export const DEATH_DELAY = 1000;
export const GAME_OVER_DELAY = 1000;
export const MAX_DT = 50;

// Hex copies of the :root tokens in app/globals.css (canvas can't read CSS vars).
export const COLORS = {
  background: "#000",
  river: "#041a33",
  road: "#0d0d1a",
  laneLine: "#2a2a40",
  safe: "#15151f", // median and start sidewalk
  safeBorder: "rgba(255, 0, 110, 0.4)", // --magenta at 40 %
  bank: "rgba(0, 255, 136, 0.3)", // --green at 30 %, bank and hedge
  pad: "#ff006e", // --magenta
  frog: "#00ff88", // --green
  dead: "#ff006e", // --magenta
  timeOk: "#00ff88", // --green, more than 10 s
  timeLow: "#f5ff00", // --yellow, 5–10 s
  timeCritical: "#ff006e", // --magenta, under 5 s
  headlight: "#ffffff",
} as const;

// Time thresholds (seconds) for the time bar colors.
export const TIME_LOW = 10;
export const TIME_CRITICAL = 5;

// shadowBlur for the neon glow, in logical pixels (outlines only).
export const GLOW = {
  lane: 6,
  pad: 8,
  frog: 10,
  timer: 6,
} as const;
