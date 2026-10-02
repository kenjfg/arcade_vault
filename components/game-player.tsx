"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerHud } from "@/components/player-hud";
import { CrtScreen } from "@/components/crt-screen";
import { GameOverModal, type SaveState } from "@/components/game-over-modal";
import {
  getGameEntry,
  type GameCanvasHandle,
  type GameStats,
} from "@/components/games/registry";
import { submitScore } from "@/app/juegos/[id]/jugar/actions";
import type { Game } from "@/lib/games-data";
import { useAuth } from "@/lib/auth-context";

interface GamePlayerProps {
  game: Game;
}

export function GamePlayer({ game }: GamePlayerProps) {
  const router = useRouter();
  const { user } = useAuth();

  // A real game must be in the registry and have `playable` in the database;
  // anything else keeps the simulated score and cannot save it.
  // Looked up by code, not by the numeric id, which depends on the database.
  const entry = game.playable ? getGameEntry(game.code) : undefined;
  const GameCanvas = entry?.Component;
  const isReal = entry !== undefined;

  const gameRef = useRef<GameCanvasHandle>(null);
  const [simScore, setSimScore] = useState(0);
  const [gameStats, setGameStats] = useState<GameStats>(
    entry?.initialStats ?? { score: 0, lives: 3, level: 1 },
  );
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setSimScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  const { score, lives, level } = isReal
    ? gameStats
    : { score: simScore, lives: 3, level: Math.floor(simScore / 2500) + 1 };
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  const endGame = () => {
    gameRef.current?.end();
    setOver(true);
  };
  const restart = () => {
    gameRef.current?.restart();
    setSimScore(0);
    setPaused(false);
    setOver(false);
    setSaveState("idle");
  };
  const handleSave = async () => {
    setSaveState("saving");
    const result = await submitScore({ gameId: game.id, name, score });
    if (!result.ok) console.warn("[scores] not saved:", result.error);
    setSaveState(result.ok ? "saved" : "error");
  };

  return (
    <div className="av-player fade-in">
      <PlayerHud
        playerName={name}
        score={score}
        lives={lives}
        level={level}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onEnd={endGame}
        onExit={() => router.push(`/juegos/${game.code}`)}
      />

      <CrtScreen title={game.title} paused={paused}>
        {GameCanvas ? (
          <GameCanvas
            ref={gameRef}
            paused={paused}
            over={over}
            onStats={setGameStats}
            onGameOver={() => setOver(true)}
            onTogglePause={() => setPaused((p) => !p)}
            onAutoPause={() => setPaused(true)}
          />
        ) : undefined}
      </CrtScreen>

      {over && (
        <GameOverModal
          score={score}
          name={name}
          playable={isReal}
          saveState={saveState}
          onNameChange={(value) =>
            setNameOverride(value.toUpperCase().slice(0, 10))
          }
          onSave={handleSave}
          onRestart={restart}
          onBackToLibrary={() => router.push("/juegos")}
        />
      )}
    </div>
  );
}
