// Frogger game engine: lanes, frog, lily pads, timer, input and phases.
// Knows nothing about React; the player page drives it through FroggerGame
// and hears back through FroggerCallbacks.

import {
  CAR_HEIGHT,
  CELL,
  COLORS,
  DEATH_DELAY,
  FROG_MAX_X,
  FROG_MIN_X,
  FROG_SIZE,
  FROG_START_X,
  FROG_TIME,
  GAME_OVER_DELAY,
  GLOW,
  H,
  LANES,
  MAX_DT,
  MAX_SCORE,
  PAD_CENTERS,
  PAD_TOLERANCE,
  PAD_WIDTH,
  POINTS_NEW_ROW,
  POINTS_PAD,
  POINTS_PER_SECOND,
  POINTS_ROUND,
  ROW_BANK,
  ROW_MEDIAN,
  ROW_PADS,
  ROW_RIVER_FIRST,
  ROW_RIVER_LAST,
  ROW_ROAD_FIRST,
  ROW_ROAD_LAST,
  ROW_START,
  ROW_TIMER,
  START_LIVES,
  TIME_CRITICAL,
  TIME_LOW,
  W,
  rowCenter,
  speedFactor,
  type Lane,
} from "./constants";

export interface FroggerStats {
  score: number;
  lives: number; // starts at 3
  level: number; // starts at 1, +1 for every 5 filled pads
}

export interface FroggerCallbacks {
  onStats: (stats: FroggerStats) => void; // only when the score, lives or level change
  onGameOver: (finalScore: number) => void; // 1 s after losing the last life
}

export interface FroggerGame {
  start(): void; // ready → playing
  pause(): void;
  resume(): void;
  end(): void; // FIN: stops the engine without calling onGameOver
  restart(): void; // initial state and back to ready
  destroy(): void; // cancels requestAnimationFrame and removes listeners
}

type Phase = "ready" | "playing" | "dying" | "gameover" | "ended";

type Facing = "up" | "down" | "left" | "right";

interface Frog {
  x: number; // center
  row: number;
  facing: Facing;
  bestRow: number; // highest row (lowest number) reached by this frog
}

// A lane at runtime: its config plus the left edge of each object.
interface LaneState {
  lane: Lane;
  xs: number[];
  cycle: number; // n × spacing: an object leaving one side reappears on the other
}

const JUMP_KEYS: Record<string, Facing> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const FACING_ANGLE: Record<Facing, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

// Only these keys scroll the page. Space has no action in the engine.
const PREVENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

const isRiver = (row: number) =>
  row >= ROW_RIVER_FIRST && row <= ROW_RIVER_LAST;
const isRoad = (row: number) => row >= ROW_ROAD_FIRST && row <= ROW_ROAD_LAST;

