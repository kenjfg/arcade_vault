"use client";

import { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { PlayerHud } from "@/components/player-hud";
import { CrtScreen } from "@/components/crt-screen";
import { GameOverModal } from "@/components/game-over-modal";
import { GAMES } from "@/lib/games-data";
import { useAuth } from "@/lib/auth-context";
import { saveScore } from "@/lib/scores";

export default function GamePlayerPage(props: PageProps<"/juegos/[id]/jugar">) {
  const { id } = use(props.params);
  const game = GAMES.find((g) => g.id === id);
  const router = useRouter();
  const { user } = useAuth();

  const lives = 3;
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!game || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [game, over, paused]);

  if (!game) notFound();

  const level = Math.floor(score / 2500) + 1;
  const name = nameOverride ?? (user ? user.name : "INVITADO");

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
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

      <CrtScreen title={game.title} paused={paused} />

      {over && (
        <GameOverModal
          score={score}
          name={name}
          saved={saved}
          onNameChange={(value) => setNameOverride(value.toUpperCase().slice(0, 10))}
          onSave={handleSave}
          onRestart={restart}
          onBackToLibrary={() => router.push("/")}
        />
      )}
    </div>
  );
}
