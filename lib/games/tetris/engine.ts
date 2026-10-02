// Tetris game engine: board, loop, input, rotation, line clears and phases.
// Knows nothing about React; the player page drives it through TetrisGame
// and hears back through TetrisCallbacks.

import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  FONT,
  GAME_OVER_DELAY,
  GHOST_ALPHA,
  GLOW,
  H,
  HARD_DROP_POINTS,
  KICKS,
  LINE_SCORES,
  LINES_PANEL,
  LINES_PER_LEVEL,
  MAX_DT,
  NEXT_PANEL,
  PIECE_COLORS,
  PIECE_COUNT,
  PIECES,
  ROWS,
  SOFT_DROP_POINTS,
  W,
  dropIntervalFor,
  type PieceType,
  type Shape,
} from "./constants";

export interface TetrisStats {
  score: number;
  lives: null; // Tetris has no lives
  level: number; // starts at 1
}

export interface TetrisCallbacks {
  onStats: (stats: TetrisStats) => void; // only when the score or the level changes
  onGameOver: (finalScore: number) => void; // 1 s after the new piece does not fit
}

export interface TetrisGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: stops the engine without calling onGameOver
  restart(): void; // initial state and back to ready
  destroy(): void; // cancels requestAnimationFrame and removes listeners
}

type Phase = "ready" | "playing" | "gameover" | "ended";

interface Piece {
  type: PieceType;
  shape: Shape;
  x: number;
  y: number;
}

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

