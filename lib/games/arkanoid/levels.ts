// The 5 levels of references/started-games/04-arkanoid/levels.js, with the
// same patterns, row colors and ball speed multipliers.

import { BLOCK_COLS, BLOCK_ROWS, type BlockColor } from "./constants";

export interface LevelBlock {
  col: number; // 0-9
  row: number; // 0-5
  color: BlockColor;
}

export interface Level {
  speed: number; // multiplier for the ball's base velocity
  blocks: readonly LevelBlock[];
}

function grid(colorAt: (col: number, row: number) => BlockColor | null) {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      const color = colorAt(col, row);
      if (color) blocks.push({ col, row, color });
    }
  }
  return blocks;
}

const ROW_COLORS_1: readonly BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const ROW_COLORS_2: readonly BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const ROW_COLORS_4: readonly BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

// Level 2: centered pyramid, first and last column of each row.
const PYRAMID_START = [4, 3, 2, 1, 0, 0];
const PYRAMID_END = [5, 6, 7, 8, 9, 9];

// Level 4: empty columns of each row.
const GAPS_4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];

export const LEVELS: readonly Level[] = [
  // 1: full 10×6 grid
  { speed: 1.0, blocks: grid((_, row) => ROW_COLORS_1[row]) },
  // 2: pyramid
  {
    speed: 1.1,
    blocks: grid((col, row) =>
      col >= PYRAMID_START[row] && col <= PYRAMID_END[row] ? ROW_COLORS_2[row] : null,
    ),
  },
  // 3: checkerboard
  {
    speed: 1.21,
    blocks: grid((col, row) =>
      (col + row) % 2 === 0 ? (row < 3 ? "yellow" : "magenta") : null,
    ),
  },
  // 4: rows with gaps
  {
    speed: 1.33,
    blocks: grid((col, row) => (GAPS_4[row].includes(col) ? null : ROW_COLORS_4[row])),
  },
  // 5: frame + central cross
  {
    speed: 1.46,
    blocks: grid((col, row) => {
      const isFrame = col === 0 || col === BLOCK_COLS - 1 || row === 0 || row === BLOCK_ROWS - 1;
      const isCross = col === 4 || row === 2;
      if (!isFrame && !isCross) return null;
      return isCross && !isFrame ? "hotpink" : "cyan";
    }),
  },
];
