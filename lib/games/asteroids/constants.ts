// Tuning for the Asteroids port (references/started-games/02-asteroids/game.js).

// Logical canvas size; the canvas is scaled by CSS to fill .crt-screen (4:3).
export const W = 800;
export const H = 600;

// Asteroid tables indexed by size: 1 (small), 2 (medium), 3 (large).
export type AsteroidSize = 1 | 2 | 3;
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;

export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEED_KILLS = 5;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Hex copies of the :root tokens in app/globals.css (canvas can't read CSS vars).
export const COLORS = {
  ship: "#00f5ff", // --cyan
  asteroid: "#f5ff00", // --yellow
  bullet: "#ff006e", // --magenta
  particle: "#ff006e", // --magenta
  powerUp: "#00ff88", // --green
  thrust: "#ff006e", // --magenta
  background: "#000",
} as const;

// shadowBlur for the neon glow, in logical pixels.
export const GLOW = {
  ship: 12,
  asteroid: 10,
  bullet: 8,
  particle: 6,
  powerUp: 12,
} as const;
