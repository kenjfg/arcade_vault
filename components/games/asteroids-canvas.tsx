"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  createAsteroidsGame,
  type AsteroidsGame,
  type AsteroidsStats,
} from "@/lib/games/asteroids/engine";

// Commands the player page sends from its FIN and JUGAR DE NUEVO buttons.
export interface AsteroidsCanvasHandle {
  end(): void;
  restart(): void;
}

interface AsteroidsCanvasProps {
  ref?: Ref<AsteroidsCanvasHandle>;
  paused: boolean;
  over: boolean;
  onStats: (stats: AsteroidsStats) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void; // P / Esc
  onAutoPause: () => void; // tab hidden or window blurred
}

const MAX_DPR = 2;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

export function AsteroidsCanvas({
  ref,
  paused,
  over,
  onStats,
  onGameOver,
  onTogglePause,
  onAutoPause,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [started, setStarted] = useState(false);

  const handleStats = useEffectEvent((stats: AsteroidsStats) => onStats(stats));
  const handleGameOver = useEffectEvent((finalScore: number) =>
    onGameOver(finalScore),
  );
  const handleTogglePause = useEffectEvent(() => onTogglePause());
  const handleAutoPause = useEffectEvent(() => onAutoPause());

  useImperativeHandle(ref, () => ({
    end() {
      gameRef.current?.end();
    },
    restart() {
      gameRef.current?.restart();
      setStarted(false);
    },
  }));

  // One engine per mount; destroyed on unmount so no loop or listener survives.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Backing store follows the displayed size × devicePixelRatio; the engine
    // scales its 800×600 drawing to whatever size the canvas has.
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    const game = createAsteroidsGame(canvas, {
      onStats: (stats) => handleStats(stats),
      onGameOver: (finalScore) => handleGameOver(finalScore),
    });
    gameRef.current = game;

    return () => {
      observer.disconnect();
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // The page owns the paused state (HUD button, overlay); the engine follows it.
  useEffect(() => {
    if (paused) gameRef.current?.pause();
    else gameRef.current?.resume();
  }, [paused]);

  // Space on the start screen begins the game.
  useEffect(() => {
    if (started || paused || over) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      gameRef.current?.start();
      setStarted(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, paused, over]);

  // P / Esc toggle the pause, and losing the tab or window focus pauses,
  // only while a game is in progress.
  useEffect(() => {
    if (!started || over) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTyping(e.target)) return;
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      e.preventDefault();
      handleTogglePause();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleAutoPause();
    };
    const onBlur = () => handleAutoPause();
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [started, over]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      {!started && (
        <div className="crt-content">
          <div>
            <div className="pixel neon-cyan" style={{ fontSize: 28 }}>
              ASTEROIDS
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-dim)",
                marginTop: 14,
                letterSpacing: "0.16em",
              }}
            >
              PULSA ESPACIO PARA EMPEZAR
            </div>
          </div>
        </div>
      )}
    </>
  );
}