function createLanes(): LaneState[] {
  return LANES.map((lane) => {
    const n = Math.ceil((W + lane.width) / lane.spacing);
    return {
      lane,
      xs: Array.from({ length: n }, (_, k) => k * lane.spacing),
      cycle: n * lane.spacing,
    };
  });
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
): FroggerGame {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Frogger: 2D canvas context not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ── State ───────────────────────────────────────────────────────────────────
  let lanes: LaneState[] = [];
  let frog: Frog = newFrogState();
  let pads: boolean[] = [];
  let timeLeft = FROG_TIME; // seconds
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  let phase: Phase = "ready";
  let paused = false;
  let phaseTimer = 0; // ms left in dying or gameover
  let frogDead = false; // drawn as an X until the next frog
  let lastStats: FroggerStats | null = null;

  function newFrogState(): Frog {
    return {
      x: FROG_START_X,
      row: ROW_START,
      facing: "up",
      bestRow: ROW_START,
    };
  }

  // ── Game flow ───────────────────────────────────────────────────────────────
  function initGame() {
    lanes = createLanes();
    frog = newFrogState();
    pads = PAD_CENTERS.map(() => false);
    timeLeft = FROG_TIME;
    score = 0;
    lives = START_LIVES;
    level = 1;
    phaseTimer = 0;
    frogDead = false;
    phase = "ready";
  }

  function newFrog() {
    frog = newFrogState();
    frogDead = false;
    timeLeft = FROG_TIME;
  }

  function addScore(points: number) {
    score = Math.min(score + points, MAX_SCORE);
  }

  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    ) {
      return;
    }
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  // Car, water, off the canvas, hedge, taken pad or time out.
  function die() {
    frogDead = true;
    lives--;
    if (lives > 0) {
      phase = "dying";
      phaseTimer = DEATH_DELAY;
    } else {
      phase = "gameover";
      phaseTimer = GAME_OVER_DELAY;
    }
  }

  // The frog jumps up from the first river row into the pads row.
  function reachPads() {
    const i = PAD_CENTERS.findIndex(
      (c) => Math.abs(frog.x - c) <= PAD_TOLERANCE,
    );
    if (i === -1 || pads[i]) {
      frog.row = ROW_PADS;
      die();
      return;
    }
    pads[i] = true;
    addScore(POINTS_PAD + POINTS_PER_SECOND * Math.floor(timeLeft));
    if (pads.every(Boolean)) {
      addScore(POINTS_ROUND);
      level++;
      pads = PAD_CENTERS.map(() => false);
    }
    newFrog();
  }

  // Kills the frog if it is hit by a vehicle, in the water or off the canvas.
  // Returns whether it died.
  function checkFrog(): boolean {
    const row = frog.row;
    if (isRoad(row)) {
      const half = FROG_SIZE / 2;
      const hit = lanes.some(
        ({ lane, xs }) =>
          lane.row === row &&
          xs.some((x) => frog.x + half > x && frog.x - half < x + lane.width),
      );
      if (hit) {
        die();
        return true;
      }
    } else if (isRiver(row)) {
      const onPlatform = lanes.some(
        ({ lane, xs }) =>
          lane.row === row &&
          xs.some((x) => frog.x >= x && frog.x <= x + lane.width),
      );
      if (!onPlatform || frog.x < 0 || frog.x > W) {
        die();
        return true;
      }
    }
    return false;
  }

  function jump(facing: Facing) {
    frog.facing = facing;
    if (facing === "up") {
      if (frog.row === ROW_RIVER_FIRST) {
        reachPads();
        return;
      }
      frog.row--;
    } else if (facing === "down") {
      if (frog.row === ROW_START) return;
      frog.row++;
    } else {
      const x = frog.x + (facing === "left" ? -CELL : CELL);
      if (x < FROG_MIN_X || x > FROG_MAX_X) return;
      frog.x = x;
    }
    if (frog.row < frog.bestRow) {
      frog.bestRow = frog.row;
      addScore(POINTS_NEW_ROW);
    }
    checkFrog();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  // Read by e.code only: the touch gamepad sends synthetic events.
  // One jump per press: held keys (repeat) are ignored.
  function onKeyDown(e: KeyboardEvent) {
    if (isTyping(e.target)) return;
    if (PREVENT_KEYS.has(e.code) && (phase === "ready" || phase === "playing"))
      e.preventDefault();
    if (phase !== "playing" || paused || e.repeat) return;
    const facing = JUMP_KEYS[e.code];
    if (facing) jump(facing);
  }

  window.addEventListener("keydown", onKeyDown);

  // ── Update ──────────────────────────────────────────────────────────────────
  function moveLanes(dt: number) {
    const factor = speedFactor(level);
    for (const { lane, xs, cycle } of lanes) {
      const dx = lane.direction * lane.speed * factor * (dt / 1000);
      for (let i = 0; i < xs.length; i++) {
        let x = xs[i] + dx;
        if (lane.direction > 0 && x > W) x -= cycle;
        else if (lane.direction < 0 && x + lane.width < 0) x += cycle;
        xs[i] = x;
      }
    }
  }

  // On the river the frog moves with its lane.
  function carryFrog(dt: number) {
    if (!isRiver(frog.row)) return;
    const state = lanes.find(({ lane }) => lane.row === frog.row);
    if (!state) return;
    const { lane } = state;
    frog.x += lane.direction * lane.speed * speedFactor(level) * (dt / 1000);
  }

  function update(dt: number) {
    if (phase === "gameover") {
      // The scene stays frozen until the delay runs out.
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        phase = "ended";
        callbacks.onGameOver(score);
      }
      return;
    }
    if (phase === "dying") {
      // The world keeps moving; the clock does not.
      moveLanes(dt);
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        newFrog();
        phase = "playing";
      }
      return;
    }
    if (phase !== "playing") return;

    moveLanes(dt);
    carryFrog(dt);
    if (checkFrog()) return;
    timeLeft -= dt / 1000;
    if (timeLeft <= 0) {
      timeLeft = 0;
      die();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function fillRow(row: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(0, row * CELL, W, CELL);
  }

  function drawSafeRow(row: number) {
    fillRow(row, COLORS.safe);
    ctx.strokeStyle = COLORS.safeBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, row * CELL + 0.5, W - 1, CELL - 1);
  }

  function drawField() {
    ctx.save();
    fillRow(ROW_BANK, COLORS.bank);

    // Hedge with a river-colored gap under each pad.
    fillRow(ROW_PADS, COLORS.bank);
    ctx.fillStyle = COLORS.river;
    for (const c of PAD_CENTERS)
      ctx.fillRect(c - PAD_WIDTH / 2, ROW_PADS * CELL, PAD_WIDTH, CELL);

    for (let row = ROW_RIVER_FIRST; row <= ROW_RIVER_LAST; row++)
      fillRow(row, COLORS.river);
    for (let row = ROW_ROAD_FIRST; row <= ROW_ROAD_LAST; row++)
      fillRow(row, COLORS.road);

    // Dashed lines between road lanes.
    ctx.strokeStyle = COLORS.laneLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    for (let row = ROW_ROAD_FIRST + 1; row <= ROW_ROAD_LAST; row++) {
      ctx.moveTo(0, row * CELL);
      ctx.lineTo(W, row * CELL);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    drawSafeRow(ROW_MEDIAN);
    drawSafeRow(ROW_START);
    ctx.restore();
  }

  // A U-shaped outline; a taken pad holds a resting frog.
  function drawPads() {
    ctx.save();
    const top = ROW_PADS * CELL + 6;
    const bottom = (ROW_PADS + 1) * CELL - 4;
    PAD_CENTERS.forEach((c, i) => {
      const left = c - PAD_WIDTH / 2 + 4;
      const right = c + PAD_WIDTH / 2 - 4;
      ctx.strokeStyle = COLORS.pad;
      ctx.lineWidth = 2;
      ctx.shadowColor = COLORS.pad;
      ctx.shadowBlur = GLOW.pad;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom - 8);
      ctx.quadraticCurveTo(left, bottom, left + 8, bottom);
      ctx.lineTo(right - 8, bottom);
      ctx.quadraticCurveTo(right, bottom, right, bottom - 8);
      ctx.lineTo(right, top);
      ctx.stroke();
      if (pads[i]) drawFrog(c, rowCenter(ROW_PADS), "up");
    });
    ctx.restore();
  }

  function drawVehicle(lane: Lane, x: number) {
    const top = rowCenter(lane.row) - CAR_HEIGHT / 2;
    ctx.strokeRect(x + 1, top + 1, lane.width - 2, CAR_HEIGHT - 2);
    // Two headlights at the front.
    const front = lane.direction > 0 ? x + lane.width - 6 : x + 2;
    ctx.fillStyle = COLORS.headlight;
    ctx.fillRect(front, top + 5, 4, 4);
    ctx.fillRect(front, top + CAR_HEIGHT - 9, 4, 4);
  }

  function drawLog(lane: Lane, x: number) {
    const top = rowCenter(lane.row) - CAR_HEIGHT / 2;
    ctx.beginPath();
    ctx.roundRect(x + 1, top + 1, lane.width - 2, CAR_HEIGHT - 2, 10);
    ctx.stroke();
  }

  // One circle per 40 px of the group.
  function drawTurtles(lane: Lane, x: number) {
    const cy = rowCenter(lane.row);
    for (let i = 0; i < lane.width / CELL; i++) {
      ctx.beginPath();
      ctx.arc(x + i * CELL + CELL / 2, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLanes() {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.shadowBlur = GLOW.lane;
    for (const { lane, xs } of lanes) {
      ctx.strokeStyle = lane.color;
      ctx.shadowColor = lane.color;
      for (const x of xs) {
        if (x > W || x + lane.width < 0) continue;
        if (isRoad(lane.row)) drawVehicle(lane, x);
        else if (lane.kind.startsWith("log")) drawLog(lane, x);
        else drawTurtles(lane, x);
      }
    }
    ctx.restore();
  }

  // A neon frog: body and 4 legs, facing its last jump.
  function drawFrog(x: number, cy: number, facing: Facing) {
    ctx.save();
    ctx.translate(x, cy);
    ctx.rotate(FACING_ANGLE[facing]);
    ctx.strokeStyle = COLORS.frog;
    ctx.fillStyle = COLORS.frog;
    ctx.shadowColor = COLORS.frog;
    ctx.shadowBlur = GLOW.frog;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    // Front legs.
    ctx.moveTo(-6, -6);
    ctx.lineTo(-12, -13);
    ctx.moveTo(6, -6);
    ctx.lineTo(12, -13);
    // Back legs.
    ctx.moveTo(-6, 6);
    ctx.lineTo(-13, 12);
    ctx.moveTo(6, 6);
    ctx.lineTo(13, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The dead frog: a magenta X where it died.
  function drawDeadFrog() {
    const cy = rowCenter(frog.row);
    const r = FROG_SIZE / 2;
    ctx.save();
    ctx.strokeStyle = COLORS.dead;
    ctx.shadowColor = COLORS.dead;
    ctx.shadowBlur = GLOW.frog;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(frog.x - r, cy - r);
    ctx.lineTo(frog.x + r, cy + r);
    ctx.moveTo(frog.x + r, cy - r);
    ctx.lineTo(frog.x - r, cy + r);
    ctx.stroke();
    ctx.restore();
  }

  function drawTimer() {
    const ratio = Math.max(0, timeLeft) / FROG_TIME;
    const color =
      timeLeft > TIME_LOW
        ? COLORS.timeOk
        : timeLeft >= TIME_CRITICAL
          ? COLORS.timeLow
          : COLORS.timeCritical;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = GLOW.timer;
    ctx.fillRect(0, ROW_TIMER * CELL + 12, W * ratio, CELL - 24);
    ctx.restore();
  }

  function draw() {
    // Draw in logical 800×600 units whatever the canvas backing size is.
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
    drawField();
    drawPads();
    drawLanes();
    if (frogDead) drawDeadFrog();
    else drawFrog(frog.x, rowCenter(frog.row), frog.facing);
    drawTimer();
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
