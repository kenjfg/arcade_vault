// Arkanoid game engine: paddle, ball, blocks, levels, loop, input and phases.
// Knows nothing about React; the player page drives it through ArkanoidGame
// and hears back through ArkanoidCallbacks.

import {
  BALL_SIZE,
  BALL_VX,
  BALL_VY,
  BLOCK_COLORS,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  COLORS,
  EXPLOSION_DURATION,
  GAME_OVER_DELAY,
  GLOW,
  H,
  MAX_DT,
  PADDLE,
  PADDLE_BOUNCE_TOLERANCE,
  START_LIVES,
  W,
  type BlockColor,
} from "./constants";
import { LEVELS } from "./levels";

export interface ArkanoidStats {
  score: number;
  lives: number; // starts at 3
  level: number; // 1-5
}

export interface ArkanoidCallbacks {
  onStats: (stats: ArkanoidStats) => void; // only when the score, lives or level change
  onGameOver: (finalScore: number) => void; // 1 s after losing the last life or clearing level 5
}

export interface ArkanoidGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: stops the engine without calling onGameOver
  restart(): void; // initial state and back to ready
  destroy(): void; // cancels requestAnimationFrame and removes listeners
}

type Phase = "ready" | "playing" | "gameover" | "ended";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball extends Rect {
  vx: number;
  vy: number;
}

interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}

interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}

// Space has no action in the engine; it is only kept from scrolling the page.
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "Space"]);

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const clampPaddleX = (x: number) => Math.max(0, Math.min(W - PADDLE.w, x));

export function createArkanoidGame(canvas: HTMLCanvasElement, callbacks: ArkanoidCallbacks): ArkanoidGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Arkanoid: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── State ───────────────────────────────────────────────────────────────────
  const paddle: Rect = { x: (W - PADDLE.w) / 2, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h };
  const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let ballVisible = true;
  let phase: Phase = "ready";
  let paused = false;
  let gameoverTimer = 0;
  let lastStats: ArkanoidStats | null = null;
  const keys = { left: false, right: false };

  // ── Game flow ───────────────────────────────────────────────────────────────
  // The ball sits centered on the paddle and leaves right away with the
  // current level's speed (it is only held still in ready).
  function serveBall() {
    const { speed } = LEVELS[level - 1];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BALL_VX * speed;
    ball.vy = BALL_VY * speed;
    ballVisible = true;
  }

  // The paddle stays where it is between levels.
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    serveBall();
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    paddle.x = (W - PADDLE.w) / 2;
    gameoverTimer = 0;
    clearKeys();
    loadLevel(1);
    phase = "ready";
  }

  function finish() {
    phase = "gameover";
    gameoverTimer = GAME_OVER_DELAY;
  }

  function clearKeys() {
    keys.left = false;
    keys.right = false;
  }

  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.lives === lives && lastStats.level === level) return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  const accepting = () => phase === "playing" && !paused;

  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e.target) || !GAME_KEYS.has(e.code)) return;
    if (phase === "ready" || phase === "playing") e.preventDefault();
    if (!accepting()) return;
    if (e.code === "ArrowLeft") keys.left = true;
    else if (e.code === "ArrowRight") keys.right = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.left = false;
    else if (e.code === "ArrowRight") keys.right = false;
  }

  // Centers the paddle on the cursor, converted to logical 800-wide units.
  function onMouseMove(e: MouseEvent) {
    if (!accepting()) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = ((e.clientX - rect.left) * W) / rect.width;
    paddle.x = clampPaddleX(mouseX - paddle.w / 2);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);

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

    const s = dt / 1000;

    // Paddle
    if (keys.left) paddle.x = clampPaddleX(paddle.x - PADDLE.speed * s);
    if (keys.right) paddle.x = clampPaddleX(paddle.x + PADDLE.speed * s);

    // Ball movement
    ball.x += ball.vx * s;
    ball.y += ball.vy * s;

    // Wall bounces (left, right, top)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle bounce: only vy flips, the angle never changes.
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Block collisions: at most one block per frame.
    for (const block of blocks) {
      if (!block.alive || !overlaps(ball, block)) continue;
      block.alive = false;
      explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else finish(); // clearing level 5 ends the game
        return;
      }
      break;
    }

    // Explosions
    for (const exp of explosions) exp.elapsed += dt;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Ball lost
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        ballVisible = false;
        finish();
      } else {
        serveBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(block: Block) {
    const color = BLOCK_COLORS[block.color];
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = GLOW.block;
    ctx.fillRect(block.x + 2, block.y + 2, block.w - 4, block.h - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(block.x + 2, block.y + 2, block.w - 4, 4);
    ctx.restore();
  }

  // A flash that grows and fades out along the destroyed block's outline.
  function drawExplosion(exp: Explosion) {
    const t = Math.min(exp.elapsed / EXPLOSION_DURATION, 1);
    const grow = t * 6;
    const color = BLOCK_COLORS[exp.color];
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = GLOW.explosion;
    ctx.strokeRect(exp.x + 2 - grow, exp.y + 2 - grow, exp.w - 4 + grow * 2, exp.h - 4 + grow * 2);
    ctx.restore();
  }

  function drawPaddle() {
    ctx.save();
    ctx.fillStyle = COLORS.paddle;
    ctx.shadowColor = COLORS.paddle;
    ctx.shadowBlur = GLOW.paddle;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, paddle.h / 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    ctx.save();
    ctx.fillStyle = COLORS.ball;
    ctx.shadowColor = COLORS.ball;
    ctx.shadowBlur = GLOW.ball;
    ctx.beginPath();
    ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    // Draw in logical 800×600 units whatever the canvas backing size is.
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    for (const block of blocks) if (block.alive) drawBlock(block);
    for (const exp of explosions) drawExplosion(exp);
    drawPaddle();
    if (ballVisible) drawBall();
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
    },
    pause() {
      paused = true;
      clearKeys();
    },
    resume() {
      paused = false;
      lastTime = null;
    },
    end() {
      phase = "ended";
      clearKeys();
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
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
