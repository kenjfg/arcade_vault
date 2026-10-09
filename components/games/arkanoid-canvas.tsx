"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  createArkanoidGame,
  type ArkanoidGame,
  type ArkanoidStats,
} from "@/lib/games/arkanoid/engine";
import type { GameCanvasProps } from "@/components/games/registry";

const MAX_DPR = 2;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

export function ArkanoidCanvas({
  ref,
  paused,
  over,
  onStats,
  onGameOver,
  onTogglePause,
  onAutoPause,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ArkanoidGame | null>(null);
  const [started, setStarted] = useState(false);

  const handleStats = useEffectEvent((stats: ArkanoidStats) => onStats(stats));
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

    // The engine ignores keys and the mouse until start(), so the scene stays
    // still behind the start overlay.
    const game = createArkanoidGame(canvas, {
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

  // Touching the start screen also begins the game; a mouse click does not.
  const startByTouch = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || started || paused || over) return;
    gameRef.current?.start();
    setStarted(true);
  };

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
        <div className="crt-content" onPointerDown={startByTouch}>
          <div>
            <div className="pixel neon-cyan" style={{ fontSize: 28 }}>
              ARKANOID
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
              <span className="av-hint-keys">PULSA ESPACIO PARA EMPEZAR</span>
              <span className="av-hint-touch">TOCA PARA EMPEZAR</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
