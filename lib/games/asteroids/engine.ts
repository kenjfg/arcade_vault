// Asteroids game engine: state, loop, input, collisions and phases.
// Knows nothing about React; the player page drives it through AsteroidsGame
// and hears back through AsteroidsCallbacks.

import {
  COLORS,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  W,
} from "./constants";
import { Asteroid, Bullet, Particle, PowerUp, Ship, dist, rand } from "./entities";

export interface AsteroidsStats {
  score: number;
  lives: number; // 3 → 0
  level: number; // starts at 1
}

export interface AsteroidsCallbacks {
  onStats: (stats: AsteroidsStats) => void; // only when a value changes
  onGameOver: (finalScore: number) => void; // after losing the last life
}

export interface AsteroidsGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: stops the engine without calling onGameOver
  restart(): void; // initial state and back to ready
  destroy(): void; // cancels requestAnimationFrame and removes listeners
}

type Phase = "ready" | "playing" | "dead" | "gameover" | "ended";

const START_LIVES = 3;
const START_ASTEROIDS = 4;
const RESPAWN_DELAY = 2;
const GAMEOVER_DELAY = 1;
const MAX_DT = 0.05;
const SAFE_DIST = 130;
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Asteroids: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── State ───────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let phase: Phase = "ready";
  let paused = false;
  let deadTimer = 0;
  let gameoverTimer = 0;
  let lastStats: AsteroidsStats | null = null;

  // ── Input ───────────────────────────────────────────────────────────────────
  let keys: Record<string, boolean> = {};
  let justPressed: Record<string, boolean> = {};

  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  function onKeyDown(e: KeyboardEvent) {
    // Presses while paused must not queue a shot for when the game resumes.
    if (isTyping(e.target) || paused) return;
    if (GAME_KEYS.has(e.code) && (phase === "ready" || phase === "playing")) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // ── Game flow ───────────────────────────────────────────────────────────────
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = START_LIVES;
    level = 1;
    phase = "ready";
    spawnAsteroids(START_ASTEROIDS);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
      gameoverTimer = GAMEOVER_DELAY;
    } else {
      phase = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }

  function emitStats() {
    if (lastStats && lastStats.score === score && lastStats.lives === lives && lastStats.level === level) return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function updateDrift(dt: number) {
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  function update(dt: number) {
    if (phase === "ended") return;

    if (phase === "ready") {
      updateDrift(dt);
      return;
    }

    if (phase === "gameover") {
      updateDrift(dt);
      gameoverTimer -= dt;
      if (gameoverTimer <= 0) {
        phase = "ended";
        callbacks.onGameOver(score);
      }
      return;
    }

    if (phase === "dead") {
      updateDrift(dt);
      deadTimer -= dt;
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    // Shoot
    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, {
      left: !!keys.ArrowLeft,
      right: !!keys.ArrowRight,
      thrust: !!keys.ArrowUp,
    });
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawTripleShotTimer() {
    if (ship.dead || ship.tripleShot <= 0) return;
    ctx.save();
    ctx.fillStyle = COLORS.powerUp;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    ctx.restore();
  }

  function draw() {
    // Draw in logical 800×600 units whatever the canvas backing size is.
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    if (phase !== "ready") ship.draw(ctx);

    drawTripleShotTimer();
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  let rafId = 0;
  let lastTime: number | null = null;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
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
      ship.reset();
      phase = "playing";
      // The Space press that starts the game must not also fire a shot:
      // mark it as held so only a fresh press counts.
      justPressed = {};
      keys.Space = true;
    },
    pause() {
      paused = true;
      // Keyups are lost while unfocused; forget held keys so the ship doesn't stay thrusting.
      keys = {};
      justPressed = {};
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
      keys = {};
      justPressed = {};
      emitStats();
    },
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
