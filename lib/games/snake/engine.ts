// Snake game engine: board, snake, fruit, ticks, input and phases.
// Knows nothing about React; the player page drives it through SnakeGame
// and hears back through SnakeCallbacks.

import {
  CELL,
  COLORS,
  COLS,
  FRUIT_POINTS,
  FRUIT_SCALE,
  FRUIT_SHEET_SRC,
  FRUIT_SPRITES,
  FRUITS_PER_LEVEL,
  GAME_OVER_DELAY,
  GLOW,
  H,
  MAX_DT,
  ROWS,
  START_DIRECTION,
  START_HEAD,
  START_LENGTH,
  TURN_QUEUE_SIZE,
  W,
  tickDuration,
  type Direction,
} from "./constants";

export interface SnakeStats {
  score: number;
  lives: null; // a single life: the HUD hides VIDAS
  level: number; // starts at 1
}

export interface SnakeCallbacks {
  onStats: (stats: SnakeStats) => void; // only when the score or level change
  onGameOver: (finalScore: number) => void; // 1 s after dying or filling the board
}

export interface SnakeGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: stops the engine without calling onGameOver
  restart(): void; // initial state and back to ready
  destroy(): void; // cancels requestAnimationFrame, removes listeners and lets go of the image
}

type Phase = "ready" | "playing" | "gameover" | "ended";

interface Cell {
  col: number;
  row: number;
}

interface Fruit extends Cell {
  sprite: number; // index into FRUIT_SPRITES
}

const DELTAS: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const TURN_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

// Only these keys scroll the page. Space has no action in the engine.
const PREVENT_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

const insideBoard = (c: Cell) => c.col >= 0 && c.col < COLS && c.row >= 0 && c.row < ROWS;

