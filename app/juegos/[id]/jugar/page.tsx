"use client";

import { use, useEffect, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { PlayerHud } from "@/components/player-hud";
import { CrtScreen } from "@/components/crt-screen";
import { GameOverModal } from "@/components/game-over-modal";
import {
  AsteroidsCanvas,
  type AsteroidsCanvasHandle,
} from "@/components/games/asteroids-canvas";
import { GAMES } from "@/lib/games-data";
import { useAuth } from "@/lib/auth-context";
import { saveScore } from "@/lib/scores";
import type { AsteroidsStats } from "@/lib/games/asteroids/engine";

export default function GamePlayerPage(props: PageProps<"/juegos/[id]/jugar">) {
  const { id } = use(props.params);
  const game = GAMES.find((g) => g.id === id);
  const router = useRouter();
  const { user } = useAuth();

  // Only Asteroids is a real game; the other entries keep the simulated score.
  const isAsteroids = game?.id === "asteroids";

  const asteroidsRef = useRef<AsteroidsCanvasHandle>(null);
  const [simScore, setSimScore] = useState(0);
  const [asteroidsStats, setAsteroidsStats] = useState<AsteroidsStats>({
    score: 0,
    lives: 3,
    level: 1,
  });
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!game || isAsteroids || over || paused) return;
    const t = setInterval(
      () => setSimScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [game, isAsteroids, over, paused]);

  if (!game) notFound();

  const { score, lives, level } = isAsteroids
    ? asteroidsStats
    : { score: simScore, lives: 3, level: Math.floor(simScore / 2500) + 1 };
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  const endGame = () => {
    asteroidsRef.current?.end();
    setOver(true);
  };
  const restart = () => {
    asteroidsRef.current?.restart();
    setSimScore(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };
  const handleSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
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
        onExit={() => router.push(`/juegos/${game.id}`)}
      />

      <CrtScreen title={game.title} paused={paused}>
        {isAsteroids ? (
          <AsteroidsCanvas
            ref={asteroidsRef}
            paused={paused}
            over={over}
            onStats={setAsteroidsStats}
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
          saved={saved}
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
