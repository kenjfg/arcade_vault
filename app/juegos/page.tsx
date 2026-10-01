import { GameLibrary } from "@/components/game-library";
import { getCategories, getGames } from "@/lib/games-db";

export default async function BibliotecaPage() {
  const [{ games }, categories] = await Promise.all([
    getGames(),
    getCategories(),
  ]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GameLibrary games={games} categories={categories} />
    </div>
  );
}