export function createSnakeGame(canvas: HTMLCanvasElement, callbacks: SnakeCallbacks): SnakeGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Snake: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // The sprite sheet loads in the background; until it does (or if it fails)
  // the fruit is drawn as a neon circle, so the game never waits for it.
  const sheet = new Image();
  let sheetLoaded = false;
  sheet.onload = () => {
    sheetLoaded = true;
  };
  sheet.onerror = () => {
    sheetLoaded = false;
  };
  sheet.src = FRUIT_SHEET_SRC;

  // ── State ───────────────────────────────────────────────────────────────────
  let snake: Cell[] = []; // head first
  let direction: Direction = START_DIRECTION;
  let turns: Direction[] = [];
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let score = 0;
  let level = 1;
  let tickTimer = 0; // ms accumulated towards the next tick
  let phase: Phase = "ready";
  let paused = false;
  let gameoverTimer = 0;
  let lastStats: SnakeStats | null = null;

  // ── Game flow ───────────────────────────────────────────────────────────────
  // Uniform among the free cells; null when the snake fills the board.
  function spawnFruit() {
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = { col, row };
        if (!snake.some((s) => sameCell(s, cell))) free.push(cell);
      }
    }
    if (free.length === 0) {
      fruit = null;
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];
    fruit = { ...cell, sprite: Math.floor(Math.random() * FRUIT_SPRITES.length) };
  }

  function initGame() {
    const { col: dc, row: dr } = DELTAS[START_DIRECTION];
    snake = Array.from({ length: START_LENGTH }, (_, i) => ({
      col: START_HEAD.col - dc * i,
      row: START_HEAD.row - dr * i,
    }));
    direction = START_DIRECTION;
    turns = [];
    fruitsEaten = 0;
    score = 0;
    level = 1;
    tickTimer = 0;
    gameoverTimer = 0;
    spawnFruit();
    phase = "ready";
  }

  function finish() {
    phase = "gameover";
    gameoverTimer = GAME_OVER_DELAY;
  }

  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.level === level) return;
    lastStats = { score, lives: null, level };
    callbacks.onStats(lastStats);
  }

  // One step of the snake.
  function tick() {
    const turn = turns.shift();
    if (turn) direction = turn;

    const head = snake[0];
    const delta = DELTAS[direction];
    const next = { col: head.col + delta.col, row: head.row + delta.row };

    // On death the head does not move into the cell it crashed into.
    if (!insideBoard(next)) {
      finish();
      return;
    }
    const eating = fruit !== null && sameCell(next, fruit);
    // The cell the tail leaves this tick is free, unless the snake grows.
    const body = eating ? snake : snake.slice(0, -1);
    if (body.some((s) => sameCell(s, next))) {
      finish();
      return;
    }

    snake.unshift(next);
    if (!eating) {
      snake.pop();
      return;
    }

    // The fruit scores with the level it was eaten at.
    score += FRUIT_POINTS * level;
    fruitsEaten++;
    level = Math.floor(fruitsEaten / FRUITS_PER_LEVEL) + 1;
    spawnFruit();
    if (!fruit) finish(); // board full
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  // Up to TURN_QUEUE_SIZE pending turns. A turn equal or opposite to the last
  // one queued (or the current direction) is dropped.
  function queueTurn(turn: Direction) {
    if (turns.length >= TURN_QUEUE_SIZE) return;
    const last = turns.at(-1) ?? direction;
    if (turn === last || turn === OPPOSITE[last]) return;
    turns.push(turn);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e.target)) return;
    if (PREVENT_KEYS.has(e.code) && (phase === "ready" || phase === "playing")) e.preventDefault();
    if (phase !== "playing" || paused) return;
    const turn = TURN_KEYS[e.code];
    if (turn) queueTurn(turn);
  }

  window.addEventListener("keydown", onKeyDown);

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "gameover") {
      // The scene stays frozen until the delay runs out.
      gameoverTimer -= dt;
      if (gameoverTimer <= 0) {
        phase = "ended";
        callbacks.onGameOver(score);
      }
      return;
    }
    if (phase !== "playing") return;

    // dt ≤ MAX_DT < the shortest tick, so there is at most one tick per frame.
    tickTimer += dt;
    const duration = tickDuration(level);
    if (tickTimer >= duration) {
      tickTimer -= duration;
      tick();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBoard() {
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < COLS; col++) {
      ctx.moveTo(col * CELL, 0);
      ctx.lineTo(col * CELL, H);
    }
    for (let row = 1; row < ROWS; row++) {
      ctx.moveTo(0, row * CELL);
      ctx.lineTo(W, row * CELL);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.border;
    ctx.shadowBlur = GLOW.border;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.restore();
  }

  function drawSnake() {
    ctx.save();
    // Tail first so the head is drawn on top.
    for (let i = snake.length - 1; i >= 0; i--) {
      const { col, row } = snake[i];
      const color = i === 0 ? COLORS.head : COLORS.body;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = i === 0 ? GLOW.head : GLOW.body;
      ctx.beginPath();
      ctx.roundRect(col * CELL + 3, row * CELL + 3, CELL - 6, CELL - 6, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFruit(f: Fruit) {
    const cx = f.col * CELL + CELL / 2;
    const cy = f.row * CELL + CELL / 2;
    ctx.save();
    if (sheetLoaded) {
      const sprite = FRUIT_SPRITES[f.sprite];
      const w = sprite.w * FRUIT_SCALE;
      const h = sprite.h * FRUIT_SCALE;
      // Resizing the canvas resets this, so it is set on every draw.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, sprite.h, cx - w / 2, cy - h / 2, w, h);
    } else {
      ctx.fillStyle = COLORS.fruitFallback;
      ctx.shadowColor = COLORS.fruitFallback;
      ctx.shadowBlur = GLOW.fruitFallback;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    // Draw in logical 800×600 units whatever the canvas backing size is.
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    if (fruit) drawFruit(fruit);
    drawSnake();
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
      direction = START_DIRECTION;
      turns = [];
      tickTimer = 0;
      phase = "playing";
    },
    pause() {
      paused = true;
      turns = [];
    },
    resume() {
      paused = false;
      lastTime = null;
    },
    end() {
      phase = "ended";
      turns = [];
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
      sheet.onload = null;
      sheet.onerror = null;
    },
  };
}
