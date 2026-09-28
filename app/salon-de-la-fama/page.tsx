"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HallPodium } from "@/components/hall-podium";
import { HallTable } from "@/components/hall-table";
import { GAMES, seededScores } from "@/lib/games-data";
import { useAuth } from "@/lib/auth-context";

export default function HallOfFamePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = GAMES.find((g) => g.id === tab);

  const youRank = Math.floor(8 + (tab.length % 4));
  const youScore = (rows[5]?.score ?? 10399) - 2400;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button key={g.id} className={"chip" + (tab === g.id ? " active" : "")} onClick={() => setTab(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      <HallPodium rows={rows} />

      <HallTable
        rows={rows}
        gameTitle={game ? game.title : ""}
        you={user ? { rank: youRank, name: user.name, score: youScore || 9999, date: "11/05/2026" } : null}
      />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
