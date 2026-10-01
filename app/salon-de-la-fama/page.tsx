import Link from "next/link";
import { notFound } from "next/navigation";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames, getLeaderboard } from "@/lib/games-db";

export default async function HallOfFamePage(
  props: PageProps<"/salon-de-la-fama">,
) {
  const { juego } = await props.searchParams;
  const { games } = await getGames();

  // Without ?juego= or with an unknown code, fall back to the first game by sort_order.
  const game = games.find((g) => g.code === juego) ?? games[0];
  if (!game) notFound();

  const leaderboard = await getLeaderboard(game.id, 12);
  const rows = "rows" in leaderboard ? leaderboard.rows : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <HallOfFame
        games={games.map(({ id, code, title }) => ({ id, code, title }))}
        game={{ id: game.id, code: game.code, title: game.title }}
        rows={rows}
      />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
