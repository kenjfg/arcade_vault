import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { getGame } from "@/lib/games-db";

export default async function GamePlayerPage(
  props: PageProps<"/juegos/[id]/jugar">,
) {
  // The [id] segment carries the game's code (e.g. "asteroids"), not its numeric id.
  const { id } = await props.params;
  const found = await getGame(id);
  if (!found) notFound();

  return <GamePlayer game={found.game} />;
}