// ── Board and pieces (pure) ───────────────────────────────────────────────────
function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = (Math.floor(Math.random() * PIECE_COUNT) + 1) as PieceType;
  const shape = PIECES[type]!.map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(board: number[][], shape: Shape, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

// Clockwise: transpose, then reverse each row.
function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function createTetrisGame(canvas: HTMLCanvasElement, callbacks: TetrisCallbacks): TetrisGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Tetris: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── State ───────────────────────────────────────────────────────────────────
  let board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = dropIntervalFor(1);
  let dropAccum = 0;
  let phase: Phase = "ready";
  let paused = false;
  let gameoverTimer = 0;
  let lastStats: TetrisStats | null = null;

  // ── Game flow ───────────────────────────────────────────────────────────────
  function initGame() {
    board = createBoard();
    current = null;
    next = null;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = dropIntervalFor(1);
    dropAccum = 0;
    gameoverTimer = 0;
    phase = "ready";
  }

  function spawn() {
    current = next ?? randomPiece();
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) {
      // The piece that does not fit is not drawn; the stack stays frozen.
      current = null;
      phase = "gameover";
      gameoverTimer = GAME_OVER_DELAY;
    }
  }

  function merge(piece: Piece) {
    piece.shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) board[piece.y + r][piece.x + c] = v;
      }),
    );
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++; // the rows above moved down: check this index again
      }
    }
    if (!cleared) return;
    score += LINE_SCORES[cleared] * level; // level before the clear
    lines += cleared;
    level = Math.floor(lines / LINES_PER_LEVEL) + 1;
    dropInterval = dropIntervalFor(level);
  }

  function lockPiece(piece: Piece) {
    merge(piece);
    clearLines();
    spawn();
  }

  function ghostY(piece: Piece) {
    let gy = piece.y;
    while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
    return gy;
  }

  function move(piece: Piece, dx: number) {
    if (!collide(board, piece.shape, piece.x + dx, piece.y)) piece.x += dx;
  }

  function rotate(piece: Piece) {
    const rotated = rotateCW(piece.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, piece.x + kick, piece.y)) {
        piece.shape = rotated;
        piece.x += kick;
        return;
      }
    }
  }

  function softDrop(piece: Piece) {
    if (!collide(board, piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
      score += SOFT_DROP_POINTS;
    } else {
      lockPiece(piece);
    }
  }

  function hardDrop(piece: Piece) {
    const gy = ghostY(piece);
    score += (gy - piece.y) * HARD_DROP_POINTS;
    piece.y = gy;
    lockPiece(piece);
  }

  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.level === level) return;
    lastStats = { score, lives: null, level };
    callbacks.onStats(lastStats);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  // Moves happen on keydown, so holding a key uses the system key repeat.
  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e.target)) return;
    if (GAME_KEYS.has(e.code) && (phase === "ready" || phase === "playing")) e.preventDefault();
    // Ignored in ready, so the Space that starts the game does not hard drop.
    if (paused || phase !== "playing" || !current) return;
    switch (e.code) {
      case "ArrowLeft":
        move(current, -1);
        break;
      case "ArrowRight":
        move(current, 1);
        break;
      case "ArrowUp":
      case "KeyX":
        rotate(current);
        break;
      case "ArrowDown":
        softDrop(current);
        break;
      case "Space":
        hardDrop(current);
        break;
    }
    emitStats();
  }

  // Registered on creation, before the component's start listener.
  window.addEventListener("keydown", onKeyDown);

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "gameover") {
      gameoverTimer -= dt;
      if (gameoverTimer <= 0) {
        phase = "ended";
        callbacks.onGameOver(score);
      }
      return;
    }
    if (phase !== "playing" || !current) return;

    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      // A piece that cannot go down locks on this same tick (no lock delay).
      if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece(current);
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(px: number, py: number, type: number, alpha = 1, glow = true) {
    const color = PIECE_COLORS[type];
    if (!color) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = GLOW.block;
    }
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.highlight;
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, 4);
    ctx.restore();
  }

  function drawShape(piece: Piece, ox: number, oy: number, alpha = 1, glow = true) {
    piece.shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) drawBlock(ox + c * BLOCK, oy + r * BLOCK, v, alpha, glow);
      }),
    );
  }

  function drawBoard() {
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.border;
    ctx.shadowBlur = GLOW.border;
    ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * BLOCK + 2, ROWS * BLOCK + 2);
    ctx.restore();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c]);

    if (current) {
      drawShape(current, BOARD_X + current.x * BLOCK, BOARD_Y + ghostY(current) * BLOCK, GHOST_ALPHA, false);
      drawShape(current, BOARD_X + current.x * BLOCK, BOARD_Y + current.y * BLOCK);
    }
  }

  function drawLabel(text: string, x: number, y: number) {
    ctx.fillStyle = COLORS.label;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(text, x, y);
  }

  function drawPanels() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Left: lines cleared this game.
    drawLabel("LÍNEAS", LINES_PANEL.x, LINES_PANEL.labelY);
    ctx.fillStyle = COLORS.value;
    ctx.shadowColor = COLORS.value;
    ctx.shadowBlur = GLOW.text;
    ctx.font = `bold 36px ${FONT}`;
    ctx.fillText(String(lines), LINES_PANEL.x, LINES_PANEL.valueY);
    ctx.shadowBlur = 0;

    // Right: next piece in a 4×4 box.
    drawLabel("NEXT", NEXT_PANEL.x + NEXT_PANEL.size / 2, NEXT_PANEL.labelY);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(NEXT_PANEL.x, NEXT_PANEL.boxY, NEXT_PANEL.size, NEXT_PANEL.size);
    ctx.restore();

    if (next) {
      const offX = Math.floor((4 - next.shape[0].length) / 2);
      const offY = Math.floor((4 - next.shape.length) / 2);
      drawShape(next, NEXT_PANEL.x + offX * BLOCK, NEXT_PANEL.boxY + offY * BLOCK);
    }
  }

  function draw() {
    // Draw in logical 800×600 units whatever the canvas backing size is.
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    drawPanels();
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    if (!paused) {
      update(dt);
      emitStats();
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  emitStats();
  rafId = requestAnimationFrame(loop);

  return {
    start() {
      if (phase !== "ready") return;
      phase = "playing";
      dropAccum = 0;
      spawn();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      lastTime = null;
    },
    end() {
      phase = "ended";
    },
    restart() {
      initGame();
      paused = false;
      lastTime = null;
      emitStats();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
